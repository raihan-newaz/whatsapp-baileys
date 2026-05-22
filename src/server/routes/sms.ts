
import { Router, Request, Response } from 'express';
import { SmsManager } from '../lib/smsManager';
import db, { generateUUID } from '../lib/db';

const router = Router();

// GET /api/sms/gateways/:userId — List all gateways
router.get('/gateways/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const [rows]: any = await db.query('SELECT * FROM sms_gateways WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        const gateways = rows.map((row: any) => ({
            ...row,
            isDefault: row.is_default, // Map is_default to isDefault for frontend consistency
            config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
        }));
        res.json({ success: true, gateways });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sms/gateways — Create a new gateway
router.post('/gateways', async (req: Request, res: Response) => {
    const { userId, name, provider, config, isDefault } = req.body;
    
    if (!userId || !name || !provider || !config) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const id = generateUUID();
        
        // If this is the first gateway or isDefault is true, unset others
        if (isDefault) {
            await db.query('UPDATE sms_gateways SET is_default = FALSE WHERE user_id = ?', [userId]);
        }

        await db.query(`
            INSERT INTO sms_gateways (id, user_id, name, provider, config, is_default)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, userId, name, provider, JSON.stringify(config), isDefault || false]);

        res.json({ success: true, gatewayId: id });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/sms/gateways/:id — Update a gateway
router.patch('/gateways/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, config, status } = req.body;

    try {
        const updates: string[] = [];
        const params: any[] = [];

        if (name) { updates.push('name = ?'); params.push(name); }
        if (config) { updates.push('config = ?'); params.push(JSON.stringify(config)); }
        if (status) { updates.push('status = ?'); params.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        await db.query(`UPDATE sms_gateways SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/sms/gateways/:id — Delete a gateway
router.delete('/gateways/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM sms_gateways WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sms/gateways/:id/test — Test Connection (Fetch details/balance)
router.post('/gateways/:id/test', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const gatewayId = id as string;
        const smsManager = await SmsManager.getByGatewayId(gatewayId);
        const details = await smsManager.getAccountDetails();
        res.json({ success: true, details });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sms/gateways/:id/send-test — Send Test SMS
router.post('/gateways/:id/send-test', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { to } = req.body;
    
    if (!to) return res.status(400).json({ error: 'Recipient number (to) is required' });

    try {
        const gatewayId = id as string;
        const smsManager = await SmsManager.getByGatewayId(gatewayId);
        const results = await smsManager.sendSms(to, 'This is a test SMS from your SMS Gateway.');
        res.json({ success: true, results });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sms/gateways/:id/set-default — Set as Default
router.post('/gateways/:id/set-default', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
        await db.query('UPDATE sms_gateways SET is_default = FALSE WHERE user_id = ?', [userId]);
        await db.query('UPDATE sms_gateways SET is_default = TRUE WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sms/settings/:userId — Get default gateway token
router.get('/settings/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const [rows]: any = await db.query('SELECT config FROM sms_gateways WHERE user_id = ? AND is_default = TRUE AND status = "active" LIMIT 1', [userId]);
        let gateway = rows[0];
        
        if (!gateway) {
            const [anyActive]: any = await db.query('SELECT config FROM sms_gateways WHERE user_id = ? AND status = "active" LIMIT 1', [userId]);
            gateway = anyActive[0];
        }

        if (gateway) {
            const config = typeof gateway.config === 'string' ? JSON.parse(gateway.config) : gateway.config;
            return res.json({ success: true, token: config.token });
        }

        // Fallback to legacy system_settings
        const [oldRows]: any = await db.query('SELECT value FROM system_settings WHERE `key` = ?', ['greenweb_token']);
        const oldRow = oldRows[0];
        if (oldRow) {
            try {
                const parsed = JSON.parse(oldRow.value);
                const token = typeof parsed === 'object' ? parsed.token : oldRow.value;
                return res.json({ success: true, token });
            } catch (e) {
                return res.json({ success: true, token: oldRow.value });
            }
        }

        res.json({ success: true, token: '' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/sms/settings — Update default gateway token
router.patch('/settings', async (req: Request, res: Response) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: 'Missing userId or token' });

    try {
        const [rows]: any = await db.query('SELECT id, config FROM sms_gateways WHERE user_id = ? AND is_default = TRUE LIMIT 1', [userId]);
        let gateway = rows[0];

        if (gateway) {
            const config = typeof gateway.config === 'string' ? JSON.parse(gateway.config) : gateway.config;
            config.token = token;
            await db.query('UPDATE sms_gateways SET config = ? WHERE id = ?', [JSON.stringify(config), gateway.id]);
        } else {
            // Check if any gateway exists at all
            const [any]: any = await db.query('SELECT id FROM sms_gateways WHERE user_id = ? LIMIT 1', [userId]);
            if (any.length === 0) {
                // Auto-create a default GreenWeb gateway
                const id = generateUUID();
                await db.query(`
                    INSERT INTO sms_gateways (id, user_id, name, provider, config, is_default, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [id, userId, 'Default GreenWeb', 'GreenWeb', JSON.stringify({ token }), true, 'active']);
            } else {
                // Update legacy
                await db.query('INSERT INTO system_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', ['greenweb_token', JSON.stringify({ token }), JSON.stringify({ token })]);
            }
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// LEGACY SUPPORT ENDPOINTS (Optional, for backward compatibility)
router.post('/send', async (req: Request, res: Response) => {
    const { to, message } = req.body;
    try {
        const smsManager = await SmsManager.getDefault();
        const results = await smsManager.sendSms(to, message);
        res.json({ success: true, results });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/account/:userId', async (req: Request, res: Response) => {
    try {
        const smsManager = await SmsManager.getDefault();
        const details = await smsManager.getAccountDetails();
        res.json({ success: true, details });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
