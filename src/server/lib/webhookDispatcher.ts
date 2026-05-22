/**
 * webhookDispatcher.ts
 * 
 * Responsible for finding active webhooks for a user+session and
 * dispatching HTTP POST events to each configured endpoint.
 * 
 * Events: message_received | message_sent | message_delivered | message_read | message_failed
 */

import db from './db';

const MAX_RETRIES = 3;
const TIMEOUT_MS  = 15_000;

export async function dispatchWebhookEvent(
  userId: string,
  sessionName: string,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  try {
    // Find all active webhooks for this user+session that subscribe to this event
    const [rows] = await db.query(
      `SELECT id, url, method, headers, retry_count, timeout, events
       FROM webhooks
       WHERE user_id = ?
         AND is_active = 1
         AND (
           session_id IS NULL
           OR session_id IN (
             SELECT id FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?
           )
         )`,
      [userId, userId, sessionName]
    );

    const webhooks = rows as any[];
    if (!webhooks || webhooks.length === 0) return;

    for (const wh of webhooks) {
      // Parse events — if empty/null, treat as "all events"
      let subscribedEvents: string[] = [];
      try {
        if (typeof wh.events === 'string' && wh.events.trim()) {
          subscribedEvents = JSON.parse(wh.events);
        } else if (Array.isArray(wh.events)) {
          subscribedEvents = wh.events;
        }
      } catch {}

      // Skip if event not in subscription list (unless subscribed to all)
      if (subscribedEvents.length > 0 && !subscribedEvents.includes(event)) continue;
      if (!wh.url) continue;

      // Parse custom headers
      let customHeaders: Record<string, string> = {};
      try {
        if (wh.headers && typeof wh.headers === 'string' && wh.headers.trim().startsWith('{')) {
          customHeaders = JSON.parse(wh.headers);
        }
      } catch {}

      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        session: sessionName,
        ...payload
      });

      const retries = Math.min(wh.retry_count || MAX_RETRIES, MAX_RETRIES);
      const timeoutMs = Math.min((wh.timeout || 30) * 1000, TIMEOUT_MS);

      // Fire and forget — attempt with retries in background
      (async () => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);

            const resp = await fetch(wh.url, {
              method: (wh.method || 'POST').toUpperCase(),
              headers: {
                'Content-Type': 'application/json',
                'X-WaCloud-Event': event,
                'X-WaCloud-Retry': String(attempt - 1),
                ...customHeaders
              },
              body,
              signal: ctrl.signal
            });

            clearTimeout(timer);

            if (resp.ok) {
              // Update hit counter on success
              await db.query(
                `UPDATE webhooks 
                 SET total_triggered = total_triggered + 1, 
                     received_count  = received_count  + 1,
                     last_triggered_at = NOW()
                 WHERE id = ?`,
                [wh.id]
              );
              break; // success — no more retries
            }

            // Non-2xx — retry
            if (attempt < retries) await sleep(1000 * attempt);

          } catch (err: any) {
            // Timeout or network error
            if (attempt < retries) await sleep(1000 * attempt);
          }
        }
      })();
    }
  } catch (err) {
    // Never crash the caller
    console.error('[Webhook] Dispatcher error:', err);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
