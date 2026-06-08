import db, { generateUUID } from './db';
import { sendMessage, isNumberRegistered, getSessionStatus } from './whatsappManager';
import { checkEmergencyStatus } from './safetyManager';
import { prepareMessage } from './campaignHelper';
import { NotificationManager } from './notificationManager';
import { SmsManager } from './smsManager';

let workerRunning = false;
const batchTracker: Map<string, { count: number; lastPause: number }> = new Map();

async function processQueue(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;

  try {
    try {
      await checkEmergencyStatus();
    } catch (err: any) {
      console.log(`[Queue] ⚠️ ${err.message}`);
      return;
    }

    // Fetch messages that are due and still pending, joined with campaign settings and user profile
    const [jobs] = await db.query(`
      SELECT q.*, c.device_mode, c.spintax, c.verify_numbers, c.replied_only, c.window_24h, 
             c.uniqueness, c.batch_pause_msgs, c.batch_pause_wait, c.fail_limit,
             c.start_time, c.end_time,
             p.plan, p.plan_expires_at
      FROM message_queue q
      JOIN campaigns c ON q.campaign_id = c.id
      JOIN profiles p ON q.user_id = p.id
      WHERE q.status = 'pending' AND q.scheduled_at <= NOW()
      ORDER BY q.scheduled_at ASC
      LIMIT 10
    `) as any[];

    if (!jobs || jobs.length === 0) return;

    console.log(`[Queue] Processing ${jobs.length} message(s)...`);

    const processedCampaignIds = new Set<string>();

    for (const job of jobs) {
      const campaignId = job.campaign_id;
      const userId = job.user_id;
      processedCampaignIds.add(campaignId);

      // Check Plan Expiration / Validity
      const plan = job.plan ? job.plan.toLowerCase() : '';
      const isUnlimited = plan === 'admin' || !job.plan_expires_at;
      if (!isUnlimited) {
        const expiry = new Date(job.plan_expires_at);
        if (expiry.getTime() < Date.now()) {
          console.log(`[Queue] ⚠️ Skipping job ${job.id}: User account is expired.`);
          await db.query('UPDATE message_queue SET status = ?, error_message = ? WHERE id = ?', ['failed', 'Subscription expired. Please renew your plan.', job.id]);
          await db.query('UPDATE campaigns SET total_failed = total_failed + 1 WHERE id = ?', [campaignId]);
          continue;
        }
      }
      
      let deviceType = 'unknown';
      let sessionName = 'default';

      // 1. Try WhatsApp
      try {
        const [wsRows]: any = await db.query('SELECT session_name FROM whatsapp_sessions WHERE id = ?', [job.session_id]);
        if (wsRows && wsRows.length > 0) {
          sessionName = wsRows[0].session_name;
          deviceType = 'whatsapp';
        }
      } catch (err: any) {
        console.warn(`[Queue] Failed to query whatsapp_sessions for job ${job.id}:`, err.message);
      }

      // 2. Try Android Device
      if (deviceType === 'unknown') {
        try {
          const [adRows]: any = await db.query('SELECT device_name FROM android_devices WHERE id = ?', [job.session_id]);
          if (adRows && adRows.length > 0) {
            sessionName = adRows[0].device_name;
            deviceType = 'android';
          }
        } catch (err: any) {}
      }

      // 3. Try SMS Gateway
      if (deviceType === 'unknown') {
        try {
          const [sgRows]: any = await db.query('SELECT name FROM sms_gateways WHERE id = ?', [job.session_id]);
          if (sgRows && sgRows.length > 0) {
            sessionName = sgRows[0].name;
            deviceType = 'sms_gateway';
          }
        } catch (err: any) {}
      }

      // 1. Check Campaign Time Window (start_time / end_time)
      if (job.start_time || job.end_time) {
        const now = new Date();
        const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        
        if (job.start_time) {
          const [h, m, s] = job.start_time.split(':').map(Number);
          const startSec = h * 3600 + m * 60 + (s || 0);
          if (currentTime < startSec) continue; // Skip for now
        }
        
        if (job.end_time) {
          const [h, m, s] = job.end_time.split(':').map(Number);
          const endSec = h * 3600 + m * 60 + (s || 0);
          if (currentTime > endSec) continue; // Skip for now
        }
      }

      // 2. Batch Pause Logic
      if (job.batch_pause_msgs > 0) {
        let tracker = batchTracker.get(campaignId);
        if (!tracker) {
          tracker = { count: 0, lastPause: 0 };
          batchTracker.set(campaignId, tracker);
        }

        if (tracker.count >= job.batch_pause_msgs) {
          const now = Date.now();
          const waitMs = job.batch_pause_wait * 1000;
          if (now - tracker.lastPause < waitMs) {
            console.log(`[Queue] Campaign ${campaignId} in batch pause wait...`);
            continue; // Skip this campaign's messages for this polling cycle
          } else {
            // Wait over, reset tracker
            tracker.count = 0;
          }
        }
      }

      // 0. Check if Session is still connected (Only for WhatsApp)
      if (deviceType === 'whatsapp') {
        const sessionStatus = await getSessionStatus(userId, sessionName);
        if (sessionStatus !== 'connected') {
          console.log(`[Queue] ⚠️ Skipping job ${job.id}: Session ${sessionName} is ${sessionStatus}`);
          await db.query('UPDATE message_queue SET status = ?, error_message = ? WHERE id = ?', ['failed', `WhatsApp session ${sessionName} is not connected`, job.id]);
          continue;
        }
      } else if (deviceType === 'unknown') {
         console.log(`[Queue] ⚠️ Skipping job ${job.id}: Device not found`);
         await db.query('UPDATE message_queue SET status = ?, error_message = ? WHERE id = ?', ['failed', `Device not found`, job.id]);
         continue;
      }

      // Mark as 'processing'
      await db.query('UPDATE message_queue SET status = ? WHERE id = ?', ['processing', job.id]);

      try {
        // 3. Verify Number Registration
        if (job.verify_numbers) {
          const isRegistered = await isNumberRegistered(userId, sessionName, job.phone);
          if (!isRegistered) {
            throw new Error('Number not registered on WhatsApp');
          }
        }

        // 4. Replied Only / 24h Window
        if (job.replied_only || job.window_24h) {
          const [chats] = await db.query(
            'SELECT last_message_at FROM whatsapp_chats WHERE user_id = ? AND session_name = ? AND wid LIKE ?',
            [userId, sessionName, `%${job.phone.replace(/[^0-9]/g, '')}%`]
          ) as any[];
          
          const chat = (chats as any[])[0];
          if (!chat && job.replied_only) {
            throw new Error('No existing chat found (Replied Only mode)');
          }
          
          if (job.window_24h && chat) {
            const lastMsgAt = new Date(chat.last_message_at).getTime();
            const window = 24 * 60 * 60 * 1000;
            if (Date.now() - lastMsgAt > window) {
              throw new Error('Outside 24h window (Active Convo Only mode)');
            }
          }
        }

        // Send Message
        let msgId;
        if (deviceType === 'android') {
          msgId = generateUUID();
          const smsManager = new SmsManager('Android App', { deviceId: job.session_id }, userId);
          await smsManager.sendSms(job.phone, job.message);
        } else if (deviceType === 'sms_gateway') {
          msgId = generateUUID();
          const smsManager = await SmsManager.getByGatewayId(job.session_id);
          await smsManager.sendSms(job.phone, job.message);
        } else {
          msgId = await sendMessage(userId, sessionName, job.phone, job.message, job.media_url || undefined, job.media_type || undefined);
        }

        // Success
        await db.query('UPDATE message_queue SET status = ?, processed_at = NOW() WHERE id = ?', ['sent', job.id]);
        
        await db.query(`
          INSERT INTO message_logs (
            id, user_id, campaign_id, contact_id, phone, message, message_id, session_name, status, source, ack, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [generateUUID(), userId, campaignId, job.contact_id, job.phone, job.message, msgId, sessionName, 'sent', 'campaign', 1]);

        // Increment campaign total_sent
        await db.query('UPDATE campaigns SET total_sent = total_sent + 1 WHERE id = ?', [campaignId]);

        // Increment batch tracker
        if (job.batch_pause_msgs > 0) {
          const tracker = batchTracker.get(campaignId)!;
          tracker.count++;
          if (tracker.count >= job.batch_pause_msgs) {
            tracker.lastPause = Date.now();
            console.log(`[Queue] Campaign ${campaignId} reached batch limit. Pausing for ${job.batch_pause_wait}s.`);
          }
        }

        console.log(`[Queue] ✅ Sent to ${job.phone}`);
      } catch (err: any) {
        // Failure
        await db.query('UPDATE message_queue SET status = ?, error_message = ? WHERE id = ?', ['failed', err.message, job.id]);
        
        await db.query(`
          INSERT INTO message_logs (
            id, user_id, campaign_id, contact_id, phone, message, status, source, error_message, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [generateUUID(), userId, campaignId, job.contact_id, job.phone, job.message, 'failed', 'campaign', err.message]);

        // Increment campaign total_failed
        const [campRows] = await db.query('SELECT total_failed, status, fail_limit FROM campaigns WHERE id = ?', [campaignId]) as any[];
        const camp = campRows[0];
        if (camp) {
          const newTotalFailed = (camp.total_failed || 0) + 1;
          await db.query('UPDATE campaigns SET total_failed = ? WHERE id = ?', [newTotalFailed, campaignId]);
          
          // Auto-pause if fail limit reached (default 15 if not specified, or use camp.fail_limit)
          const limit = camp.fail_limit || 15;
          if (newTotalFailed >= limit && camp.status === 'running') {
            console.log(`[Queue] 🚨 Auto-pausing campaign ${campaignId} due to excessive failures (${newTotalFailed}/${limit})`);
            await db.query('UPDATE campaigns SET status = ? WHERE id = ?', ['paused', campaignId]);
            await db.query('UPDATE message_queue SET status = ?, error_message = ? WHERE campaign_id = ? AND status = ?', ['failed', 'Campaign auto-paused due to failures', campaignId, 'pending']);
            
            // Notify user about auto-pause
            await NotificationManager.notifyCampaignPaused(userId, camp.name || campaignId, `Reached failure limit (${newTotalFailed}/${limit})`);
          }
        }

        console.log(`[Queue] ❌ Failed to ${job.phone}: ${err.message}`);
      }
    }

    // Check for completed campaigns in this batch
    for (const campaignId of processedCampaignIds) {
        try {
            const [pendingCount]: any = await db.query('SELECT COUNT(*) as count FROM message_queue WHERE campaign_id = ? AND status = ?', [campaignId, 'pending']);
            if (pendingCount[0].count === 0) {
                // Potential completion. Check current status to avoid double-notifying.
                const [camp]: any = await db.query('SELECT id, user_id, name, total_sent, total_failed, status FROM campaigns WHERE id = ?', [campaignId]);
                if (camp[0] && camp[0].status === 'running') {
                    await db.query('UPDATE campaigns SET status = ? WHERE id = ?', ['completed', campaignId]);
                    await NotificationManager.notifyCampaignCompleted(camp[0].user_id, camp[0].name, camp[0].total_sent, camp[0].total_failed);
                    console.log(`[Queue] Campaign "${camp[0].name}" marked as completed.`);
                }
            }
        } catch (compErr) {
            console.error('[Queue] Completion check failed:', compErr);
        }
    }
    
    await handleRecurringCampaigns();
  } catch (err) {
    console.error('[Queue] Process error:', err);
  } finally {
    workerRunning = false;
  }
}

async function handleRecurringCampaigns() {
  const [recurring] = await db.query('SELECT * FROM campaigns WHERE is_recurring = TRUE AND status != ?', ['paused']) as any[];
  if (!recurring || recurring.length === 0) return;

  const now = new Date();

  for (const camp of recurring) {
    const nextRun = camp.next_run_at ? new Date(camp.next_run_at) : null;
    let targetRun = nextRun;

    if (!targetRun) {
      targetRun = calculateNextRun(new Date(camp.started_at || camp.created_at), camp.recurrence_type, camp.recurrence_day);
      await db.query('UPDATE campaigns SET next_run_at = ? WHERE id = ?', [targetRun, camp.id]);
      continue;
    }

    if (now >= targetRun) {
      console.log(`[Queue] 🔁 Re-launching recurring campaign: ${camp.name}`);
      
      await db.query(`
        UPDATE campaigns SET 
          status = 'running', 
          total_sent = 0, 
          total_failed = 0, 
          next_run_at = ?, 
          started_at = NOW() 
        WHERE id = ?
      `, [calculateNextRun(targetRun, camp.recurrence_type, camp.recurrence_day), camp.id]);

      await reQueueCampaign(camp);
    }
  }
}

function calculateNextRun(baseDate: Date, type: string, day: number): Date {
  const d = new Date(baseDate);
  if (type === 'daily') d.setDate(d.getDate() + 1);
  else if (type === 'weekly') d.setDate(d.getDate() + 7);
  else if (type === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

async function reQueueCampaign(camp: any) {
  let content = '';
  let mediaUrl = camp.media_url || null;
  let mediaType = camp.media_type || null;

  if (camp.template_id && camp.template_id.length > 30) {
    const [templates] = await db.query('SELECT * FROM templates WHERE id = ?', [camp.template_id]) as any[];
    const template = templates[0];
    if (template) {
      content = template.content;
      mediaUrl = template.media_url || mediaUrl;
      mediaType = template.media_type || mediaType;
    } else {
      content = camp.template_id;
    }
  } else {
    content = camp.template_id;
  }

  const [contacts] = await db.query('SELECT * FROM contacts WHERE user_id = ? AND group_id = ?', [camp.user_id, camp.group_id]) as any[];
  
  if (!contacts || contacts.length === 0 || !content) return;

  // Clear pending items for this campaign
  await db.query('DELETE FROM message_queue WHERE campaign_id = ? AND status = ?', [camp.id, 'pending']);

  // Spintax and Uniqueness Helpers (Now using centralized Helper)
  const now = Date.now();
  let delayMs = 0;
  const limit = camp.daily_limit || 200;
  for (let i = 0; i < Math.min(contacts.length, limit); i++) {
    const contact = contacts[i];
    const jitter = Math.floor(Math.random() * (camp.random_delay_max - camp.random_delay_min + 1)) + camp.random_delay_min;
    delayMs += (camp.interval_seconds + jitter) * 1000;
    
    const msg = prepareMessage(content, contact, { 
      spintax: camp.spintax, 
      uniqueness: camp.uniqueness 
    });

    await db.query(`
      INSERT INTO message_queue (
        id, user_id, campaign_id, contact_id, session_id, phone, message, media_url, media_type, status, scheduled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generateUUID(), camp.user_id, camp.id, contact.id, camp.session_id, contact.phone, msg,
      mediaUrl, mediaType, 'pending', new Date(now + delayMs)
    ]);
  }
}

export function startQueueWorker(intervalMs: number = 5000): void {
  console.log(`[Queue] Worker started — polling every ${intervalMs / 1000}s`);
  setInterval(processQueue, intervalMs);
}
