import { Router, Request, Response } from 'express';
import db from '../lib/db';

const router = Router();

// GET /api/stats?userId=...
router.get('/', async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Profile
    let profile: any = null;
    try {
      const [profileRows] = await db.query('SELECT plan, plan_expires_at, number_checker_credits, api_requests_count FROM profiles WHERE id = ?', [userId]);
      profile = (profileRows as any[])[0] || null;
    } catch (e) {}

    if (!profile) {
      try {
        const crypto = require('crypto');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);
        const apiKey = `sk_live_${crypto.randomBytes(24).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
        await db.query('INSERT INTO profiles (id, role, plan, plan_expires_at, api_key) VALUES (?, ?, ?, ?, ?)', [userId, 'user', 'free_trial', expiresAt, apiKey]);
        profile = { plan: 'free_trial', plan_expires_at: expiresAt, number_checker_credits: 0, api_requests_count: 0 };
      } catch (e) {
        profile = { plan: 'free_trial', plan_expires_at: null, number_checker_credits: 0, api_requests_count: 0 };
      }
    }

    // 2. WhatsApp sessions
    let isWaConnected = false;
    let waCount = 0;
    try {
      const [waRows] = await db.query('SELECT status FROM whatsapp_sessions WHERE user_id = ?', [userId]);
      isWaConnected = (waRows as any[]).some((r: any) => r.status === 'connected');
      waCount = (waRows as any[]).length;
    } catch (e) {}

    // 3. Android devices
    let androidConnected = false;
    let androidCount = 0;
    try {
      const [androidRows] = await db.query('SELECT status FROM android_devices WHERE user_id = ?', [userId]);
      androidConnected = (androidRows as any[]).some((r: any) => r.status === 'active');
      androidCount = (androidRows as any[]).length;
    } catch (e) {}

    // 4. SMS gateways
    let apiCount = 0;
    try {
      const [apiRows] = await db.query('SELECT id FROM sms_gateways WHERE user_id = ?', [userId]);
      apiCount = (apiRows as any[]).length;
    } catch (e) {}

    // 5. Usage stats — each query independently safe
    let totalContacts = 0, totalCampaigns = 0, sentToday = 0, sentMonth = 0, failedToday = 0, queuePending = 0, subUsers = 0, mediaTotalSize = 0;
    try { const [r] = await db.query('SELECT COUNT(*) as c FROM contacts WHERE user_id = ?', [userId]); totalContacts = Number((r as any[])[0].c) || 0; } catch (e) {}
    try { const [r] = await db.query('SELECT COUNT(*) as c FROM campaigns WHERE user_id = ?', [userId]); totalCampaigns = Number((r as any[])[0].c) || 0; } catch (e) {}
    try { const [r] = await db.query('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?', [userId, 'sent', today]); sentToday = Number((r as any[])[0].c) || 0; } catch (e) {}
    try { const [r] = await db.query('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?', [userId, 'sent', firstDayOfMonth]); sentMonth = Number((r as any[])[0].c) || 0; } catch (e) {}
    try { const [r] = await db.query('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?', [userId, 'failed', today]); failedToday = Number((r as any[])[0].c) || 0; } catch (e) {}
    try { const [r] = await db.query('SELECT COUNT(*) as c FROM message_queue WHERE user_id = ? AND status = ?', [userId, 'pending']); queuePending = Number((r as any[])[0].c) || 0; } catch (e) {}
    try { const [r] = await db.query('SELECT COUNT(*) as c FROM profiles WHERE parent_user_id = ?', [userId]); subUsers = Number((r as any[])[0].c) || 0; } catch (e) {}
    try { const [r] = await db.query('SELECT SUM(size) as s FROM media WHERE user_id = ?', [userId]); mediaTotalSize = Number((r as any[])[0].s) || 0; } catch (e) {}

    // 6. Plan limits from system_settings
    let planLimits: any = {};
    const planKey = (profile.plan || 'free_trial').toLowerCase();
    try {
      const [settingsRows] = await db.query('SELECT value FROM system_settings WHERE `key` = "billing_limits"');
      const raw = (settingsRows as any[])[0]?.value;
      const limitsAll = raw ? JSON.parse(raw) : {};
      planLimits = limitsAll[planKey] || limitsAll['free_trial'] || {};
    } catch (e) {}

    const totalDeviceConnections = waCount + androidCount + apiCount;

    res.json({
      whatsappStatus: (isWaConnected || androidConnected) ? 'connected' : 'disconnected',
      totalContacts,
      totalCampaigns,
      sentToday,
      failedToday,
      queuePending,
      plan_expires_at: planKey === 'admin' ? null : profile.plan_expires_at,
      usage: {
        deviceConnections: { current: totalDeviceConnections, limit: planLimits.accounts ?? 0 },
        messagesMonthly: { 
          current: sentMonth, 
          limit: planLimits.monthly_msgs !== undefined 
            ? planLimits.monthly_msgs 
            : (planLimits.daily_msgs !== undefined 
                ? (planLimits.daily_msgs === 0 ? 0 : planLimits.daily_msgs * 30) 
                : 60000) 
        },
        contacts: { current: totalContacts, limit: planLimits.max_contacts ?? 0 },
        numberCheckerCredits: { current: profile.number_checker_credits || 0, limit: planLimits.number_checks_limit ?? 0 },
        apiRequests: { current: profile.api_requests_count || 0, limit: planLimits.api_requests_limit ?? 0 },
        additionalUsers: { current: subUsers, limit: planLimits.additional_users_limit ?? 0 },
        mediaStorage: { 
          current: mediaTotalSize, 
          limit: planLimits.media_limit === 0 ? 0 : (planLimits.media_limit ? planLimits.media_limit * 1024 * 1024 : 104857600) 
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
