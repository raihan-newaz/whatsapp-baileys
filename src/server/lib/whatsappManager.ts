import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  proto,
  WAPresence,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { getIO } from '../index';
import db, { generateUUID } from './db';

const io = {
  to: (room: string) => ({
    emit: (event: string, ...args: any[]) => {
      const socketServer = getIO();
      if (socketServer) {
        socketServer.to(room).emit(event, ...args);
      } else {
        console.warn(`[Socket] Skipped emitting "${event}" to "${room}" - Socket.io not initialized yet`);
      }
    }
  })
};
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { Message } from './types';
import { processAutoReply } from './autoReplyWorker';
import { NotificationManager } from './notificationManager';
import aiManager from './aiManager';

// Set up logger for Baileys
const logger = pino({ level: 'silent' });

// Store active socket instances per session key (userId_sessionName)
const clients: Map<string, any> = new Map();

// Helper for wait
const wait = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

// Configure Web Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@globyn.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[WhatsApp] Web Push VAPID keys are missing. Push notifications will be disabled.');
}

/**
 * Normalizes JID to c.us format for the database to remain 100% compatible
 */
function normalizeToDbJid(jid: string): string {
  if (!jid) return '';
  // Group chats — preserve as-is
  if (jid.includes('@g.us')) return jid;
  // LID format
  if (jid.includes('@lid')) {
    const parts = jid.split('@');
    const user = parts[0].split(':')[0].replace(/[^0-9]/g, '');
    return `${user}@lid`;
  }
  // Strip domain if present
  const base = jid.includes('@') ? jid.split('@')[0] : jid;
  // Remove device suffix (:0, :1, etc.) and any non-digit chars (strips leading +)
  const user = base.split(':')[0].replace(/[^0-9]/g, '');
  return `${user}@c.us`;
}

/**
 * Normalizes JID to Baileys format for sending messages
 */
