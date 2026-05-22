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

    // 1. Fetch Profile and Session Status
    const [profileRows] = await db.query('SELECT plan, plan_expires_at, number_checker_credits, api_requests_count FROM profiles WHERE id = ?', [userId]);
    let profile = (profileRows as any[])[0];
    
    if (!profile) {
      // Lazy create profile if it doesn't exist
      const crypto = require('crypto');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // Default free trial 3 days
      const apiKey = `sk_live_${crypto.randomBytes(24).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

      await db.query(
        'INSERT INTO profiles (id, role, plan, plan_expires_at, api_key) VALUES (?, ?, ?, ?, ?)',
        [userId, 'user', 'free_trial', expiresAt, apiKey]
      );
      profile = { 
        plan: 'free_trial', 
        plan_expires_at: expiresAt, 
        number_checker_credits: 0, 
        api_requests_count: 0 
      };
    }

    const [waRows] = await db.query('SELECT status FROM whatsapp_sessions WHERE user_id = ?', [userId]);

    // 2. Fetch Usage Stats
    const [contactRows] = await db.query('SELECT COUNT(*) as count FROM contacts WHERE user_id = ?', [userId]);
    const [campaignRows] = await db.query('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ?', [userId]);
    const [sentTodayRows] = await db.query('SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?', [userId, 'sent', today]);
    const [sentMonthRows] = await db.query('SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?', [userId, 'sent', firstDayOfMonth]);
    const [failedTodayRows] = await db.query('SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND status = ? AND sent_at >= ?', [userId, 'failed', today]);
    const [queueRows] = await db.query('SELECT COUNT(*) as count FROM message_queue WHERE user_id = ? AND status = ?', [userId, 'pending']);
    const [subUsersRows] = await db.query('SELECT COUNT(*) as count FROM profiles WHERE parent_user_id = ?', [userId]);
    const [mediaRows] = await db.query('SELECT SUM(size) as totalSize FROM media WHERE user_id = ?', [userId]);

    // 3. Fetch Plan Limits
    const [settingsRows] = await db.query('SELECT value FROM system_settings WHERE `key` = "billing_limits"');
    const limitsAll = JSON.parse((settingsRows as any[])[0]?.value || '{}');
    const planLimits = limitsAll[profile.plan] || limitsAll['free'] || {};

    res.json({
      whatsappStatus: (waRows as any[]).some(r => r.status === 'connected') ? 'connected' : 'disconnected',
      totalContacts: (contactRows as any[])[0].count || 0,
      totalCampaigns: (campaignRows as any[])[0].count || 0,
      sentToday: (sentTodayRows as any[])[0].count || 0,
      failedToday: (failedTodayRows as any[])[0].count || 0,
      queuePending: (queueRows as any[])[0].count || 0,
      plan_expires_at: profile.plan_expires_at,
      usage: {
        deviceConnections: { current: (waRows as any[]).length, limit: planLimits.accounts ?? 1 },
        messagesMonthly: { current: (sentMonthRows as any[])[0].count || 0, limit: (planLimits.monthly_msgs ?? (planLimits.daily_msgs ? planLimits.daily_msgs * 30 : 2000 * 30)) },
        contacts: { current: (contactRows as any[])[0].count || 0, limit: planLimits.max_contacts ?? 25000 },
        numberCheckerCredits: { current: profile.number_checker_credits || 0, limit: planLimits.number_checks_limit ?? 3000 },
        apiRequests: { current: profile.api_requests_count || 0, limit: planLimits.api_requests_limit ?? 30000 },
        additionalUsers: { current: (subUsersRows as any[])[0].count || 0, limit: planLimits.additional_users_limit ?? 0 },
        mediaStorage: { current: Number((mediaRows as any[])[0].totalSize || 0), limit: planLimits.media_limit ?? 104857600 } 
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
