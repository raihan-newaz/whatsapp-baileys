/**
 * Pure MySQL-based auth client — Supabase completely removed.
 * Mirrors the same interface so existing routes need minimal changes.
 */
import db, { generateUUID } from './db';

export const supabase = {
  auth: {
    admin: {
      async listUsers() {
        try {
          const [rows] = await db.query(
            'SELECT id, email, full_name, role, plan, is_banned, created_at FROM profiles ORDER BY created_at DESC'
          );
          const profiles = rows as any[];
          const users = profiles.map((p) => ({
            id: p.id,
            email: p.email || `${(p.full_name || 'user').toLowerCase().replace(/\s+/g, '')}@local.com`,
            created_at: p.created_at,
            last_sign_in_at: p.created_at,
            banned_until: p.is_banned
              ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
              : null,
          }));
          return { data: { users }, error: null };
        } catch (err: any) {
          console.error('[Auth] listUsers failed:', err);
          return { data: { users: [] }, error: err };
        }
      },

      async createUser({ email, password, user_metadata }: any) {
        try {
          const id = generateUUID();
          const crypto = require('crypto');
          const bcrypt = require('bcryptjs');
          const password_hash = password ? bcrypt.hashSync(password, 10) : null;
          const apiKey = `sk_live_${crypto.randomBytes(24).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 3);

          await db.query(
            'INSERT INTO profiles (id, email, full_name, password_hash, role, plan, plan_expires_at, api_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, email, user_metadata?.full_name || '', password_hash, 'user', 'free_trial', expiresAt, apiKey]
          );

          return { data: { user: { id, email, user_metadata } }, error: null };
        } catch (err: any) {
          console.error('[Auth] createUser failed:', err);
          return { data: null, error: err };
        }
      },

      async updateUserById(id: string, updates: any) {
        try {
          if (updates.ban_duration !== undefined) {
            const is_banned = updates.ban_duration !== 'none';
            await db.query('UPDATE profiles SET is_banned = ? WHERE id = ?', [is_banned, id]);
          }
          return { data: { user: { id } }, error: null };
        } catch (err: any) {
          console.error('[Auth] updateUserById failed:', err);
          return { data: null, error: err };
        }
      },

      async deleteUser(id: string) {
        try {
          await db.query('DELETE FROM profiles WHERE id = ?', [id]);
          return { data: {}, error: null };
        } catch (err: any) {
          console.error('[Auth] deleteUser failed:', err);
          return { data: null, error: err };
        }
      },
    },
  },
};
