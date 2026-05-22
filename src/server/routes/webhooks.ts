/**
 * Webhook Trigger Routes
 *
 * External systems (CRM, eCommerce, etc.) can POST to:
 *   POST /api/webhooks/trigger/:api_key
 * with a body of { phone, name?, order_id?, amount?, product? }
 * to immediately send a WhatsApp message using the webhook's configured template.
 */

import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
import { sendMessage } from '../lib/whatsappManager';

const router = Router();

// ------------------------------------------------------------------
// GET /api/webhooks/:userId  — list all webhooks for a user
// ------------------------------------------------------------------
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT w.*, t.name as template_name, s.session_name, s.phone_number 
      FROM webhooks w 
      LEFT JOIN templates t ON w.template_id = t.id 
      LEFT JOIN whatsapp_sessions s ON w.session_id = s.id 
      WHERE w.user_id = ? 
      ORDER BY w.created_at DESC
    `, [userId]);
    
    const data = (rows as any[]).map(row => {
      let eventsArr = [];
      try {
        if (typeof row.events === 'string') {
          eventsArr = JSON.parse(row.events);
        } else if (Array.isArray(row.events)) {
          eventsArr = row.events;
        }
      } catch (e) {
        console.error('Failed to parse events for webhook', row.id, e);
      }

      return {
        ...row,
        events: eventsArr,
        templates: { name: row.template_name },
        whatsapp_sessions: { session_name: row.session_name, phone_number: row.phone_number }
      };
    });
    
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks — create a new webhook
// ------------------------------------------------------------------
router.post('/', async (req: Request, res: Response) => {
  const { 
    userId, name, url, method = 'POST', session_id, 
    events = [], headers = '', retry_count = 3, timeout = 30, is_active = true 
  } = req.body;
  
  if (!userId || !name) return res.status(400).json({ error: 'userId and name are required' });
  
  // Create a secret_token (alias for api_key for woo compatibility)
  const secret = 'wh_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const id = generateUUID();
  try {
    await db.query(`
      INSERT INTO webhooks (
        id, user_id, name, url, method, events, headers, 
        retry_count, timeout, is_active, session_id, api_key, secret_token
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, userId, name, url || null, method, 
      JSON.stringify(events), headers || '', 
      retry_count, timeout, is_active ? 1 : 0, 
      session_id || null, secret, secret
    ]);
    
    const [rows] = await db.query('SELECT * FROM webhooks WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// PATCH /api/webhooks/:id/toggle — enable/disable webhook
// ------------------------------------------------------------------
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE webhooks SET is_active = NOT is_active WHERE id = ?', [id]);
    const [rows] = await db.query('SELECT is_active FROM webhooks WHERE id = ?', [id]);
    const wh = (rows as any[])[0];
    if (!wh) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ is_active: !!wh.is_active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// DELETE /api/webhooks/:id — delete a webhook
// ------------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM webhooks WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// POST /api/webhooks/trigger/:api_key — GENERAL TRIGGER
// ------------------------------------------------------------------
router.get('/trigger/:api_key', (req: Request, res: Response) => {
  res.json({ status: 'active', message: 'Webhook is active! Use POST to trigger messages.' });
});

router.post('/trigger/:api_key', async (req: Request, res: Response) => {
  const { api_key } = req.params;
  const { phone, name = '', order_id = '', amount = '', product = '' } = req.body;
  await handleWebhookExecution(String(api_key), { phone, name, order_id, amount, product }, 'webhook', res);
});

// ------------------------------------------------------------------
// POST /api/webhooks/woocommerce/:secret_token — WOOCOMMERCE TRIGGER
// Maps Woo payload (billing.phone, id, total, etc) to standard vars
// ------------------------------------------------------------------
router.get('/woocommerce/:token', (req: Request, res: Response) => {
  res.json({ status: 'active', message: 'WooCommerce Webhook is active! Use POST to trigger messages.' });
});

router.post('/woocommerce/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const body = req.body;

  // WooCommerce Mapping
  const data = {
    phone: body.billing?.phone || body.phone || '',
    name: body.billing?.first_name ? `${body.billing.first_name} ${body.billing.last_name || ''}`.trim() : body.name || '',
    order_id: body.number || body.id || '',
    amount: body.total || '',
    product: body.line_items?.[0]?.name || ''
  };

  await handleWebhookExecution(String(token), data, 'woocommerce', res);
});

async function handleWebhookExecution(apiKey: string, data: any, source: string, res: Response) {
  const { phone, name, order_id, amount, product } = data;

  if (!phone) return res.status(400).json({ error: 'phone is required' });

  try {
    // Lookup webhook by api_key OR secret_token
    const [rows] = await db.query(`
      SELECT w.*, t.content, t.media_url, t.media_type, s.user_id, s.session_name 
      FROM webhooks w 
      LEFT JOIN templates t ON w.template_id = t.id 
      LEFT JOIN whatsapp_sessions s ON w.session_id = s.id 
      WHERE w.api_key = ? OR w.secret_token = ?
    `, [apiKey, apiKey]);
    
    const webhook = (rows as any[])[0];

    if (!webhook) return res.status(404).json({ error: 'Invalid Webhook token' });
    if (!webhook.is_active) return res.status(403).json({ error: 'Webhook is disabled' });

    const userId = webhook.user_id;
    const sessionName = webhook.session_name || 'default';

    if (!userId) return res.status(500).json({ error: 'WhatsApp session not connected for this webhook' });

    let message = webhook.content || '';
    message = message
      .replace(/{name}/g, name)
      .replace(/{phone}/g, phone)
      .replace(/{order_id}/g, order_id)
      .replace(/{amount}/g, amount)
      .replace(/{product}/g, product);

    const msgId = await sendMessage(
      userId,
      sessionName,
      String(phone).replace(/[^0-9]/g, ''),
      message,
      webhook.media_url || undefined,
      webhook.media_type || undefined
    );

    // Update stats (use both columns for compatibility)
    await db.query(`
      UPDATE webhooks 
      SET total_triggered = total_triggered + 1, 
          received_count = received_count + 1,
          last_triggered_at = ?
      WHERE id = ?
    `, [new Date(), webhook.id]);

    // Log the message
    await db.query(`
      INSERT INTO message_logs (id, user_id, phone, message, message_id, status, source, ack, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [generateUUID(), userId, String(phone).replace(/[^0-9]/g, ''), message, msgId, 'sent', source, 1, new Date()]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export default router;
