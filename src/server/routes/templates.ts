import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';

const router = Router();

// GET /api/templates/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates
router.post('/', async (req: Request, res: Response) => {
  const { userId, name, content, category = 'general', media_url, media_type } = req.body;
  if (!userId || !name || !content) return res.status(400).json({ error: 'Missing fields' });

  const id = generateUUID();
  try {
    await db.query(
      'INSERT INTO templates (id, user_id, name, content, category, media_url, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, name, content, category, media_url || null, media_type || null]
    );
    const [rows] = await db.query('SELECT * FROM templates WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/templates/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, content, category, media_url, media_type } = req.body;

  try {
    await db.query(
      'UPDATE templates SET name = ?, content = ?, category = ?, media_url = ?, media_type = ? WHERE id = ?',
      [name, content, category, media_url || null, media_type || null, id]
    );
    const [rows] = await db.query('SELECT * FROM templates WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM templates WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
