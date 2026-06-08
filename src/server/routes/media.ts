import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';

const router = Router();

// GET /api/media/:userId - List all media for a user
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { type, search } = req.query;

  try {
    let sql = 'SELECT * FROM media WHERE user_id = ?';
    const params: any[] = [userId];

    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/media/:userId/stats - Get storage stats
router.get('/:userId/stats', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT type, COUNT(*) as count, SUM(size) as totalSize FROM media WHERE user_id = ? GROUP BY type',
      [userId]
    );
    
    // Also get total overall stats
    const [totalRows] = await db.query(
      'SELECT COUNT(*) as totalFiles, SUM(size) as totalOverallSize FROM media WHERE user_id = ?',
      [userId]
    );

    // Get User Plan and Limits
    const [profileRows] = await db.query('SELECT plan FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const userPlan = profile ? profile.plan : 'free';

    const [settingsRows] = await db.query('SELECT value FROM system_settings WHERE `key` = "billing_limits"');
    const rawVal = (settingsRows as any[])[0]?.value;
    const limitsAll = typeof rawVal === 'string' ? JSON.parse(rawVal) : (rawVal || {});
    const planLimits = limitsAll[userPlan] || limitsAll['free_trial'] || {};
    
    // Calculate limit based on value and unit
    const limitValue = planLimits.media_limit ?? 100;
    const limitUnit = planLimits.media_limit_unit ?? 'MB';
    const isUnlimited = limitValue === 0;
    const multiplier = limitUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024;
    const mediaLimit = isUnlimited ? 0 : (limitValue * multiplier); // 0 means unlimited in stats response

    const stats = (rows as any[]).map(r => ({
      ...r,
      totalSize: Number(r.totalSize || 0)
    }));

    const overall = (totalRows as any[])[0];

    res.json({
      details: stats,
      summary: {
        totalFiles: overall.totalFiles || 0,
        totalSize: Number(overall.totalOverallSize || 0),
        limit: mediaLimit
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media - Register new media item
router.post('/', async (req: Request, res: Response) => {
  const { userId, name, url, type, size } = req.body;

  if (!userId || !name || !url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const id = generateUUID();
    await db.query(
      'INSERT INTO media (id, user_id, name, url, type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, name, url, type || 'document', size || 0]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/media/:mediaId - Remove a media record
router.delete('/:mediaId', async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    // Note: This only deletes from DB. 
    // Usually you'd also delete from Supabase storage, but we follow the pattern of the logs router for now.
    await db.query('DELETE FROM media WHERE id = ? AND user_id = ?', [mediaId, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
