import { Router, Request, Response } from 'express';
import db from '../lib/db';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/admin/settings — fetch all global system settings
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT * FROM system_settings');
    const data = rows as any[];
    
    // Convert array of {key, value} to a single object map
    const settingsMap = data.reduce((acc: any, row: any) => {
      try {
        acc[row.key] = JSON.parse(row.value);
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});
    
    res.json({ settings: settingsMap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings/:key — update a specific setting
router.put('/settings/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value, userId } = req.body;

  console.log(`[Admin] Updating setting: ${key}`, { value, userId });

  if (value === undefined) {
    return res.status(400).json({ error: 'Value is required' });
  }

  try {
    const jsonValue = JSON.stringify(value);
    await db.query(
      'INSERT INTO system_settings (`key`, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)',
      [key, jsonValue, new Date(), userId]
    );
    
    console.log(`[Admin] Setting ${key} updated successfully`);
    res.json({ success: true, key, value });
  } catch (err: any) {
    console.error(`[Admin] Failed to update setting ${key}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/campaigns — list all global campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, s.session_name 
      FROM campaigns c 
      LEFT JOIN whatsapp_sessions s ON c.session_id = s.id 
      ORDER BY c.created_at DESC
    `);
    const data = rows as any[];

    // Fetch auth users to get emails
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userMap = new Map((authUsers?.users || []).map((u: any) => [u.id, u.email]));

    // Attach profile emails
    const campaigns = data.map((camp: any) => ({
      ...camp,
      profiles: { email: userMap.get(camp.user_id) || 'Unknown User' },
      whatsapp_sessions: { session_name: camp.session_name }
    }));

    res.json({ campaigns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/campaigns/:id/pause — forcefully pause a campaign
router.patch('/campaigns/:id/pause', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(
      'UPDATE message_queue SET status = ?, error_message = ? WHERE campaign_id = ? AND status = ?',
      ['failed', 'Campaign forcefully paused by admin', id, 'pending']
    );
    await db.query('UPDATE campaigns SET status = ? WHERE id = ?', ['paused', id]);
    
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    res.json({ success: true, campaign: (rows as any[])[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — list all users with profiles
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });

    // Get all profiles
    const [profilesRows] = await db.query('SELECT * FROM profiles');
    const profiles = profilesRows as any[];
    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

    const users = authUsers.users.map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
      banned_until: u.banned_until,
      role: profileMap.get(u.id)?.role || 'user',
      plan: profileMap.get(u.id)?.plan || 'free',
      full_name: profileMap.get(u.id)?.full_name || '',
    }));

    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — create a new user
router.post('/users', async (req: Request, res: Response) => {
  const { email, password, full_name, role = 'user', plan = 'free' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) return res.status(400).json({ error: error.message });

    // Upsert profile
    await db.query(
      'INSERT INTO profiles (id, full_name, role, plan) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role), plan = VALUES(plan)',
      [data.user.id, full_name, role, plan]
    );

    res.json({ success: true, user: data.user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id — update plan, role, name
router.patch('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, plan, full_name } = req.body;

  try {
    const updates: any = {};
    const sets = [];
    const values = [];

    if (role) {
      sets.push('role = ?');
      values.push(role);
    }
    if (plan) {
      sets.push('plan = ?');
      values.push(plan);
      
      let expiresAt: Date | null = new Date();
      if (plan === 'admin') {
        expiresAt = null; // Admin can never expire
      } else {
        try {
          const [settingsRows] = await db.query('SELECT value FROM system_settings WHERE `key` = "billing_limits"');
          const rawVal = (settingsRows as any[])[0]?.value;
          const limitsAll = typeof rawVal === 'string' ? JSON.parse(rawVal) : (rawVal || {});
          const planLimits = limitsAll[plan] || {};
          const validityDays = planLimits.validity_days !== undefined ? Number(planLimits.validity_days) : (plan === 'free_trial' ? 3 : 30);
          if (validityDays === 0) {
            expiresAt = null;
          } else {
            expiresAt.setDate(expiresAt.getDate() + validityDays);
          }
        } catch (e) {
          expiresAt.setDate(expiresAt.getDate() + (plan === 'free_trial' ? 3 : 30));
        }
      }
      sets.push('plan_expires_at = ?');
      values.push(expiresAt);
    }
    if (full_name !== undefined) {
      sets.push('full_name = ?');
      values.push(full_name);
    }

    if (sets.length === 0) return res.json({ success: true });

    values.push(id);
    await db.query(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`, values);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/ban — ban a user
router.post('/users/:id/ban', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { days = 3650 } = req.body; // default: 10 years (permanent)

  try {
    const until = new Date();
    until.setDate(until.getDate() + days);

    const { error } = await supabase.auth.admin.updateUserById(String(id), {
      ban_duration: `${days * 24}h`,
    });
    if (error) return res.status(500).json({ error: error.message });

    // Sync with MySQL
    await db.query('UPDATE profiles SET is_banned = ? WHERE id = ?', [true, id]);

    // Force disconnect all sessions
    const [sessions] = await db.query('SELECT session_name FROM whatsapp_sessions WHERE user_id = ?', [id]);
    for (const s of (sessions as any[])) {
      const { disconnectSession } = await import('../lib/whatsappManager');
      await disconnectSession(id as string, s.session_name).catch(() => {});
      await db.query('UPDATE whatsapp_sessions SET status = ? WHERE user_id = ? AND session_name = ?', ['disconnected', id, s.session_name]);
    }

    res.json({ success: true, banned_until: until });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/unban — unban a user
router.post('/users/:id/unban', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.auth.admin.updateUserById(id as string, {
      ban_duration: 'none',
    });
    if (error) return res.status(500).json({ error: error.message });

    // Sync with MySQL
    await db.query('UPDATE profiles SET is_banned = ? WHERE id = ?', [false, id]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — permanently delete user
router.delete('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Delete profile first
    await db.query('DELETE FROM profiles WHERE id = ?', [id]);
    // Delete auth user
    const { error } = await supabase.auth.admin.deleteUser(id as string);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