function normalizeToBaileysJid(jid: string): string {
  if (!jid) return '';
  let cleanJid = jid;
  if (jid.includes('@')) {
    const parts = jid.split('@');
    const user = parts[0].split(':')[0];
    const domain = parts[1];
    cleanJid = `${user}@${domain}`;
  } else {
    return `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  }

  if (cleanJid.includes('@c.us')) {
    return cleanJid.replace('@c.us', '@s.whatsapp.net');
  }
  if (cleanJid.includes('@lid')) {
    return cleanJid;
  }
  if (cleanJid.includes('@s.whatsapp.net')) {
    return cleanJid;
  }
  return cleanJid;
}

/**
 * Helper to get a descriptive preview of a message (handles media)
 */
function getMessagePreview(msg: any): string {
  const body = (msg.body || '').trim();
  const hasMedia = !!msg.media_url || !!msg.hasMedia;
  const type = msg.type || '';

  if (!hasMedia) return body || '';

  let prefix = '';
  if (type === 'image') prefix = '[Photo]';
  else if (type === 'video') prefix = '[Video]';
  else if (type === 'audio' || type === 'ptt') prefix = '[Audio]';
  else if (type === 'document') prefix = '[Document]';
  else if (type === 'sticker') prefix = '[Sticker]';
  else if (type === 'location') prefix = '[Location]';
  else if (type === 'vcard') prefix = '[Contact]';
  else prefix = '[Media]';

  return body ? `${prefix} ${body}` : prefix;
}

/**
 * Helper to save media to local storage
 */
async function saveLocalFile(buffer: Buffer, fileName: string, mimetype: string, folder: string = 'inbox'): Promise<string | null> {
  try {
    const uploadDir = path.join(__dirname, '../../uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const extension = mimetype.split('/')[1]?.split(';')[0] || 'bin';
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}.${extension}`;
    const filePath = path.join(uploadDir, safeFileName);
    
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${folder}/${safeFileName}`;
  } catch (err) {
    console.error('[WhatsApp] Failed to save local file:', err);
    return null;
  }
}

/**
 * Helper to extract message content from Baileys structure
 */
function extractMessageContent(msg: proto.IWebMessageInfo): { body: string; type: string; hasMedia: boolean } {
  if (!msg.message) return { body: '', type: 'chat', hasMedia: false };

  const messageContent = msg.message;
  
  // Unwrap ephemeral/view once messages
  let type = Object.keys(messageContent)[0];
  let messageBody: any = messageContent[type as keyof typeof messageContent];

  if (type === 'ephemeralMessage' || type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
    if (messageBody?.message) {
      type = Object.keys(messageBody.message)[0];
      messageBody = messageBody.message[type];
    }
  }

  let body = '';
  let hasMedia = false;
  let normalizedType = 'chat';

  if (type === 'conversation') {
    body = typeof messageBody === 'string' ? messageBody : (messageBody?.text || '');
    normalizedType = 'chat';
  } else if (type === 'extendedTextMessage') {
    body = messageBody?.text || '';
    normalizedType = 'chat';
  } else if (type === 'imageMessage') {
    body = messageBody?.caption || '';
    hasMedia = true;
    normalizedType = 'image';
  } else if (type === 'videoMessage') {
    body = messageBody?.caption || '';
    hasMedia = true;
    normalizedType = 'video';
  } else if (type === 'audioMessage') {
    hasMedia = true;
    normalizedType = 'audio';
  } else if (type === 'documentMessage') {
    body = messageBody?.title || messageBody?.fileName || '';
    hasMedia = true;
    normalizedType = 'document';
  } else if (type === 'stickerMessage') {
    hasMedia = true;
    normalizedType = 'sticker';
  } else if (type === 'locationMessage') {
    body = `Lat: ${messageBody?.degreesLatitude}, Lng: ${messageBody?.degreesLongitude}`;
    normalizedType = 'location';
  } else if (type === 'contactMessage') {
    body = messageBody?.displayName || '';
    normalizedType = 'vcard';
  } else if (type === 'contactsArrayMessage') {
    body = `${messageBody?.contacts?.length || 0} Contacts`;
    normalizedType = 'vcard';
  } else if (type === 'protocolMessage') {
    normalizedType = 'protocol';
  }

  return { body, type: normalizedType, hasMedia };
}

export function getClientKey(userId: string, sessionName: string = 'default') {
  return `${userId}_${sessionName}`;
}

export async function getSessionStatus(userId: string, sessionName: string = 'default') {
  try {
    const [rows]: any = await db.query('SELECT status FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?', [userId, sessionName]);
    if (rows && rows.length > 0) {
      return rows[0].status;
    }
  } catch (e) {
    console.error('[WhatsApp] Error fetching session status:', e);
  }
  return 'disconnected';
}

export async function getMessageStatus(userId: string, sessionName: string | undefined, messageId: string) {
  // Return the DB saved ack or default to 1 (sent)
  try {
    const [rows]: any = await db.query('SELECT ack FROM whatsapp_messages WHERE wid = ?', [messageId]);
    if (rows && rows[0]) return rows[0].ack;
  } catch (e) {}
  return null;
}

// Automatically restore previously connected sessions when the server starts
export async function restoreSessions() {
  console.log('[WhatsApp] Restoring previous active sessions with Baileys...');
  try {
    const [sessions] = await db.query('SELECT * FROM whatsapp_sessions WHERE status IN (?, ?)', ['connected', 'pending']);
    const rows = sessions as any[];
    if (!rows || rows.length === 0) return;

    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      console.log(`[WhatsApp] Restoring session (${i + 1}/${rows.length}): ${s.user_id} - ${s.session_name}`);
      
      createWhatsAppSession(s.user_id, s.id, s.session_name).catch(err => {
        console.error(`[WhatsApp] Failed to restore session ${s.session_name}:`, err);
      });

      if (i < rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  } catch (err) {
    console.error('[WhatsApp] Failed to restore sessions:', err);
  }
}

async function shouldSyncContacts(userId: string, sessionName: string): Promise<boolean> {
  try {
    const [rows] = await db.query(
      'SELECT device_info FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?',
      [userId, sessionName]
    );
    const row = (rows as any[])[0];
    if (!row || !row.device_info) return false;
    
    let info = row.device_info;
    if (typeof info === 'string') {
      try { info = JSON.parse(info); } catch (e) { return false; }
    }
    return !!info?.syncContacts;
  } catch (err) {
    console.error('[WhatsApp Sync] Failed to check syncContacts setting:', err);
    return false;
  }
}

async function syncContactsToDb(userId: string, sessionName: string, contactsList: any[]) {
  const isEnabled = await shouldSyncContacts(userId, sessionName);
  if (!isEnabled) return;
  
  if (!contactsList || contactsList.length === 0) return;
  
  console.log(`[WhatsApp Sync] Syncing ${contactsList.length} contacts for user ${userId}...`);
  
  for (const c of contactsList) {
    const jid = c.id;
    if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;
    
    const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
    if (!phone) continue;
    
    const name = c.name || c.verifiedName || c.notify || phone;
    
    try {
      const id = generateUUID();
      await db.query(
        `INSERT INTO contacts (id, user_id, name, phone, tags) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = IF(name IS NULL OR name = '' OR name = ? OR name = 'Unknown', VALUES(name), name)`,
        [id, userId, name, phone, JSON.stringify(['whatsapp']), phone]
      );
    } catch (err) {
      console.warn(`[WhatsApp Sync] Failed to sync contact ${jid}:`, err);
    }
  }
}

export async function createWhatsAppSession(
  userId: string,
  sessionId: string,
  sessionName: string = 'default'
): Promise<void> {
  const key = getClientKey(userId, sessionName);
  const dataPath = path.join(process.cwd(), 'wa_sessions');
  const sessionDir = path.join(dataPath, `session-${sessionId}`);

  // Create session directory if it doesn't exist
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Cleanup existing memory instance if exists
  if (clients.has(key)) {
    console.log(`[WhatsApp] Cleaning up active instance for ${key}`);
    const oldSock = clients.get(key);
    try { oldSock.ev.removeAllListeners('connection.update'); oldSock.end(); } catch (e) {}
    clients.delete(key);
  }

  console.log(`[WhatsApp] Initializing Baileys connection for ${key}...`);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  let version: [number, number, number] = [6, 33, 0];
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
  } catch (e) {
    console.warn(`[WhatsApp] Failed to fetch latest Baileys version, using default [${version.join('.')}]:`, e);
  }

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS('Desktop'),
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    syncFullHistory: true,
    shouldSyncHistoryMessage: () => true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[WhatsApp] New QR code generated for ${key}`);
      io.to(userId).emit('wa:qr', { qr, sessionName });
      await db.query('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', ['pending', sessionId]);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`[WhatsApp] Connection closed for ${key}. Reason: ${statusCode}, Reconnecting: ${shouldReconnect}`);
      
      if (shouldReconnect) {
        // Stagger reconnect
        setTimeout(() => {
          createWhatsAppSession(userId, sessionId, sessionName).catch(err => {
            console.error(`[WhatsApp] Reconnect failed for ${key}:`, err);
          });
        }, 5000);
      } else {
        // Logged out
        io.to(userId).emit('wa:status', { status: 'disconnected', reason: 'Logged out', sessionName });
        clients.delete(key);
        await db.query('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', ['disconnected', sessionId]);
        await NotificationManager.notifySessionDisconnected(userId, sessionName, 'Logged out');
      }
    } else if (connection === 'open') {
      console.log(`[WhatsApp] Connection successfully established for ${key}`);
      const me = sock.user;
      const phone = me?.id.split(':')[0] || '';

      let currentDeviceInfo = {};
      try {
        const [rows]: any = await db.query('SELECT device_info FROM whatsapp_sessions WHERE id = ?', [sessionId]);
        if (rows.length > 0 && rows[0].device_info) {
          const rawInfo = rows[0].device_info;
          if (typeof rawInfo === 'string') {
            currentDeviceInfo = JSON.parse(rawInfo);
          } else if (typeof rawInfo === 'object') {
            currentDeviceInfo = rawInfo;
          }
        }
      } catch (e) {}

      let profilePicUrl = null;
      try {
        profilePicUrl = await sock.profilePictureUrl(me?.id || '', 'image').catch(() => null);
      } catch (e) {}

      const deviceInfo = {
        ...currentDeviceInfo,
        pushname: me?.name || 'Baileys Multi-Device',
        platform: 'WhatsApp Baileys Connection',
        whatsapp_version: version.join('.'),
        profile_pic: profilePicUrl
      };

      io.to(userId).emit('wa:status', { 
        status: 'connected', 
        phone, 
        sessionName,
        deviceInfo
      });

      await db.query(
        'UPDATE whatsapp_sessions SET status = ?, phone_number = ?, device_info = ?, last_active_at = ? WHERE id = ?',
        ['connected', phone, JSON.stringify(deviceInfo), new Date(), sessionId]
      );

      await NotificationManager.notifySessionConnected(userId, sessionName);
    }
  });

  // Handle message updates (ACK/seen ticks)
  sock.ev.on('messages.update', async (updates) => {
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
    for (const update of updates) {
      if (update.update.status) {
        const messageWid = update.key.id;
        const statusVal = update.update.status;
        
        // Map Baileys status to common format
        // Baileys message statuses: 
        // 1=pending, 2=sent, 3=delivered, 4=read, 5=played
        let ackVal = 0;
        let status = 'sent';
        
        if (statusVal === 2) { ackVal = 1; status = 'sent'; }
        else if (statusVal === 3) { ackVal = 2; status = 'delivered'; }
        else if (statusVal >= 4) { ackVal = 3; status = 'read'; }

        if (ackVal === 0) continue;

        try {
          const deliveredAt = ackVal >= 2 ? ts : null;
          const readAt = ackVal >= 3 ? ts : null;

          // Update message_logs
          await db.query(
            'UPDATE message_logs SET status = ?, ack = ?, delivered_at = IFNULL(?, delivered_at), read_at = IFNULL(?, read_at) WHERE message_id = ? AND IFNULL(ack, 0) < ?',
            [status, ackVal, deliveredAt, readAt, messageWid, ackVal]
          );

          // Update whatsapp_messages (ack + status + timestamp columns)
          await db.query(
            'UPDATE whatsapp_messages SET ack = ?, status = ?, delivered_at = IFNULL(?, delivered_at), read_at = IFNULL(?, read_at) WHERE wid = ? AND IFNULL(ack, 0) < ?',
            [ackVal, status, deliveredAt, readAt, messageWid, ackVal]
          );

          // Emit to frontend
          io.to(userId).emit('wa:message_ack', {
            sessionName,
            messageWid,
            ack: ackVal,
            status
          });

          // Send Webhook Delivery Tracking if webhook_url exists for this message
          const [msgLogs]: any = await db.query('SELECT webhook_url FROM message_logs WHERE message_id = ?', [messageWid]);
          if (msgLogs && msgLogs.length > 0 && msgLogs[0].webhook_url) {
            const webhookUrl = msgLogs[0].webhook_url;
            const [profileRows]: any = await db.query('SELECT api_key FROM profiles WHERE id = ?', [userId]);
            const userApiKey = profileRows && profileRows.length > 0 ? profileRows[0].api_key : '';

            if (userApiKey) {
              const payload = JSON.stringify({
                message_id: messageWid,
                status: status,
                timestamp: ts
              });

              const crypto = await import('crypto');
              const signature = crypto.createHmac('sha256', userApiKey).update(payload).digest('hex');

              fetch(webhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x_wacloud_signature': signature
                },
                body: payload
              }).catch(err => {
                console.error('[Webhook] Failed to send delivery webhook:', err.message);
              });
            }
          }

        } catch (e) {
          console.error('[WhatsApp] Failed to update message ACK:', e);
        }
      }
    }
  });

  sock.ev.on('contacts.upsert', async (contacts) => {
    syncContactsToDb(userId, sessionName, contacts).catch(err => {
      console.error('[WhatsApp Sync] Failed to sync contacts on upsert:', err);
    });
  });

  sock.ev.on('contacts.update', async (updates) => {
    syncContactsToDb(userId, sessionName, updates).catch(err => {
      console.error('[WhatsApp Sync] Failed to sync contacts on update:', err);
    });
  });

  sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
    console.log(`[WhatsApp] Syncing history for ${key}: ${messages.length} messages, ${chats.length} chats, ${contacts?.length || 0} contacts`);
    try {
      if (contacts && contacts.length > 0) {
        syncContactsToDb(userId, sessionName, contacts).catch(err => {
          console.error('[WhatsApp Sync] Failed to sync contacts from history:', err);
        });
      }
      // 1. First sync all chats from the chats list
      for (const chat of chats) {
        const jid = chat.id;
        if (!jid || jid === 'status@broadcast') continue;
        const dbJid = normalizeToDbJid(jid);

        // Try to find a display name from the contacts array
        const contact = contacts?.find((c: any) => c.id === jid);
        const chatName = contact?.name || contact?.verifiedName || contact?.notify || chat.name || jid.split('@')[0];

        const timestamp = chat.conversationTimestamp 
          ? new Date(Number(chat.conversationTimestamp) * 1000).toISOString().slice(0, 19).replace('T', ' ')
          : new Date().toISOString().slice(0, 19).replace('T', ' ');

        const [existingChats] = await db.query(
          'SELECT id FROM whatsapp_chats WHERE user_id = ? AND session_name = ? AND wid = ?', 
          [userId, sessionName, dbJid]
        );

        if ((existingChats as any[]).length === 0) {
          await db.query(
            'INSERT IGNORE INTO whatsapp_chats (id, user_id, session_name, wid, name, last_message, last_message_at, unread_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), userId, sessionName, dbJid, chatName, 'History synced chat', timestamp, chat.unreadCount || 0]
          );
        } else {
          // Update chat name and unread count
          await db.query(
            'UPDATE whatsapp_chats SET name = ?, unread_count = ? WHERE user_id = ? AND session_name = ? AND wid = ?',
            [chatName, chat.unreadCount || 0, userId, sessionName, dbJid]
          );
        }
      }

      // 2. Insert synced messages
      for (const msg of messages) {
        if (!msg.message) continue;
        const jid = msg.key.remoteJid;
        if (!jid || jid === 'status@broadcast') continue;

        const isFromMe = msg.key.fromMe || false;
        const { body, type, hasMedia } = extractMessageContent(msg);
        if (!body && !hasMedia) continue;
        
        const timestamp = new Date((msg.messageTimestamp as number) * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const messageWid = msg.key.id || '';
        const dbJid = normalizeToDbJid(jid);
        
        const contact = contacts?.find((c: any) => c.id === jid);
        const chatName = contact?.name || contact?.verifiedName || contact?.notify || msg.pushName || jid.split('@')[0];

        let chatId = generateUUID();
        const [existingChats] = await db.query(
          'SELECT id, name FROM whatsapp_chats WHERE user_id = ? AND session_name = ? AND wid = ?', 
          [userId, sessionName, dbJid]
        );

        const previewText = getMessagePreview({ body, type });

        if ((existingChats as any[]).length === 0) {
          await db.query(
            'INSERT IGNORE INTO whatsapp_chats (id, user_id, session_name, wid, name, last_message, last_message_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [chatId, userId, sessionName, dbJid, chatName, previewText, timestamp]
          );
        } else {
          chatId = (existingChats as any[])[0].id;
          await db.query(
            'UPDATE whatsapp_chats SET last_message = ?, last_message_at = ? WHERE id = ?',
            [previewText, timestamp, chatId]
          );
        }

        await db.query(
          'INSERT IGNORE INTO whatsapp_messages (id, user_id, session_name, chat_id, wid, `from`, `to`, body, type, is_from_me, timestamp, media_url, media_type, ack) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            generateUUID(), 
            userId, 
            sessionName, 
            chatId, 
            messageWid, 
            isFromMe ? 'me' : jid, 
            isFromMe ? jid : 'me', 
            body || '', 
            type, 
            isFromMe ? 1 : 0, 
            new Date(timestamp), 
            null,
            hasMedia ? type : null,
            isFromMe ? 1 : 0
          ]
        );
      }
    } catch (e) {
      console.error('[WhatsApp] History sync failed:', e);
    }
  });

  // Process incoming/outgoing messages
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      try {
        if (!msg.message) continue;
        const jid = msg.key.remoteJid;
        if (!jid || jid === 'status@broadcast') continue;

        const isFromMe = msg.key.fromMe || false;
        const { body, type, hasMedia } = extractMessageContent(msg);
        const timestamp = new Date((msg.messageTimestamp as number) * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const messageWid = msg.key.id || '';

        console.log(`[WhatsApp] Baileys incoming message: ${messageWid}, fromMe: ${isFromMe}, body: "${body.substring(0, 20)}..."`);

        let mediaUrl = null;
        let filename = null;

        // Media download logic
        if (hasMedia) {
          try {
            // Check if we already have it in DB
            const [existing] = await db.query('SELECT media_url, filename FROM whatsapp_messages WHERE wid = ?', [messageWid]);
            const existingMsg = (existing as any[])[0];

            if (existingMsg?.media_url) {
              mediaUrl = existingMsg.media_url;
              filename = existingMsg.filename;
            } else {
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger } as any) as Buffer;
              if (buffer) {
                const messageType = Object.keys(msg.message)[0];
                const mediaMessage = (msg.message as any)[messageType];
                filename = mediaMessage?.fileName || `${messageWid}`;
                mediaUrl = await saveLocalFile(buffer, filename, mediaMessage?.mimetype || 'application/octet-stream');
              }
            }
          } catch (mediaErr) {
            console.error('[WhatsApp] Media download failed via Baileys:', mediaErr);
          }
        }

        const dbJid = normalizeToDbJid(jid);
        const chatName = msg.pushName || jid.split('@')[0];

        // 1. Upsert Chat
        let chatId = generateUUID();
        try {
          const [existingChats] = await db.query(
            'SELECT id FROM whatsapp_chats WHERE user_id = ? AND session_name = ? AND wid = ?',
            [userId, sessionName, dbJid]
          );
          const existingChat = (existingChats as any[])[0];
          
          if (!existingChat) {
            await db.query(
              'INSERT INTO whatsapp_chats (id, user_id, session_name, wid, name, last_message, last_message_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [chatId, userId, sessionName, dbJid, chatName, getMessagePreview({ body, media_url: mediaUrl, type }), timestamp]
            );
          } else {
            chatId = existingChat.id;
            await db.query(
              'UPDATE whatsapp_chats SET name = ?, last_message = ?, last_message_at = ? WHERE id = ?',
              [chatName, getMessagePreview({ body, media_url: mediaUrl, type }), timestamp, chatId]
            );
          }

          // 2. Insert Message
          const localMessageId = generateUUID();
          await db.query(
            'INSERT INTO whatsapp_messages (id, user_id, session_name, chat_id, wid, `from`, `to`, body, type, timestamp, is_from_me, media_url, media_type, filename) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE body = VALUES(body), media_url = VALUES(media_url)',
            [localMessageId, userId, sessionName, chatId, messageWid, isFromMe ? 'me' : jid, isFromMe ? jid : 'me', body, type, timestamp, isFromMe, mediaUrl, type, filename]
          );

          // 3. Emit live update to Frontend
          io.to(userId).emit('wa:new_message', {
            sessionName,
            chat: { id: chatId, name: chatName, wid: dbJid, last_message: body, last_message_at: timestamp },
            message: {
              id: localMessageId,
              wid: messageWid,
              body,
              from: isFromMe ? 'me' : jid,
              is_from_me: isFromMe,
              timestamp,
              media_url: mediaUrl,
              media_type: type,
              filename,
              ack: isFromMe ? 1 : 0
            }
          });
        } catch (dbErr) {
          console.error('[WhatsApp] DB insert failed:', dbErr);
        }

        // 4. Web Push Notifications
        try {
          const [profileRows]: any = await db.query('SELECT notification_settings FROM profiles WHERE id = ?', [userId]);
          const profile = profileRows[0];
          const settings = typeof profile?.notification_settings === 'string' 
            ? JSON.parse(profile.notification_settings) 
            : profile?.notification_settings;

          if (settings?.push && settings?.messages !== false && !isFromMe) {
            const [subs]: any = await db.query('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
            if (subs.length > 0) {
              const payload = JSON.stringify({
                title: chatName,
                body: body || 'New message',
                icon: '/icon-192x192.png',
                data: { url: '/dashboard/inbox' }
              });

              for (const sub of subs) {
                try {
                  const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                  };
                  await webpush.sendNotification(pushConfig, payload);
                } catch (pushErr: any) {
                  if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                    await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                  }
                }
              }
            }
          }
        } catch (e) {}

        // 5. Trigger Auto-Replies
        const ruleMatched = await processAutoReply(
          userId,
          sessionName,
          { fromMe: isFromMe, body, from: jid },
          sendMessage
        );

        // 6. Trigger AI Smart Reply
        if (!isFromMe && !ruleMatched) {
          try {
            const [sessRows]: any = await db.query(
              'SELECT ai_enabled, ai_provider, ai_api_key, ai_prompt, ai_model, ai_reply_delay FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?',
              [userId, sessionName]
            );
            const sessionObj = sessRows[0];

            if (sessionObj?.ai_enabled && sessionObj?.ai_api_key) {
              const aiResponse = await aiManager.getResponse(body, {
                provider: sessionObj.ai_provider,
                apiKey: sessionObj.ai_api_key,
                prompt: sessionObj.ai_prompt,
                model: sessionObj.ai_model
              });

              if (aiResponse) {
                if (sessionObj.ai_reply_delay && sessionObj.ai_reply_delay > 0) {
                  await wait(sessionObj.ai_reply_delay);
                }
                await sendMessage(userId, sessionName, jid, aiResponse);
              }
            }
          } catch (aiErr) {
            console.error('[WhatsApp] AI Smart Reply failed:', aiErr);
          }
        }
      } catch (e) {
        console.error('[WhatsApp] Messages.upsert processing failed:', e);
      }
    }
  });

  clients.set(key, sock);
}

