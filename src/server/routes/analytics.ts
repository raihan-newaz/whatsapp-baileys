import { Router, Request, Response } from 'express';
import db from '../lib/db';

const router = Router();

// GET /api/analytics/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // 1. Profile & Plan
    const [profileRows] = await db.query('SELECT plan FROM profiles WHERE id = ?', [userId]);
    const plan = (profileRows as any[])[0]?.plan || 'free';

    // 2. Message Stats from message_logs (campaigns) — Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [logRows] = await db.query(
      'SELECT status, created_at as sent_at, campaign_id, ack, delivered_at, read_at FROM message_logs WHERE user_id = ? AND created_at >= ?',
      [userId, thirtyDaysAgo]
    );
    const logs = logRows as any[];

    // Robust, cascading status checkers
    const isRead = (l: any) => l.status === 'read' || l.status === 'seen' || (l.ack && l.ack >= 3) || l.read_at !== null;
    const isDelivered = (l: any) => isRead(l) || l.status === 'delivered' || (l.ack && l.ack >= 2) || l.delivered_at !== null;
    const isSent = (l: any) => isDelivered(l) || l.status === 'sent' || l.status === 'success' || (l.ack && l.ack >= 1);

    const campaignSent      = logs.filter(isSent).length;
    const campaignFailed    = logs.filter(l => l.status === 'failed').length;
    const campaignPending   = logs.filter(l => l.status === 'pending').length;
    const campaignDelivered = logs.filter(isDelivered).length;
    const campaignRead      = logs.filter(isRead).length;

    // 3. Inbox message stats from whatsapp_messages (real conversations) — Last 30 days
    const [inboxRows] = await db.query(
      `SELECT ack, status, is_from_me, timestamp, delivered_at, read_at
       FROM whatsapp_messages
       WHERE user_id = ? AND is_from_me = 1 AND timestamp >= ?`,
      [userId, thirtyDaysAgo]
    );
    const inboxMsgs = inboxRows as any[];

    const inboxSent      = inboxMsgs.filter(isSent).length;
    const inboxDelivered = inboxMsgs.filter(isDelivered).length;
    const inboxRead      = inboxMsgs.filter(isRead).length;

    // Combined totals
    const totalSent      = campaignSent + inboxSent;
    const totalDelivered = campaignDelivered + inboxDelivered;
    const totalRead      = campaignRead + inboxRead;
    const totalFailed    = campaignFailed;
    const totalPending   = campaignPending;
    const total          = logs.length + inboxMsgs.length;

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';
    const readRate     = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0';
    const successRate  = total > 0 ? ((totalSent / total) * 100).toFixed(1) : '0';

    // Helper to format Date objects consistently in local YYYY-MM-DD format
    const getLocalDateString = (dateObj: Date) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Daily chart — pre-populated with last 30 days up to tomorrow to safely handle timezone differences
    const byDay: Record<string, { date: string; sent: number; failed: number; delivered: number; read: number }> = {};
    for (let i = 29; i >= -1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = getLocalDateString(d);
      byDay[dayStr] = { date: dayStr.slice(5), sent: 0, failed: 0, delivered: 0, read: 0 };
    }
    
    const isValidDate = (dateVal: any) => {
      if (!dateVal) return false;
      const dateStr = String(dateVal).trim();
      if (dateStr.startsWith('0000-00-00') || dateStr === '') return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime());
    };

    for (const l of logs) {
      if (!isValidDate(l.sent_at)) continue;
      const day = getLocalDateString(new Date(l.sent_at));
      if (byDay[day]) {
        if (isSent(l))             byDay[day].sent++;
        if (l.status === 'failed') byDay[day].failed++;
        if (isDelivered(l))        byDay[day].delivered++;
        if (isRead(l))             byDay[day].read++;
      }
    }

    for (const m of inboxMsgs) {
      if (!isValidDate(m.timestamp)) continue;
      const day = getLocalDateString(new Date(m.timestamp));
      if (byDay[day]) {
        if (isSent(m))      byDay[day].sent++;
        if (isDelivered(m)) byDay[day].delivered++;
        if (isRead(m))      byDay[day].read++;
      }
    }

    // Heatmap (Last 7 days) — both sources
    const hourly: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourly[h] = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const l of logs.filter(l => isSent(l) && isValidDate(l.sent_at) && new Date(l.sent_at) >= sevenDaysAgo)) {
      hourly[new Date(l.sent_at).getHours()]++;
    }
    for (const m of inboxMsgs.filter(m => isValidDate(m.timestamp) && new Date(m.timestamp) >= sevenDaysAgo)) {
      hourly[new Date(m.timestamp).getHours()]++;
    }

    // Today's quota
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySent = logs.filter(l => isSent(l) && isValidDate(l.sent_at) && new Date(l.sent_at) >= today).length
                    + inboxMsgs.filter(m => isValidDate(m.timestamp) && new Date(m.timestamp) >= today).length;

    // 4. Campaign Stats
    const [campaignRows] = await db.query(
      'SELECT name, total_sent, total_failed, status, template_id FROM campaigns WHERE user_id = ? ORDER BY total_sent DESC LIMIT 8',
      [userId]
    );
    const campaigns = campaignRows as any[];

    // 5. Template Stats
    const [templateRows] = await db.query('SELECT id, name FROM templates WHERE user_id = ?', [userId]);
    const templates = templateRows as any[];
    const tempCount: Record<string, { name: string; count: number }> = {};
    for (const t of templates) tempCount[t.id] = { name: t.name, count: 0 };
    for (const c of campaigns) {
      if (c.template_id && tempCount[c.template_id]) {
        tempCount[c.template_id].count += c.total_sent || 0;
      }
    }

    // 6. Contact Stats (Audience breakdown)
    const [contactRows] = await db.query(
      'SELECT c.group_id, cg.name as group_name FROM contacts c LEFT JOIN contact_groups cg ON c.group_id = cg.id WHERE c.user_id = ?',
      [userId]
    );
    const contacts = contactRows as any[];
    const grouped: Record<string, { name: string; value: number }> = {};
    let ungrouped = 0;
    for (const c of contacts) {
      if (!c.group_id) { ungrouped++; continue; }
      const name = c.group_name || 'Unknown';
      if (!grouped[c.group_id]) grouped[c.group_id] = { name, value: 0 };
      grouped[c.group_id].value++;
    }

    // 7. Seen/Read breakdown for WhatsApp inbox messages (last 30 days) calculated dynamically in JS
    const pendingCount = inboxMsgs.filter(m => !isSent(m)).length;
    const sentCount = inboxMsgs.filter(m => isSent(m) && !isDelivered(m)).length;

    res.json({
      plan,
      msgStats: {
        total,
        sent: totalSent,
        failed: totalFailed,
        pending: totalPending,
        delivered: totalDelivered,
        read: totalRead,
        successRate,
        deliveryRate,
        readRate,
        // Inbox-specific breakdown
        inboxStats: {
          total: inboxSent,
          delivered: inboxDelivered,
          read: inboxRead,
          pending: pendingCount,
          sentOnly: sentCount,
          readRate: inboxDelivered > 0 ? ((inboxRead / inboxDelivered) * 100).toFixed(1) : '0',
          deliveryRate: inboxSent > 0 ? ((inboxDelivered / inboxSent) * 100).toFixed(1) : '0',
        }
      },
      dailyChart: Object.values(byDay)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30),
      heatmap: Object.entries(hourly).map(([h, count]) => ({ hour: `${h}:00`, count })),
      quotaUsed: todaySent,
      campaignChart: campaigns.map(c => ({
        name: c.name?.length > 16 ? c.name.slice(0, 16) + '…' : c.name,
        sent: c.total_sent || 0,
        failed: c.total_failed || 0,
      })),
      templateChart: Object.values(tempCount)
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      contactStats: {
        total: contacts.length,
        ungrouped,
        groups: Object.values(grouped).sort((a, b) => b.value - a.value).slice(0, 6),
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
