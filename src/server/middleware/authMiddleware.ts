
import { Request, Response, NextFunction } from 'express';
import db from '../lib/db';

export const checkBanStatus = async (req: Request, res: Response, next: NextFunction) => {
  // We expect the frontend to pass userId in the headers or body, 
  // but most routes already use userId from req.params or req.body.
  // For a robust system, we should extract it from a JWT, 
  // but for now let's use what the existing routes are using.
  
  const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId || (req.params?.userId && req.params?.userId !== 'undefined' ? req.params?.userId : null);

  if (!userId) {
    return next(); // If no userId, let the specific route handle it or pass through
  }

  try {
    const [rows] = await db.query('SELECT is_banned FROM profiles WHERE id = ?', [userId]);
    const profile = (rows as any[])[0];

    if (profile && profile.is_banned) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Your account is banned. Please contact support.',
        banned: true 
      });
    }

    next();
  } catch (err) {
    console.error('[Middleware] Ban check failed:', err);
    next(); // On DB error, we let them through to avoid lockout, or we could block.
  }
};

export const checkApiKey = async (req: Request, res: Response, next: NextFunction) => {
  // Support: API-Key, X-API-Key, Authorization: Bearer <key>, ?api_key=
  let apiKey: string | undefined =
    (req.headers['api-key'] as string) ||
    (req.headers['x-api-key'] as string) ||
    (req.query.api_key as string) ||
    (req.body?.api_key as string);

  // Also support Authorization: Bearer <key>
  if (!apiKey && req.headers['authorization']) {
    const auth = req.headers['authorization'] as string;
    if (auth.toLowerCase().startsWith('bearer ')) {
      apiKey = auth.slice(7).trim();
    }
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized', message: 'API Key is missing.' });
  }

  try {
    const [rows] = await db.query('SELECT id, is_banned FROM profiles WHERE api_key = ?', [apiKey]);
    const profile = (rows as any[])[0];

    if (!profile) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid API Key.' });
    }

    if (profile.is_banned) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Your account is banned. Please contact support.',
        banned: true 
      });
    }

    // Attach user information to request
    (req as any).user = { id: profile.id };
    next();
  } catch (err) {
    console.error('[Middleware] API Key check failed:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
