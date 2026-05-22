import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
import { 
  sendMessage, 
  getMessageStatus, 
  getSessionStatus,
  isNumberRegistered
} from '../lib/whatsappManager';
import { SmsManager } from '../lib/smsManager';
import { checkApiKey } from '../middleware/authMiddleware';

const router = Router();

// Apply API Key protection to all routes in this router
router.use(checkApiKey);

/**
 * GET /api/devices
 * List all WhatsApp devices (sessions) for the user.
 */
router.get('/devices', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const [rows]: any = await db.query(
            'SELECT id as instance_id, session_name as name, status, phone_number, device_info, created_at FROM whatsapp_sessions WHERE user_id = ?',
            [userId]
        );
        
        const data = rows.map((r: any) => ({
            instance_id: r.instance_id,
            name: r.name,
            phone_number: r.phone_number || 'Not Linked',
            status: r.status,
            connection_type: 'qr' // Defaulting to QR as it's the primary method
        }));

        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/device-status/:instance_id
 */
router.get('/device-status/:instance_id', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { instance_id } = req.params;

    try {
        const [rows]: any = await db.query(
            'SELECT session_name FROM whatsapp_sessions WHERE id = ? AND user_id = ?',
            [instance_id, userId]
        );
        const session = rows[0];

        if (!session) {
            return res.status(404).json({ success: false, message: 'Device not found' });
        }

        const status = await getSessionStatus(userId, session.session_name);
        res.json({ success: true, status });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/send-message
 */
router.post('/send-message', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { instance_id, recipient, content, media_url, media_type } = req.body;

    if (!recipient || !content) {
        return res.status(400).json({ success: false, message: 'Recipient and content are required' });
    }

    try {
        const [rows]: any = await db.query(
            'SELECT session_name, status FROM whatsapp_sessions WHERE id = ? AND user_id = ?',
            [instance_id, userId]
        );
        
        let sessionName = 'default';
        if (instance_id) {
            if (rows.length === 0) return res.status(404).json({ success: false, message: 'Device not found' });
            if (rows[0].status !== 'connected') {
                return res.status(422).json({ 
                    success: false, 
                    message: `Device is not connected. Current status: ${rows[0].status}` 
                });
            }
            sessionName = rows[0].session_name;
        } else {
            const [connected]: any = await db.query(
                'SELECT session_name FROM whatsapp_sessions WHERE user_id = ? AND status = "connected" LIMIT 1',
                [userId]
            );
            if (connected.length === 0) return res.status(400).json({ success: false, message: 'No connected device found.' });
            sessionName = connected[0].session_name;
        }

        const msgId = await sendMessage(userId, sessionName, recipient as string, content as string, media_url as string, media_type as string);

        await db.query(`
            INSERT INTO message_logs (
                id, user_id, phone, message, message_id, session_name, media_url, media_type, status, source, ack, sent_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [generateUUID(), userId, recipient, content, msgId, sessionName, media_url || null, media_type || null, 'sent', 'api', 1, new Date()]);

        res.json({ 
            success: true, 
            message: 'Message sent successfully.',
            data: { message_id: msgId }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/message-status/:message_id
 */
router.get('/message-status/:message_id', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { message_id } = req.params;

    try {
        const ack = await getMessageStatus(userId, undefined, message_id as string);
        const [rows]: any = await db.query(
            'SELECT status, delivered_at, read_at FROM message_logs WHERE message_id = ? AND user_id = ?',
            [message_id, userId]
        );
        const log = rows[0];

        res.json({ 
            success: true, 
            status: log ? log.status : (ack ? (ack === 3 ? 'delivered' : ack === 4 ? 'read' : 'sent') : 'unknown'),
            delivered_at: log?.delivered_at,
            read_at: log?.read_at
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/check-whatsapp/:instance_id/:phone
 */
router.get('/check-whatsapp/:instance_id/:phone', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { instance_id, phone } = req.params;

    try {
        const [rows]: any = await db.query(
            'SELECT session_name, status FROM whatsapp_sessions WHERE id = ? AND user_id = ?',
            [instance_id, userId]
        );
        const session = rows[0];

        if (!session) return res.status(404).json({ success: false, message: 'Device not found' });
        if (session.status !== 'connected') return res.status(422).json({ success: false, message: 'Device is not connected.' });

        const exists = await isNumberRegistered(userId, session.session_name, phone as string);
        res.json({ 
            success: true, 
            exists: exists,
            jid: exists ? `${phone}@s.whatsapp.net` : null
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/send-transactional
 * Matches documentation structure
 */
router.post('/send-transactional', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { to, device_id, whatsapp, sms, failover_mode, sms_gateway_id } = req.body;

    const recipient = to || req.body.recipient;
    const waContent = whatsapp?.message || req.body.content;
    const smsContent = sms?.message || req.body.content;

    if (!recipient || (!waContent && !smsContent)) {
        return res.status(400).json({ success: false, message: 'Recipient and content are required' });
    }

    let channel = 'none';
    let wa_message_id = null;
    let sms_message_id = null;
    let failover = false;
    let failover_reason = null;
    let transactional_log_id = generateUUID();

    try {
        // 1. Try WhatsApp
        const [rows]: any = await db.query(
            'SELECT id, session_name, status FROM whatsapp_sessions WHERE (id = ? OR 1=1) AND user_id = ? AND status = "connected" LIMIT 1',
            [device_id, userId]
        );
        
        if (rows.length > 0) {
            try {
                wa_message_id = await sendMessage(userId, rows[0].session_name, recipient as string, waContent as string, whatsapp?.media_url);
                channel = 'whatsapp';
            } catch (waErr: any) {
                failover = true;
                failover_reason = waErr.message;
            }
        } else {
            failover = true;
            failover_reason = 'Device disconnected or not found';
        }

        // 2. Failover to SMS if needed
        if (failover && (failover_mode === 'auto' || !failover_mode)) {
            const smsManager = await SmsManager.getForUser(userId);
            try {
                const smsResult = await smsManager.sendSms(recipient as string, smsContent as string);
                sms_message_id = smsResult[0]?.statusmsg || 'sms_sent';
                channel = 'sms';
            } catch (smsErr: any) {
                return res.status(422).json({
                    success: false,
                    channel: 'none',
                    failover_required: true,
                    failover_reason: failover_reason,
                    sms_error: smsErr.message,
                    transactional_log_id
                });
            }
        } else if (failover && failover_mode === 'manual') {
            return res.json({
                success: false,
                channel: 'none',
                failover_required: true,
                failover_reason: failover_reason,
                recipient,
                transactional_log_id
            });
        }

        // 3. Log
        await db.query(`
            INSERT INTO transactional_logs (id, user_id, recipient, content, wa_message_id, sms_message_id, method, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [transactional_log_id, userId, recipient, waContent || smsContent, wa_message_id, sms_message_id, channel, 'delivered']);

        res.json({ 
            success: true, 
            channel, 
            message_id: wa_message_id || sms_message_id, 
            failover, 
            failover_reason,
            transactional_log_id 
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});


export default router;
