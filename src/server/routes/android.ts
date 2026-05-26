import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
import crypto from 'crypto';
import { getIO } from '../index';

const router = Router();

// GET /api/android/devices/:userId — List all connected android devices for a user
router.get('/devices/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const [rows]: any = await db.query('SELECT id, device_name as name, status, battery_level, default_sim, sms_delay_seconds, sync_mode, last_active_at FROM android_devices WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ success: true, devices: rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/android/incoming/:userId — List all incoming SMS
router.get('/incoming/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const [rows]: any = await db.query('SELECT * FROM android_incoming_sms WHERE user_id = ? ORDER BY received_at DESC LIMIT 100', [userId]);
        res.json({ success: true, messages: rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/android/incoming/:id — Delete an incoming SMS
router.delete('/incoming/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM android_incoming_sms WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/android/generate-token — Generate a new QR token for connection
router.post('/generate-token', async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    try {
        const id = generateUUID();
        const connectionToken = crypto.randomBytes(32).toString('hex');

        await db.query(`
            INSERT INTO android_devices (id, user_id, connection_token)
            VALUES (?, ?, ?)
        `, [id, userId, connectionToken]);

        res.json({ success: true, token: connectionToken, deviceId: id });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/android/devices/:id/regenerate-token — Regenerate token for reconnecting
router.post('/devices/:id/regenerate-token', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const connectionToken = crypto.randomBytes(32).toString('hex');
        await db.query('UPDATE android_devices SET connection_token = ?, status = "disconnected" WHERE id = ?', [connectionToken, id]);
        res.json({ success: true, token: connectionToken, deviceId: id });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/android/devices/:id — Update android device settings (delay, default sim, name)
router.patch('/devices/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, default_sim, sms_delay_seconds, sync_mode } = req.body;

    try {
        const updates: string[] = [];
        const params: any[] = [];

        if (name !== undefined) { updates.push('device_name = ?'); params.push(name); }
        if (default_sim !== undefined) { updates.push('default_sim = ?'); params.push(default_sim); }
        if (sms_delay_seconds !== undefined) { updates.push('sms_delay_seconds = ?'); params.push(sms_delay_seconds); }
        if (sync_mode !== undefined) { updates.push('sync_mode = ?'); params.push(sync_mode); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        await db.query(`UPDATE android_devices SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/android/devices/:id — Delete a device
router.delete('/devices/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM android_devices WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/android/devices/:id/logout — Force logout a connected device
router.post('/devices/:id/logout', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const [rows]: any = await db.query('SELECT socket_id FROM android_devices WHERE id = ?', [id]);
        const device = rows[0];
        
        if (device && device.socket_id) {
            const io = getIO();
            io.to(device.socket_id).emit('force_logout');
        }

        await db.query('UPDATE android_devices SET status = "disconnected", socket_id = NULL WHERE id = ?', [id]);
        res.json({ success: true, message: 'Device logged out successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
