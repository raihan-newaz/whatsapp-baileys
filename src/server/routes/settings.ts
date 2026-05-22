import { Router, Request, Response } from 'express';
import db from '../lib/db';

const router = Router();

// GET /api/settings — Public/Authed settings for current app configuration
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT `key`, value FROM system_settings');
    const data = rows as any[];
    
    const settingsMap = data.reduce((acc: any, row: any) => {
      try {
        acc[row.key] = JSON.parse(row.value);
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});
    
    res.json({ settings: settingsMap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/:key — Fetch a specific public setting
router.get('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  try {
    const [rows] = await db.query('SELECT value FROM system_settings WHERE `key` = ?', [key]);
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Setting not found' });
    
    let value = row.value;
    try {
      value = JSON.parse(row.value);
    } catch {}

    res.json({ key, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
