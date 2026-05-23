import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../lib/db';
import { sendMessage, syncRecentChats, deleteMessage, syncChatMessagesLive } from '../lib/whatsappManager';

const router = Router();

// Multer configuration for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/inbox');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({ storage });

// POST /api/inbox/upload — Handle file uploads
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const fileUrl = `/uploads/inbox/${req.file.filename}`;
  
  res.json({ success: true, url: fileUrl, filename: req.file.originalname });
});

// POST /api/inbox/sync-history
router.post('/sync-history', async (req: Request, res: Response) => {
  const { userId, sessionName } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const result = await syncRecentChats(userId, sessionName || 'default');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inbox/chats
router.get('/chats', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default' } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM whatsapp_chats WHERE user_id = ? AND session_name = ? ORDER BY last_message_at DESC',
      [userId, sessionName]
    );
    res.json({ success: true, chats: rows || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inbox/messages/:chatId
router.get('/messages/:chatId', async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId, before, limit = 20 } = req.query;

  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    let query = 'SELECT * FROM whatsapp_messages WHERE chat_id = ? AND user_id = ?';
    const params: any[] = [chatId, userId];

    if (before) {
      query += ' AND timestamp < ?';
      params.push(before);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await db.query(query, params);
    
    // We want them ASC for the frontend to render correctly
    const messages = (rows as any[]).reverse();
    
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/send
router.post('/send', async (req: Request, res: Response) => {
  const { userId, sessionName, chatId, message, mediaUrl, mediaType } = req.body;
  if (!userId || !chatId || (!message && !mediaUrl)) return res.status(400).json({ error: 'Missing fields' });

  try {
    // Get chat details (wid)
    const [rows] = await db.query('SELECT wid FROM whatsapp_chats WHERE id = ?', [chatId]);
    const chat = (rows as any[])[0];

    if (!chat) throw new Error('Chat not found');

    const msgId = await sendMessage(userId, sessionName || 'default', chat.wid, message, mediaUrl, mediaType);
    res.json({ success: true, msgId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inbox/messages/:messageId
router.delete('/messages/:messageId', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const result = await deleteMessage(userId as string, messageId as string, 'inbox');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// ==================== NEW OPENWA ENGINE APIs ====================

// POST /api/inbox/react
router.post('/react', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default', messageId, emoji } = req.body;
  if (!userId || !messageId || !emoji) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { reactToMessage } = require('../lib/whatsappManager');
    await reactToMessage(userId, sessionName, messageId, emoji);
    
    // Update local DB
    await db.query('UPDATE whatsapp_messages SET has_reaction = 1 WHERE id = ?', [messageId]);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/delete-for-everyone
router.post('/delete-for-everyone', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default', chatId, messageId } = req.body;
  if (!userId || !chatId || !messageId) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { deleteMessageForEveryone } = require('../lib/whatsappManager');
    await deleteMessageForEveryone(userId, sessionName, chatId, messageId);
    
    // Update local DB
    await db.query('UPDATE whatsapp_messages SET is_deleted = 1 WHERE id = ?', [messageId]);
    await db.query('UPDATE message_logs SET status = ? WHERE message_id = ?', ['deleted', messageId]);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/location
router.post('/location', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default', chatId, latitude, longitude, description } = req.body;
  if (!userId || !chatId || !latitude || !longitude) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { sendLocation } = require('../lib/whatsappManager');
    const msg = await sendLocation(userId, sessionName, chatId, latitude, longitude, description);
    
    res.json({ success: true, messageId: msg.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/contact
router.post('/contact', async (req: Request, res: Response) => {
  const { userId, sessionName = 'default', chatId, name, number } = req.body;
  if (!userId || !chatId || !name || !number) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { sendContactCard } = require('../lib/whatsappManager');
    const msg = await sendContactCard(userId, sessionName, chatId, name, number);
    
    res.json({ success: true, messageId: msg.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
