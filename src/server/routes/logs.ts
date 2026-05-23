import { Router, Request, Response } from 'express';
import db from '../lib/db';

const router = Router();

// GET /api/logs/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { campaign_id, status, limit = '200', offset = '0' } = req.query;

  try {
    let sql = `
      SELECT 
        ml.*,
        c.name as campaign_name,
        ml.sent_at as sent_at,
        ml.delivered_at as delivered_at,
        ml.read_at as read_at
      FROM message_logs ml
      LEFT JOIN campaigns c ON ml.campaign_id = c.id
      WHERE ml.user_id = ?
    `;
    const params: any[] = [userId];

    if (campaign_id) {
      sql += ' AND ml.campaign_id = ?';
      params.push(campaign_id);
    }
    if (status) {
      sql += ' AND ml.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY ml.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(sql, params);
    const logs = rows as any[];

    // For each log, check if the recipient replied (has incoming message in whatsapp_messages)
    if (logs.length > 0) {
      // Fetch all unique phones that replied in whatsapp_messages (is_from_me=0) 
      // for this user — batch query for performance
      const phones = [...new Set(logs.map((l: any) => l.phone).filter(Boolean))];
      
      if (phones.length > 0) {
        // Build index-friendly search parameters mapping to potential JIDs
        const searchTerms: string[] = [];
        for (const phone of phones) {
          searchTerms.push(phone);
          const bare = phone.replace(/@.*/g, '').replace(/[^0-9]/g, '');
          if (bare) {
            searchTerms.push(`${bare}@s.whatsapp.net`);
            searchTerms.push(`${bare}@c.us`);
          }
        }

        const placeholders = searchTerms.map(() => '?').join(',');
        const [replyRows] = await db.query(
          `SELECT DISTINCT \`from\` as phone 
           FROM whatsapp_messages 
           WHERE user_id = ? AND is_from_me = 0 AND \`from\` IN (${placeholders})`,
          [userId, ...searchTerms]
        );
        
        // Normalize replied phones into a Set for O(1) lookup
        const repliedPhones = new Set(
          (replyRows as any[]).map(r => {
            // Strip @c.us / @s.whatsapp.net and keep just the number
            return r.phone?.replace(/@.*/g, '').replace(/[^0-9]/g, '');
          })
        );

        // Annotate each log with reply status
        for (const log of logs) {
          const barePhone = log.phone?.replace(/@.*/g, '').replace(/[^0-9]/g, '');
          log.has_reply = repliedPhones.has(barePhone);
        }
      }
    }

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/:userId/analytics — summary stats
router.get('/:userId/analytics', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT status, ack, created_at, delivered_at, read_at FROM message_logs WHERE user_id = ?',
      [userId]
    );
    const data = rows as any[];

    const isSent    = (d: any) => d.status === 'sent' || d.status === 'delivered' || d.status === 'read' || d.ack >= 1;

    const total     = data.length;
    const sent      = data.filter(isSent).length;
    const failed    = data.filter(d => d.status === 'failed').length;
    const pending   = data.filter(d => d.status === 'pending').length;
    const delivered = data.filter(d => d.ack >= 2).length;
    const read      = data.filter(d => d.ack >= 3).length;

    // Group by day for chart
    const byDay: Record<string, { sent: number; failed: number; delivered: number; read: number }> = {};
    for (const row of data) {
      if (!row.created_at) continue;
      const dateStr = String(row.created_at).trim();
      if (dateStr.startsWith('0000-00-00') || dateStr === '') continue;

      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;

      try {
        const day = d.toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = { sent: 0, failed: 0, delivered: 0, read: 0 };
        if (isSent(row))             byDay[day].sent++;
        if (row.status === 'failed') byDay[day].failed++;
        if (row.ack >= 2)            byDay[day].delivered++;
        if (row.ack >= 3)            byDay[day].read++;
      } catch (e) {
        console.error('Failed to parse log analytics date:', row.created_at, e);
      }
    }

    res.json({
      total, sent, failed, pending, delivered, read,
      successRate:  total > 0     ? ((sent / total) * 100).toFixed(1)     : '0',
      deliveryRate: sent  > 0     ? ((delivered / sent) * 100).toFixed(1) : '0',
      readRate:     delivered > 0 ? ((read / delivered) * 100).toFixed(1) : '0',
      byDay
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/message/:messageId
router.delete('/message/:messageId', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    await db.query(
      'DELETE FROM message_logs WHERE id = ? AND user_id = ?',
      [messageId, userId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
