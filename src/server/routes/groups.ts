import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';

const router = Router();

// GET /api/groups/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM contact_groups WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups
router.post('/', async (req: Request, res: Response) => {
  const { userId, name } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'userId and name are required' });

  const id = generateUUID();
  try {
    await db.query(
      'INSERT INTO contact_groups (id, user_id, name) VALUES (?, ?, ?)',
      [id, userId, name]
    );
    const [rows] = await db.query('SELECT * FROM contact_groups WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/groups/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    await db.query('UPDATE contact_groups SET name = ? WHERE id = ?', [name, id]);
    const [rows] = await db.query('SELECT * FROM contact_groups WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM contact_groups WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
