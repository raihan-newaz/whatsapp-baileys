import db from './db';
import { generateAIResponse } from './openAiClient';
import { generateGeminiResponse } from './geminiClient';

/**
 * Wait for a specified number of seconds
 */
const wait = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

export async function processAutoReply(
  userId: string, 
  sessionName: string, 
  msg: any,
  sendFn: (u: string, s: string, p: string, m: string, mu?: string, mt?: string) => Promise<string>
): Promise<boolean> {
  // 1. Basic checks
  const isFromMe = msg.fromMe === true;
  if (isFromMe) {
    console.log(`[AutoReply] Skipping message because it's from me.`);
    return false;
  }
  
  const body = (msg.body || '').trim();
  console.log(`[AutoReply] Starting check for ${msg.from}. Body: "${body}"`);

  try {
    // 2. Fetch active rules for this user
    const [rules]: any = await db.query(
      `SELECT * FROM auto_reply_rules 
       WHERE user_id = ? 
       AND is_active = 1 
       ORDER BY priority DESC, created_at DESC`,
      [userId]
    );

    console.log(`[AutoReply] Found ${rules.length} active rules for user ${userId}. Query: SELECT * FROM auto_reply_rules WHERE user_id = "${userId}" AND is_active = 1`);

    if (rules.length === 0) {
      console.log(`[AutoReply] No active rules found. Returning false.`);
      return false;
    }

    // Fetch current session ID for filter
    const [sessions]: any = await db.query(
      'SELECT id FROM whatsapp_sessions WHERE user_id = ? AND session_name = ? LIMIT 1',
      [userId, sessionName]
    );
    const currentSessionId = sessions[0]?.id;

    for (const rule of rules) {
      if (rule.session_id && rule.session_id !== currentSessionId) {
        // Check if this ghost session still exists
        const [ghostExists]: any = await db.query('SELECT 1 FROM whatsapp_sessions WHERE id = ?', [rule.session_id]);
        if (ghostExists.length > 0) {
          console.log(`[AutoReply] Skipping rule "${rule.name}" because it's for another ACTIVE session (${rule.session_id} vs ${currentSessionId})`);
          continue;
        } else {
          console.log(`[AutoReply] Rule "${rule.name}" has an orphaned session_id (${rule.session_id}). Allowing as fallback.`);
        }
      }

      let matched = false;
      const triggerVal = (rule.trigger_value || '').trim();
      
      // Handle wildcard for AI rules
      if ((rule.use_openai || rule.use_gemini) && triggerVal === '*') {
        matched = true;
      } else {
        const checkBody = rule.case_sensitive ? body : body.toLowerCase();
        const triggers = triggerVal.split(',').map(t => t.trim()).filter(t => t !== '');
        
        for (const t of triggers) {
          const checkTrigger = rule.case_sensitive ? t : t.toLowerCase();
          
          if (rule.trigger_type === 'exact' || rule.trigger_type === 'exact_match') {
            if (checkBody === checkTrigger) {
              matched = true;
              break;
            }
          } else if (rule.trigger_type === 'contains') {
            try {
              // Escaping special characters in trigger for regex
              const escapedTrigger = checkTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              // Use word boundaries \b to ensure whole word match
              const regex = new RegExp(`\\b${escapedTrigger}\\b`, rule.case_sensitive ? '' : 'i');
              if (regex.test(body)) {
                matched = true;
                break;
              }
            } catch (e) {
              console.error(`[AutoReply] Invalid contains pattern in rule "${rule.name}":`, checkTrigger);
              // Fallback to simple includes if regex fails for some reason
              if (checkBody.includes(checkTrigger)) {
                matched = true;
                break;
              }
            }
          } else if (rule.trigger_type === 'starts_with') {
            if (checkBody.startsWith(checkTrigger)) {
              matched = true;
              break;
            }
          } else if (rule.trigger_type === 'ends_with') {
            if (checkBody.endsWith(checkTrigger)) {
              matched = true;
              break;
            }
          } else if (rule.trigger_type === 'regex') {
            try {
              const regex = new RegExp(t, rule.case_sensitive ? '' : 'i');
              if (regex.test(body)) {
                matched = true;
                break;
              }
            } catch (e) {
              console.error(`[AutoReply] Invalid regex in rule "${rule.name}":`, t);
            }
          }
        }
      }

      if (matched) {
        console.log(`[AutoReply] Rule "${rule.name}" fully matched!`);
        
        let replyText = rule.reply_text;
        let mediaUrl = rule.media_url;
        let mediaType = rule.media_type;

        // 3. Handle Template Reply
        if (rule.reply_type === 'template' && rule.template_id) {
          const [templates]: any = await db.query('SELECT content, media_url, media_type FROM templates WHERE id = ?', [rule.template_id]);
          if (templates.length > 0) {
            replyText = templates[0].content;
            mediaUrl = templates[0].media_url;
            mediaType = templates[0].media_type;
          }
        }

        // 4. Handle Gemini Reply (Prioritize Gemini if both on? Usually user picks one)
        if (rule.use_gemini) {
          console.log(`[AutoReply] Generating Gemini response...`);
          const aiResponse = await generateGeminiResponse({
            apiKey: rule.gemini_api_key,
            model: rule.gemini_model,
            systemPrompt: rule.gemini_system_prompt,
            userMessage: body
          });
          
          if (aiResponse) {
            replyText = aiResponse;
          } else if (rule.use_openai) {
            // Fallback to OpenAI if Gemini fails? Or skip to OpenAI logic below
            console.log(`[AutoReply] Gemini failed, checking OpenAI...`);
          } else if (!replyText) {
            continue; 
          }
        }

        // 5. Handle OpenAI Reply
        if (rule.use_openai && (!rule.use_gemini || !replyText)) {
          console.log(`[AutoReply] Generating OpenAI response...`);
          const aiResponse = await generateAIResponse({
            apiKey: rule.openai_api_key,
            model: rule.openai_model,
            baseUrl: rule.openai_base_url,
            systemPrompt: rule.openai_system_prompt,
            temperature: rule.openai_temperature,
            maxTokens: rule.openai_max_tokens,
            userMessage: body
          });
          
          if (aiResponse) {
            replyText = aiResponse;
          } else if (!replyText) {
            continue; 
          }
        }

        // 6. Send the reply with optional delay
        if (replyText || mediaUrl) {
          try {
            if (rule.reply_delay && rule.reply_delay > 0) {
              console.log(`[AutoReply] Delayed response: Waiting ${rule.reply_delay} seconds...`);
              await wait(rule.reply_delay);
            }
            
            console.log(`[AutoReply] Sending reply to ${msg.from}...`);
            await sendFn(userId, sessionName, msg.from, replyText || '', mediaUrl || undefined, mediaType || undefined);
            console.log(`[AutoReply] SUCCESS: Auto-reply sent.`);
          } catch (sendErr: any) {
            console.error(`[AutoReply] ERROR sending response:`, sendErr.message);
          }
          
          return true;
        }
      }
    }
  } catch (err: any) {
    console.error('[AutoReply] worker loop error:', err.message);
  }
  return false;
}
