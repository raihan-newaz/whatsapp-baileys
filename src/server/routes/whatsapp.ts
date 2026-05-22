import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
import { 
  createWhatsAppSession, 
  disconnectSession, 
  logoutSession,
  getSessionStatus, 
  getJoinedGroups, 
  extractGroupMembers, 
  sendMessage, 
  getMessageStatus, 
  refreshProfilePic
} from '../lib/whatsappManager';
import { 
  getPlanLimits, 
  checkEmergencyStatus, 
  checkWordFilter, 
  checkSpamRepetition, 
  getSystemSetting 
} from '../lib/safetyManager';

const router = Router();

// POST /api/whatsapp/connect — creates or restarts a session
router.post('/connect', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default' } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    // Check user plan and dynamic limits
    const [profileRows] = await db.query('SELECT plan, role FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const plan = profile?.plan || 'free';
    const role = profile?.role || 'user';
    const limits = await getPlanLimits(plan, role);
    const maxAccounts = limits.accounts;

    const [sessionRows] = await db.query('SELECT session_name FROM whatsapp_sessions WHERE user_id = ?', [userId]);
    const existingNames = (sessionRows as any[]).map((s: any) => s.session_name);

    const isUnlimited = maxAccounts === 0;

    if (!isUnlimited && !existingNames.includes(sessionName) && existingNames.length >= maxAccounts) {
      return res.status(403).json({ error: `Plan limit reached. Your ${plan.toUpperCase()} plan allows a maximum of ${maxAccounts} WhatsApp account(s)` });
    }

    // Upsert session record in DB
    const [existingSession] = await db.query('SELECT id FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?', [userId, sessionName]);
    let sessionId = (existingSession as any[])[0]?.id;

    if (!sessionId) {
      sessionId = generateUUID();
      await db.query(
        'INSERT INTO whatsapp_sessions (id, user_id, session_name, status) VALUES (?, ?, ?, ?)',
        [sessionId, userId, sessionName, 'pending']
      );
    } else {
      await db.query('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', ['pending', sessionId]);
    }

    // Initialize the WhatsApp client (will emit QR via socket)
    await createWhatsAppSession(userId, sessionId, sessionName);
    res.json({ success: true, sessionId, message: 'Session initializing, listen for QR via socket.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/disconnect
router.post('/disconnect', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default' } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    await disconnectSession(userId, sessionName);
    await db.query(
      'UPDATE whatsapp_sessions SET status = ? WHERE user_id = ? AND session_name = ?',
      ['disconnected', userId, sessionName]
    );
    res.json({ success: true, message: 'Session stopped. Information preserved for reconnection.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/logout
router.post('/logout', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default' } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    await logoutSession(userId, sessionName);
    await db.query(
      'UPDATE whatsapp_sessions SET status = ?, device_info = NULL, phone_number = NULL WHERE user_id = ? AND session_name = ?',
      ['disconnected', userId, sessionName]
    );
    res.json({ success: true, message: 'Logged out successfully. Session data cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/status/:userId
router.get('/status/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const rawSession = req.query.sessionName;
  const sessionName: string = rawSession ? String(rawSession) : 'default';

  const status = await getSessionStatus(String(userId), sessionName);
  const [rows] = await db.query(
    'SELECT * FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?',
    [userId, sessionName]
  );
  const session = (rows as any[])[0];

  res.json({ status, session });
});

// GET /api/whatsapp/sessions/:userId — List all sessions for a user
router.get('/sessions/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM whatsapp_sessions WHERE user_id = ?', [userId]);
    const sessions = rows as any[];
    
    // Sync live status for each session
    const syncedSessions = await Promise.all(sessions.map(async (s) => {
      const liveStatus = await getSessionStatus(userId as string, s.session_name);
      
      // If live status is different from DB status, update DB
      if (liveStatus !== s.status) {
        await db.query('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', [liveStatus, s.id]);
        s.status = liveStatus;
      }

      if (s.device_info && typeof s.device_info === 'string') {
        try { s.device_info = JSON.parse(s.device_info); } catch (e) {}
      }
      return s;
    }));

    res.json(syncedSessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/send — direct send (for testing / single messages)
router.post('/send', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default', phone, message, mediaUrl, mediaType } = req.body;
  if (!userId || !phone || (!message && !mediaUrl)) return res.status(400).json({ error: 'Missing fields' });

  try {
    await checkEmergencyStatus();
    await checkWordFilter(message);
    await checkSpamRepetition(userId, message);

    // Check dynamic daily limits
    const [profileRows] = await db.query('SELECT plan, role FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const plan = profile?.plan || 'free';
    const role = profile?.role || 'user';
    const limits = await getPlanLimits(plan, role);
    const dailyLimit = limits.daily_msgs;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [logsRows] = await db.query(
      'SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?',
      [userId, 'sent', today]
    );
    const count = (logsRows as any)[0].count || 0;

    const isUnlimited = dailyLimit === 0;
    if (!isUnlimited && count >= dailyLimit) {
      return res.status(403).json({ error: `Daily message limit reached. Upgrade to send more than ${dailyLimit} messages per day.` });
    }

    const msgId = await sendMessage(userId, sessionName, phone, message, mediaUrl, mediaType);
    
    // Log the message
    await db.query(`
      INSERT INTO message_logs (
        id, user_id, phone, message, message_id, session_name, media_url, media_type, status, source, ack, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      generateUUID(), userId, phone, message || '', msgId, sessionName, mediaUrl || null, mediaType || null, 'sent', 'direct', 1, new Date()
    ]);

    // Update contact activity if exists (Simulate RPC increment_contact_stats)
    await db.query(
      'UPDATE contacts SET messages_sent = messages_sent + 1, last_active_at = ? WHERE user_id = ? AND phone = ?',
      [new Date(), userId, phone.replace(/[^0-9]/g, '')]
    );

    res.json({ success: true });
  } catch (err: any) {
    try {
      await db.query(`
        INSERT INTO message_logs (id, user_id, phone, message, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [generateUUID(), userId, phone, message || '', 'failed', err.message]);
    } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/session — deletes the session record permanently
router.delete('/session', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default' } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    // 1. Get the session ID first to ensure we target correctly
    const [rows] = await db.query('SELECT id FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?', [userId, sessionName]);
    const session = (rows as any[])[0];
    
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const sessionId = session.id;

    // 2. Log out and End session session if active
    await logoutSession(userId, sessionName).catch(() => {});

    // 3. Cleanup dependent records (Foreign Key conflict mitigation)
    // Clear references in webhooks
    await db.query('UPDATE webhooks SET session_id = NULL WHERE session_id = ?', [sessionId]);
    
    // Clear references in campaigns
    await db.query('UPDATE campaigns SET session_id = NULL WHERE session_id = ?', [sessionId]);
    
    // Remote pending queue items for this session
    await db.query('DELETE FROM message_queue WHERE session_id = ? AND status = ?', [sessionId, 'pending']);

    // 4. Finally delete the session record
    await db.query('DELETE FROM whatsapp_sessions WHERE id = ?', [sessionId]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/groups — list available WhatsApp groups via connected session
router.get('/groups', async (req: Request, res: Response) => {
  const { userId, sessionName: rawSession } = req.query;
  const sessionName = rawSession ? String(rawSession) : 'default';
  
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const groups = await getJoinedGroups(String(userId), sessionName);
    res.json({ success: true, groups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/groups/:groupId/extract — Extract members from a specific group
router.post('/groups/:groupId/extract', async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { userId, sessionName: rawSession } = req.body;
  const sessionName = rawSession ? String(rawSession) : 'default';
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    // 1. Enforce limits per plan
    const [profileRows] = await db.query('SELECT plan, role FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const plan = profile?.plan || 'free';
    const role = profile?.role || 'user';
    
    const limits = await getPlanLimits(plan, role);
    const maxDaily = limits.group_extractions === 0 ? 0 : (limits.group_extractions || 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [logsRows] = await db.query(
      'SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?',
      [userId, 'extracted', today]
    );
    const count = (logsRows as any)[0].count || 0;

    const isUnlimited = maxDaily === 0;
    if (!isUnlimited && count >= maxDaily) {
      return res.status(403).json({ error: `Daily extraction limit reached. Your ${plan.toUpperCase()} plan allows extracting ${maxDaily} group(s) per day.` });
    }

    // 2. Extract
    const data = await extractGroupMembers(String(userId), String(sessionName), String(groupId));

    // 3. Log the extraction event
    await db.query(`
      INSERT INTO message_logs (id, user_id, phone, message, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [generateUUID(), userId, 'Extraction', `Extracted ${data.members.length} members from ${data.groupName}`, 'extracted', new Date()]);

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/groups/send — Send message to multiple groups
router.post('/groups/send', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default', groupIds, message, mediaUrl, mediaType } = req.body;
  if (!userId || !Array.isArray(groupIds) || !message) return res.status(400).json({ error: 'Missing userId, groupIds array, or message' });

  try {
    await checkEmergencyStatus();
    await checkWordFilter(message);
    await checkSpamRepetition(userId, message);

    const [profileRows] = await db.query('SELECT plan, role FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const plan = profile?.plan || 'free';
    const role = profile?.role || 'user';
    const limits = await getPlanLimits(plan, role);
    const dailyLimit = limits.daily_msgs;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [logsRows] = await db.query(
      'SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?',
      [userId, 'sent', today]
    );
    const count = (logsRows as any)[0].count || 0;

    const isUnlimited = dailyLimit === 0;
    if (!isUnlimited && count + groupIds.length > dailyLimit) {
      return res.status(403).json({ error: `Daily message limit reached. Sending to ${groupIds.length} groups would exceed your ${dailyLimit} limit.` });
    }

    const results = [];

    for (const groupId of groupIds) {
      try {
        const msgId = await sendMessage(userId, sessionName, groupId, message, mediaUrl, mediaType);
        await db.query(`
          INSERT INTO message_logs (
            id, user_id, phone, message, message_id, session_name, media_url, media_type, status, source, ack, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [generateUUID(), userId, groupId, message, msgId, sessionName, mediaUrl || null, mediaType || null, 'sent', 'group', 1, new Date()]);
        results.push({ groupId, success: true });
      } catch (err: any) {
        results.push({ groupId, success: false, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync message status manually
router.post('/sync-status', async (req: Request, res: Response) => {
  const { userId, messages } = req.body; // messages: [{ id: string, session: string }]
  if (!userId || !messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid request' });

  try {
    const results = [];
    for (const item of messages) {
      const msgId = typeof item === 'string' ? item : item.id;
      const sName = typeof item === 'string' ? undefined : item.session;
      
      const ack = await getMessageStatus(userId, sName, msgId);
      if (ack !== null) {
        const ts = new Date();
        const status = ack === 2 ? 'delivered' : ack >= 3 ? 'read' : 'sent';
        await db.query(
          'UPDATE message_logs SET status = ?, ack = ?, delivered_at = IFNULL(?, delivered_at), read_at = IFNULL(?, read_at) WHERE message_id = ? AND IFNULL(ack, 0) < ?',
          [status, ack, ack >= 2 ? ts : null, ack >= 3 ? ts : null, msgId, ack]
        );
        results.push({ msgId, ack });
      }
    }
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update session settings
router.patch('/sessions/:id/settings', async (req, res) => {
  const { id } = req.params;
  const { userId, settings } = req.body;

  try {
    // 1. Verify ownership
    const [existing] = await db.query(
      'SELECT device_info FROM whatsapp_sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!(existing as any[]).length) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    // 2. Merge and Update
    const currentInfo = JSON.parse((existing as any[])[0].device_info || '{}');
    const updatedInfo = { ...currentInfo, ...settings };

    await db.query(
      'UPDATE whatsapp_sessions SET device_info = ? WHERE id = ?',
      [JSON.stringify(updatedInfo), id]
    );

    res.json({ success: true, device_info: updatedInfo });
  } catch (err: any) {
    console.error('[WhatsApp] Settings update failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/sessions/:id/refresh-profile
router.post('/sessions/:id/refresh-profile', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, sessionName } = req.body;

  if (!userId || !sessionName) {
    return res.status(400).json({ error: 'userId and sessionName are required' });
  }

  try {
    const data = await refreshProfilePic(userId, sessionName);
    res.json({ success: true, ...data });
  } catch (err: any) {
    console.error('[WhatsApp] Profile refresh failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/ai-settings
router.post('/ai-settings', async (req: Request, res: Response) => {
  const { userId, instance_id, ai_enabled, ai_provider, ai_api_key, ai_prompt, ai_model, ai_reply_delay } = req.body;
  
  if (!userId || !instance_id) {
    return res.status(400).json({ error: 'userId and instance_id are required' });
  }

  try {
    await db.query(
      `UPDATE whatsapp_sessions 
       SET ai_enabled = ?, ai_provider = ?, ai_api_key = ?, ai_prompt = ?, ai_model = ?, ai_reply_delay = ? 
       WHERE id = ? AND user_id = ?`,
      [
        ai_enabled ? 1 : 0,
        ai_provider || 'google',
        ai_api_key || null,
        ai_prompt || null,
        ai_model || 'gemini-1.5-flash',
        ai_reply_delay || 0,
        instance_id,
        userId
      ]
    );

    res.json({ success: true, message: 'AI settings updated successfully' });
  } catch (err: any) {
    console.error('[WhatsApp] AI settings update failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
