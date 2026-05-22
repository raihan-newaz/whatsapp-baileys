import { Router, Request, Response } from 'express';
import db from '../lib/db';

const router = Router();

// GET /api/notifications/:userId - Fetch latest 50 notifications
router.get('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json({ success: true, notifications: rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/notifications/:id/read - Mark a notification as read
router.post('/:id/read', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/notifications/read-all/:userId - Mark all notifications as read for a user
router.post('/read-all/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