export async function disconnectSession(userId: string, sessionName: string = 'default') {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  if (sock) {
    console.log(`[WhatsApp] Disconnecting Baileys for ${key}`);
    try { sock.ev.removeAllListeners('connection.update'); sock.end(); } catch (e) {}
    clients.delete(key);
  }
}

export async function logoutSession(userId: string, sessionName: string = 'default') {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  
  if (sock) {
    console.log(`[WhatsApp] Logging out Baileys session for ${key}`);
    try {
      await sock.logout();
      sock.end();
    } catch (err) {}
    clients.delete(key);
  }

  // Clear directory
  try {
    const [rows]: any = await db.query('SELECT id FROM whatsapp_sessions WHERE user_id = ? AND session_name = ?', [userId, sessionName]);
    if (rows.length > 0) {
      const sessionId = rows[0].id;
      const sessionDir = path.join(process.cwd(), 'wa_sessions', `session-${sessionId}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`[WhatsApp] Deleted session auth folder: ${sessionDir}`);
      }
    }
  } catch (err) {}
}

export async function sendMessage(
  userId: string,
  sessionName: string,
  phone: string,
  message: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<string> {
  // Check user subscription validity
  const [profileRows]: any = await db.query('SELECT plan, plan_expires_at FROM profiles WHERE id = ?', [userId]);
  const profile = profileRows[0];
  if (profile) {
    const plan = profile.plan ? profile.plan.toLowerCase() : '';
    const isUnlimited = plan === 'admin' || !profile.plan_expires_at;
    if (!isUnlimited) {
      const expiry = new Date(profile.plan_expires_at);
      if (expiry.getTime() < Date.now()) {
        throw new Error('Your subscription has expired. Please renew your plan.');
      }
    }
  }

  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  if (!sock) throw new Error('WhatsApp session not found or not connected');

  const formattedJid = normalizeToBaileysJid(phone);

  let sentMsg;
  if (mediaUrl) {
    try {
      // Download media buffer
      const response = await fetch(mediaUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const mimetype = response.headers.get('content-type') || 'application/octet-stream';

      if (mimetype.includes('image')) {
        sentMsg = await sock.sendMessage(formattedJid, { image: buffer, caption: message || undefined });
      } else if (mimetype.includes('video')) {
        sentMsg = await sock.sendMessage(formattedJid, { video: buffer, caption: message || undefined });
      } else if (mimetype.includes('audio')) {
        sentMsg = await sock.sendMessage(formattedJid, { audio: buffer, mimetype, ptt: mediaType === 'ptt' });
      } else {
        sentMsg = await sock.sendMessage(formattedJid, { document: buffer, mimetype, fileName: mediaUrl.split('/').pop() || 'file', caption: message || undefined });
      }
    } catch (mediaErr) {
      console.error(`[WhatsApp] Failed to send Baileys media, fallback to text:`, mediaErr);
      sentMsg = await sock.sendMessage(formattedJid, { text: message || '' });
    }
  } else {
    sentMsg = await sock.sendMessage(formattedJid, { text: message || '' });
  }

  // Directly insert the sent message to the local DB so it appears instantly on the UI
  try {
    const dbJid = normalizeToDbJid(phone);
    const messageWid = sentMsg?.key.id || '';
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const preview = getMessagePreview({ body: message, media_url: mediaUrl, type: mediaType });
    const defaultChatName = dbJid.split('@')[0];

    // Use INSERT ... ON DUPLICATE KEY UPDATE so same phone number ALWAYS maps to
    // the same chat row, regardless of which page the message was sent from.
    const newChatId = generateUUID();
    await db.query(
      `INSERT INTO whatsapp_chats (id, user_id, session_name, wid, name, last_message, last_message_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE last_message = VALUES(last_message), last_message_at = VALUES(last_message_at)`,
      [newChatId, userId, sessionName, dbJid, defaultChatName, preview, timestamp]
    );

    // Now fetch the definitive chatId (may be the existing one if a duplicate was found)
    const [existingChats] = await db.query(
      'SELECT id, name FROM whatsapp_chats WHERE user_id = ? AND session_name = ? AND wid = ?',
      [userId, sessionName, dbJid]
    );
    const existingChat = (existingChats as any[])[0];
    let chatId = existingChat?.id || newChatId;
    let chatName = existingChat?.name || defaultChatName;

    const localMessageId = generateUUID();
    await db.query(
      'INSERT INTO whatsapp_messages (id, user_id, session_name, chat_id, wid, `from`, `to`, body, type, timestamp, is_from_me, media_url, media_type, filename, ack, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE body = VALUES(body), media_url = VALUES(media_url)',
      [
        localMessageId, 
        userId, 
        sessionName, 
        chatId, 
        messageWid, 
        'me', 
        dbJid, 
        message || '', 
        mediaType || 'chat', 
        new Date(timestamp), 
        1, 
        mediaUrl || null, 
        mediaType || 'chat', 
        mediaUrl ? mediaUrl.split('/').pop() || 'file' : null,
        1,
        'sent'
      ]
    );

    // Emit live update to Frontend so it updates the active chat list and scroll area
    io.to(userId).emit('wa:new_message', {
      sessionName,
      chat: { id: chatId, name: chatName, wid: dbJid, last_message: preview, last_message_at: timestamp },
      message: {
        id: localMessageId,
        wid: messageWid,
        body: message,
        from: 'me',
        is_from_me: true,
        timestamp,
        media_url: mediaUrl || null,
        media_type: mediaType || 'chat',
        filename: mediaUrl ? mediaUrl.split('/').pop() || 'file' : null,
        ack: 1,
        status: 'sent'
      }
    });

  } catch (dbErr) {
    console.error('[WhatsApp] Failed to save sent message to DB:', dbErr);
  }

  return sentMsg?.key.id || '';
}



export async function deleteMessage(userId: string, msgId: string, type: 'inbox' | 'logs') {
  const table = type === 'inbox' ? 'whatsapp_messages' : 'message_logs';
  
  // Get media info to clean up local storage
  const [msgs] = await db.query(`SELECT media_url FROM ${table} WHERE id = ? AND user_id = ?`, [msgId, userId]);
  const msg = (msgs as Message[])[0];

  if (msg?.media_url) {
    try {
      const urlParts = msg.media_url.split('/uploads/');
      if (urlParts.length > 1) {
        const filePath = path.join(__dirname, '../../uploads', urlParts[1]);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {}
  }

  await db.query(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [msgId, userId]);
  return { success: true };
}

export async function getJoinedGroups(userId: string, sessionName: string = 'default') {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  
  if (!sock) throw new Error('WhatsApp session not connected (Client missing)');

  try {
    const list = await sock.groupFetchAllParticipating();
    const groups = Object.values(list).map((g: any) => ({
      id: g.id,
      name: g.subject,
      participants_count: g.participants?.length || 0,
      timestamp: g.creation || 0,
    }));
    return groups;
  } catch (e) {
    console.error('[WhatsApp] Failed to fetch groups via Baileys:', e);
    return [];
  }
}

export async function extractGroupMembers(userId: string, sessionName: string = 'default', groupId: string) {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  
  if (!sock) throw new Error('WhatsApp session not connected (Client missing)');

  try {
    const metadata = await sock.groupMetadata(groupId);
    const members = (metadata.participants || []).map((p: any) => ({
      phone: p.id.split('@')[0],
      wid: p.id,
      name: p.id.split('@')[0], // Baileys doesn't sync names for all participants on groupMetadata, defaults to number
      isAdmin: p.admin === 'admin' || p.admin === 'superadmin' || false
    }));

    return {
      groupName: metadata.subject,
      groupId: metadata.id,
      members
    };
  } catch (e: any) {
    throw new Error('Failed to extract group members: ' + e.message);
  }
}

export async function isNumberRegistered(userId: string, sessionName: string = 'default', phone: string): Promise<boolean> {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  
  if (!sock) throw new Error('WhatsApp session not connected');

  try {
    const formatted = normalizeToBaileysJid(phone);
    const [result] = await sock.onWhatsApp(formatted);
    return !!result?.exists;
  } catch (e) {
    return false;
  }
}

export async function syncRecentChats(userId: string, sessionName: string) {
  try {
    const [rows]: any = await db.query(
      'SELECT COUNT(*) as count FROM whatsapp_chats WHERE user_id = ? AND session_name = ?',
      [userId, sessionName]
    );
    return { success: true, count: rows[0]?.count || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAggressiveProfilePic(client: any, jid: string): Promise<{ profilePicUrl: string | null, privacy: boolean }> {
  try {
    const formatted = normalizeToBaileysJid(jid);
    const profilePicUrl = await client.profilePictureUrl(formatted, 'image');
    return { profilePicUrl, privacy: false };
  } catch (e) {
    return { profilePicUrl: null, privacy: true };
  }
}

export async function checkNumberWithProfile(userId: string, sessionName: string, phone: string) {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  
  if (!sock) throw new Error('WhatsApp session not connected');

  const formatted = normalizeToBaileysJid(phone);
  const [result] = await sock.onWhatsApp(formatted);
  const isValid = !!result?.exists;

  let profilePicUrl = null;
  if (isValid) {
    profilePicUrl = await sock.profilePictureUrl(formatted, 'image').catch(() => null);
  }

  return { isValid, profilePicUrl };
}

export async function refreshProfilePic(userId: string, sessionName: string) {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  if (!sock) throw new Error('WhatsApp session not connected');

  const meJid = sock.user?.id;
  if (!meJid) throw new Error('User not found');

  const profilePicUrl = await sock.profilePictureUrl(meJid, 'image').catch(() => null);
  
  return { profile_pic: profilePicUrl, device_info: { profile_pic: profilePicUrl } };
}

// ==================== INBOX FEATURE FUNCTIONS ====================

export async function deleteMessageForEveryone(
  userId: string,
  sessionName: string,
  chatId: string,
  messageId: string
) {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  if (!sock) throw new Error('Client not connected');

  // Fetch chat JID
  const [[chatRow]]: any = await db.query('SELECT wid FROM whatsapp_chats WHERE id = ?', [chatId]);
  if (!chatRow?.wid) throw new Error('Chat not found');

  // Fetch message WID
  const [[msgRow]]: any = await db.query('SELECT wid FROM whatsapp_messages WHERE id = ?', [messageId]);
  if (!msgRow?.wid) throw new Error('Message not found');

  const targetJid = normalizeToBaileysJid(chatRow.wid);

  try {
    await sock.sendMessage(targetJid, {
      delete: {
        remoteJid: targetJid,
        fromMe: true, // Baileys requires fromMe true/false based on who sent it
        id: msgRow.wid
      }
    });

    await db.query('UPDATE whatsapp_messages SET is_deleted = 1 WHERE id = ?', [messageId]);
    await db.query('UPDATE message_logs SET status = ? WHERE message_id = ?', ['deleted', messageId]);

    return { success: true };
  } catch (e: any) {
    console.error('[WhatsApp] deleteMessageForEveryone failed:', e);
    throw e;
  }
}

export async function reactToMessage(
  userId: string,
  sessionName: string,
  messageWid: string,
  emoji: string
) {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  if (!sock) throw new Error('Client not connected');

  try {
    // Get sender info from database to determine remote JID
    const [[msg]]: any = await db.query('SELECT `from`, `to` FROM whatsapp_messages WHERE wid = ?', [messageWid]);
    if (!msg) throw new Error('Message JID not resolved from DB');

    const chatJid = normalizeToBaileysJid(msg.from === 'me' ? msg.to : msg.from);

    await sock.sendMessage(chatJid, {
      react: {
        text: emoji,
        key: {
          remoteJid: chatJid,
          fromMe: msg.from === 'me',
          id: messageWid
        }
      }
    });

    return { success: true };
  } catch (e: any) {
    console.error('[WhatsApp] React message failed:', e);
    throw e;
  }
}

export async function sendLocation(
  userId: string,
  sessionName: string,
  chatId: string,
  latitude: number,
  longitude: number,
  description?: string
) {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  if (!sock) throw new Error('Client not connected');

  const [[chatRow]]: any = await db.query('SELECT wid FROM whatsapp_chats WHERE id = ?', [chatId]);
  if (!chatRow?.wid) throw new Error('Chat not found');

  const targetJid = normalizeToBaileysJid(chatRow.wid);

  try {
    const sent = await sock.sendMessage(targetJid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        comment: description || ''
      }
    });

    return { id: sent?.key.id || '' };
  } catch (e: any) {
    console.error('[WhatsApp] sendLocation failed:', e);
    throw e;
  }
}

export async function sendContactCard(
  userId: string,
  sessionName: string,
  chatId: string,
  name: string,
  number: string
) {
  const key = getClientKey(userId, sessionName);
  const sock = clients.get(key);
  if (!sock) throw new Error('Client not connected');

  const [[chatRow]]: any = await db.query('SELECT wid FROM whatsapp_chats WHERE id = ?', [chatId]);
  if (!chatRow?.wid) throw new Error('Chat not found');

  const targetJid = normalizeToBaileysJid(chatRow.wid);

  try {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${number.replace(/[^0-9]/g, '')}:${number}\nEND:VCARD`;
    const sent = await sock.sendMessage(targetJid, {
      contacts: {
        displayName: name,
        contacts: [{ vcard }]
      }
    });

    return { id: sent?.key.id || '' };
  } catch (e: any) {
    console.error('[WhatsApp] sendContactCard failed:', e);
    throw e;
  }
}

export async function syncChatMessagesLive(userId: string, sessionName: string, chatWid: string, dbChatId: string) {
  // Live sync of chat histories is done automatically on Baileys startup.
  return [];
}