import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';

import whatsappRouter from './routes/whatsapp';
import campaignRouter from './routes/campaigns';
import contactRouter from './routes/contacts';
import webhookRouter from './routes/webhooks';
import logRouter from './routes/logs';
import adminRouter from './routes/admin';
import inboxRouter from './routes/inbox';
import templateRouter from './routes/templates';
import groupRouter from './routes/groups';
import profileRouter from './routes/profiles';
import statsRouter from './routes/stats';
import analyticsRouter from './routes/analytics';
import settingsRouter from './routes/settings';
import mediaRouter from './routes/media';
import checkerRouter from './routes/checker';
import autoReplyRouter from './routes/autoReply';
import smsRouter from './routes/sms';
import notificationsRouter from './routes/notifications';
import authRouter from './routes/auth';
import { startQueueWorker } from './lib/queueWorker';
import { restoreSessions } from './lib/whatsappManager';
import apiRouter from './routes/api';

import { checkBanStatus } from './middleware/authMiddleware';

dotenv.config();

// Global stability handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

export let io: SocketIOServer;

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);

  io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(checkBanStatus);
  app.use('/uploads', express.static('uploads'));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/campaigns', campaignRouter);
  app.use('/api/contacts', contactRouter);
  app.use('/api/webhooks', webhookRouter);
  app.use('/api/logs', logRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/inbox', inboxRouter);
  app.use('/api/templates', templateRouter);
  app.use('/api/groups', groupRouter);
  app.use('/api/profiles', profileRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/checker', checkerRouter);
  app.use('/api/auto-reply', autoReplyRouter);
  app.use('/api/sms', smsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api', apiRouter);

  // All non-API requests are handled by Next.js
  app.all('/{*splat}', (req, res) => {
    return nextHandler(req, res);
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join personal user room for targeted notifications
    socket.on('join', (userId: string) => {
      socket.join(userId);
      console.log(`Client ${socket.id} joined room: ${userId}`);
    });

    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Unified Next.js + Express Server running on port ${PORT}`);
    startQueueWorker(5000); // Poll message queue every 5 seconds
    restoreSessions(); // Boot up WhatsApp sessions stored in DB
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err);
  process.exit(1);
});
