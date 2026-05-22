import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
const crypto = require('crypto'); // Keeping if needed for other things, but let's just use generateUUID

const router = Router();

// GET /api/profiles/:id — Fetch user profile (plan, role, etc)
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM profiles WHERE id = ?', [id]);
    let profile = (rows as any[])[0];
    
    if (!profile) {
      // Lazy create profile if it doesn't exist
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // Default free trial 3 days
      
      const apiKey = `sk_live_${crypto.randomBytes(24).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

      await db.query(
        'INSERT INTO profiles (id, role, plan, plan_expires_at, api_key) VALUES (?, ?, ?, ?, ?)',
        [id, 'user', 'free_trial', expiresAt, apiKey]
      );
      profile = { id, role: 'user', plan: 'free_trial', plan_expires_at: expiresAt, api_key: apiKey };
    }

    // Parse JSON fields
    if (profile.notification_settings && typeof profile.notification_settings === 'string') {
      try { profile.notification_settings = JSON.parse(profile.notification_settings); } catch (e) {}
    }
    if (profile.app_preferences && typeof profile.app_preferences === 'string') {
      try { profile.app_preferences = JSON.parse(profile.app_preferences); } catch (e) {}
    }

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profiles/:id — Update user profile
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    full_name, 
    avatar_url, 
    phone, 
    company, 
    timezone, 
    notification_settings, 
    app_preferences 
  } = req.body;

  try {
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (full_name !== undefined) { updates.push('full_name = ?'); values.push(full_name); }
    if (avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(avatar_url); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (company !== undefined) { updates.push('company = ?'); values.push(company); }
    if (timezone !== undefined) { updates.push('timezone = ?'); values.push(timezone); }
    if (notification_settings !== undefined) { 
      updates.push('notification_settings = ?'); 
      values.push(JSON.stringify(notification_settings)); 
    }
    if (app_preferences !== undefined) { 
      updates.push('app_preferences = ?'); 
      values.push(JSON.stringify(app_preferences)); 
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes provided' });
    }

    values.push(id);
    await db.query(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profiles/:id/subscribe — Register a push subscription
router.post('/:id/subscribe', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Subscription endpoint is required' });
  }

  try {
    const { keys } = subscription;
    const { p256dh, auth } = keys;

    // Check if subscription already exists for this endpoint
    const [existing] = await db.query(
      'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [id, subscription.endpoint]
    );

    if ((existing as any[]).length > 0) {
      await db.query(
        'UPDATE push_subscriptions SET p256dh = ?, auth = ? WHERE user_id = ? AND endpoint = ?',
        [p256dh, auth, id, subscription.endpoint]
      );
    } else {
      const { generateUUID } = await import('../lib/db');
      await db.query(
        'INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)',
        [generateUUID(), id, subscription.endpoint, p256dh, auth]
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Profiles] Subscription failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profiles/:id/api-key/regenerate — Regenerate API key
router.post('/:id/api-key/regenerate', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const apiKey = `sk_live_${crypto.randomBytes(24).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
    await db.query('UPDATE profiles SET api_key = ? WHERE id = ?', [apiKey, id]);
    res.json({ success: true, api_key: apiKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
