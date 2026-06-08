import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
import { getPlanLimits, checkEmergencyStatus, checkWordFilter, calculateWarmupLimit, getSystemSetting } from '../lib/safetyManager';
import { prepareMessage } from '../lib/campaignHelper';

const router = Router();

// GET /api/campaigns/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT 
        c.*, 
        t.name as template_name, 
        g.name as group_name,
        (SELECT COUNT(*) FROM message_queue mq WHERE mq.campaign_id = c.id) + c.total_sent + c.total_failed as target_count
      FROM campaigns c 
      LEFT JOIN templates t ON c.template_id = t.id 
      LEFT JOIN contact_groups g ON c.group_id = g.id 
      WHERE c.user_id = ? 
      ORDER BY c.created_at DESC
    `, [userId]);
    
    // Map to match frontend expectations
    const campaigns = (rows as any[]).map(row => ({
      ...row,
      target_count: row.target_count || 0,
      templates: { name: row.template_name || 'Custom Content' },
      contact_groups: { name: row.group_name || 'Contacts' }
    }));
    
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns — create campaign and enqueue messages into DB
router.post('/', async (req: Request, res: Response) => {
  const {
    userId, sessionId, sessionName = 'default', name,
    template_id, group_id,
    interval_seconds = 40,
    random_delay_min = 10,
    random_delay_max = 30,
    daily_limit = 200,
    scheduled_at,
    is_recurring = false,
    recurrence_type = 'daily',
    recurrence_day = 0,
    // Anti-block
    device_mode = 'single',
    spintax = true,
    verify_numbers = true,
    replied_only = false,
    window_24h = false,
    uniqueness = 'smart',
    batch_pause_msgs = 30,
    batch_pause_wait = 300,
    fail_limit = 5,
    start_time,
    end_time,
    round_robin_sessions = [],
    media_url,
    media_type
  } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    await checkEmergencyStatus();
    
    // Enforce Admin Campaign Defaults
    const defaults = await getSystemSetting('campaign_defaults', { min_interval: 20, min_delay: 20, max_delay: 60 });
    const safe_interval = Math.max(interval_seconds, defaults.min_interval);
    const safe_min = Math.max(random_delay_min, defaults.min_delay);
    const safe_max = Math.max(random_delay_max, defaults.max_delay);

    // Check user plan and basic dynamic limits
    const [profileRows] = await db.query('SELECT plan, role, plan_expires_at FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const plan = profile?.plan || 'free';
    const role = profile?.role || 'user';

    // Check Plan Expiration
    const isPlanUnlimited = plan.toLowerCase() === 'admin' || !profile?.plan_expires_at;
    if (!isPlanUnlimited) {
      const expiry = new Date(profile.plan_expires_at);
      if (expiry.getTime() < Date.now()) {
        return res.status(402).json({ error: 'Your subscription has expired. Please renew your plan.' });
      }
    }

    const limits = await getPlanLimits(plan, role);
    let maxDailyLimit = limits.daily_msgs;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [logsRows] = await db.query(
      'SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?',
      [userId, 'sent', today]
    );
    const sentToday = (logsRows as any)[0].count || 0;

    const isUnlimited = maxDailyLimit === 0;
    const remainingQuota = isUnlimited ? 999999 : Math.max(0, maxDailyLimit - sentToday);
    
    if (!isUnlimited && remainingQuota <= 0) {
      return res.status(403).json({ error: `Daily message limit reached. Upgrade to send more than ${maxDailyLimit} messages per day.` });
    }

    // Cap the daily_limit requested by the user to the actual remaining quota
    const effectiveDailyLimit = Math.min(daily_limit, remainingQuota);

    // Create campaign record
    const campaignId = generateUUID();
    await db.query(`
      INSERT INTO campaigns (
        id, user_id, session_id, name, template_id, group_id,
        interval_seconds, random_delay_min, random_delay_max, daily_limit,
        scheduled_at, is_recurring, recurrence_type, recurrence_day,
        status, started_at,
        device_mode, spintax, verify_numbers, replied_only, window_24h,
        uniqueness, batch_pause_msgs, batch_pause_wait, fail_limit,
        start_time, end_time, media_url, media_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaignId, userId, sessionId, name, template_id, group_id,
      safe_interval, safe_min, safe_max, daily_limit,
      scheduled_at, is_recurring, recurrence_type, recurrence_day,
      'running', new Date(),
      device_mode, spintax, verify_numbers, replied_only, window_24h,
      uniqueness, batch_pause_msgs, batch_pause_wait, fail_limit,
      start_time, end_time, media_url || null, media_type || null
    ]);

    const [campRows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    const campaign = (campRows as any[])[0];

    // support raw content (compose mode) or template
    let templateContent = '';
    let mediaUrl = null;
    let mediaType = null;

    if (template_id && template_id.length > 30) { // Assume UUID
      const [templateRows] = await db.query('SELECT content, media_url, media_type FROM templates WHERE id = ?', [template_id]);
      const template = (templateRows as any[])[0];
      if (template) {
        templateContent = template.content;
        mediaUrl = template.media_url;
        mediaType = template.media_type;
      } else {
        templateContent = template_id; // Treatment as raw content if not found
      }
    } else {
      templateContent = template_id;
    }

    const [contactRows] = await db.query('SELECT * FROM contacts WHERE user_id = ? AND group_id = ?', [userId, group_id]);
    const contacts = contactRows as any[];

    let sessionData: any = null;
    
    // 1. Try WhatsApp Session
    try {
      const [wsRows] = await db.query('SELECT created_at FROM whatsapp_sessions WHERE id = ?', [sessionId]);
      if (wsRows && (wsRows as any[])[0]) {
        sessionData = (wsRows as any[])[0];
      }
    } catch (e: any) {
      console.warn('[Campaigns] Failed to query whatsapp_sessions:', e.message);
    }

    // 2. Try Android Device (only if not found in WhatsApp)
    if (!sessionData) {
      try {
        const [adRows] = await db.query('SELECT created_at FROM android_devices WHERE id = ?', [sessionId]);
        if (adRows && (adRows as any[])[0]) {
          sessionData = (adRows as any[])[0];
        }
      } catch (e: any) {
        // Ignore table missing / query errors gracefully
      }
    }

    // 3. Try SMS Gateway (only if not found in WhatsApp or Android)
    if (!sessionData) {
      try {
        const [sgRows] = await db.query('SELECT created_at FROM sms_gateways WHERE id = ?', [sessionId]);
        if (sgRows && (sgRows as any[])[0]) {
          sessionData = (sgRows as any[])[0];
        }
      } catch (e: any) {
        // Ignore table missing / query errors gracefully
      }
    }
    
    if (!contacts) return res.status(400).json({ error: 'Contacts not found' });
    if (!sessionData) return res.status(400).json({ error: 'Device session not found' });
    if (!templateContent) return res.status(400).json({ error: 'Campaign content is missing' });

    // If in compose mode and media was provided in body, use it
    if (!mediaUrl && !mediaType && (req.body.media_url || req.body.media_type)) {
      mediaUrl = req.body.media_url;
      mediaType = req.body.media_type;
    }

    // 1. Check for bad words in template
    await checkWordFilter(templateContent);
    
    // 2. Adjust daily limit for Account Warmup Mode if it's a new account
    if (role !== 'admin' && plan !== 'enterprise') {
      maxDailyLimit = await calculateWarmupLimit(sessionData.created_at, maxDailyLimit);
    }

    // Recalculate effective daily limit based on warmup restrictions
    const remainingQuotaAfterWarmup = Math.max(0, maxDailyLimit - sentToday);
    if (remainingQuotaAfterWarmup <= 0) {
      return res.status(403).json({ error: `Daily limit reached for this account. Current limit is ${maxDailyLimit} messages based on your plan/warmup stage.` });
    }
    const finalEffectiveDailyLimit = Math.min(effectiveDailyLimit, remainingQuotaAfterWarmup);

    // Enqueue each message in message_queue table with scheduled_at timestamps
    const baseTime = scheduled_at ? new Date(scheduled_at).getTime() : Date.now();
    const now = Date.now();
    let delayMs = 0;
    
    // Spintax and Uniqueness Helpers
    const processSpintax = (text: string) => {
      return text.replace(/{([^{}]+)}/g, (match, options) => {
        const parts = options.split('|');
        return parts[Math.floor(Math.random() * parts.length)];
      });
    };

    const applyUniqueness = (text: string, mode: string) => {
      if (mode === 'none') return text;
      
      const emojis = ['✨', '🚀', '⭐', '📍', '✅', '💡', '🔥', '📈', '👋', '🙌'];
      const ghostChars = ['\u200B', '\u200C', '\u200D', '\u200E', '\u200F'];
      
      let result = text;
      
      if (mode === 'emoji' || mode === 'smart') {
        result += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
      }
      
      if (mode === 'invisible' || mode === 'smart') {
        const count = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < count; j++) {
          result += ghostChars[Math.floor(Math.random() * ghostChars.length)];
        }
      }
      
      return result;
    };

    const allSessionsInRotation = device_mode === 'round_robin' && round_robin_sessions?.length > 0 
      ? [sessionId, ...round_robin_sessions.filter((id: string) => id !== sessionId)]
      : [sessionId];

    for (let i = 0; i < Math.min(contacts.length, finalEffectiveDailyLimit); i++) {
      const contact = contacts[i];
      const jitter = Math.floor(Math.random() * (safe_max - safe_min + 1)) + safe_min;
      delayMs += (safe_interval + jitter) * 1000;
      
      const currentSessionId = allSessionsInRotation[i % allSessionsInRotation.length];
      
      // Use centralized Helper
      const msg = prepareMessage(templateContent, contact, { spintax, uniqueness });
      
      await db.query(`
        INSERT INTO message_queue (
          id, user_id, campaign_id, contact_id, session_id, phone, message, media_url, media_type, status, scheduled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        generateUUID(), userId, campaignId, contact.id, currentSessionId, contact.phone, msg, 
        mediaUrl || null, mediaType || null, 'pending', 
        new Date(Math.max(now, baseTime + delayMs))
      ]);
    }

    res.json({ success: true, campaign, enqueued: Math.min(contacts.length, finalEffectiveDailyLimit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/campaigns/:id/status — Toggle running/paused
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['running', 'paused'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    if (status === 'paused') {
      // Mark pending queue items as 'failed' (or we could introduce a 'paused' state in queue)
      await db.query(
        'UPDATE message_queue SET status = ?, error_message = ? WHERE campaign_id = ? AND status = ?',
        ['failed', 'Campaign paused', id, 'pending']
      );
    } else if (status === 'running') {
      // Logic to resume could be complex if we want to re-queue, 
      // but for now we just update the campaign status.
      // The user might need to 'Clone' to truly restart a failed/paused campaign.
    }

    await db.query('UPDATE campaigns SET status = ? WHERE id = ?', [status, id]);
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM message_queue WHERE campaign_id = ?', [id]);
    await db.query('DELETE FROM message_logs WHERE campaign_id = ?', [id]);
    await db.query('DELETE FROM campaigns WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/clone
router.post('/:id/clone', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    const original = (rows as any[])[0];
    if (!original) return res.status(404).json({ error: 'Original campaign not found' });

    res.json({ campaign: original });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
