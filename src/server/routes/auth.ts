import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const router = Router();

// POST /api/auth/login — authenticate a user with email and password
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM profiles WHERE email = ?', [email]);
    const profile = (rows as any[])[0];

    if (!profile) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (profile.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
    }

    if (!profile.password_hash) {
      return res.status(400).json({ error: 'Authentication not fully set up. Please reset your password or contact support.' });
    }

    const match = bcrypt.compareSync(password, profile.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = {
      id: profile.id,
      email: profile.email,
      user_metadata: {
        full_name: profile.full_name || 'Local User'
      }
    };

    res.json({ user, success: true });
  } catch (err: any) {
    console.error('[Auth Route] Login failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup — create a new user profile with hashed password
router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if email already registered
    const [existing] = await db.query('SELECT id FROM profiles WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const id = generateUUID();
    const password_hash = bcrypt.hashSync(password, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3 days free trial
    const apiKey = `sk_live_${crypto.randomBytes(24).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

    await db.query(
      'INSERT INTO profiles (id, email, password_hash, full_name, role, plan, plan_expires_at, api_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email, password_hash, full_name || '', 'user', 'free_trial', expiresAt, apiKey]
    );

    const user = {
      id,
      email,
      user_metadata: {
        full_name: full_name || ''
      }
    };

    res.json({ user, success: true });
  } catch (err: any) {
    console.error('[Auth Route] Signup failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
