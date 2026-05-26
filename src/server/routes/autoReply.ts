import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';

const router = Router();

// GET /api/auto-reply/:userId — List all rules for a user
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { search, session_id, status } = req.query;

  try {
    let sql = 'SELECT * FROM auto_reply_rules WHERE user_id = ?';
    const params: any[] = [userId];

    if (search) {
      sql += ' AND (name LIKE ? OR keywords LIKE ? OR reply_text LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (session_id && session_id !== 'all') {
      sql += ' AND session_id = ?';
      params.push(session_id);
    }

    if (status && status !== 'all') {
      sql += ' AND is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auto-reply — Create a new rule
router.post('/', async (req: Request, res: Response) => {
  const { 
    userId, user_id, name, trigger_type, trigger_value, reply_type, 
    reply_text, template_id, media_url, media_type, session_id,
    priority, case_sensitive, is_active,
    use_openai, openai_api_key, openai_model, openai_base_url,
    openai_system_prompt, openai_temperature, openai_max_tokens,
    openai_continuous_chat,
    use_gemini, gemini_api_key, gemini_model, gemini_system_prompt,
    reply_delay
  } = req.body;

  const finalUserId = userId || user_id;

  if (!finalUserId || !name || !trigger_value) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const id = generateUUID();
    await db.query(
      `INSERT INTO auto_reply_rules (
        id, user_id, session_id, name, trigger_type, trigger_value, keywords, match_type,
        reply_type, reply_text, template_id, media_url, media_type,
        priority, case_sensitive, is_active,
        use_openai, openai_api_key, openai_model, openai_base_url,
        openai_system_prompt, openai_temperature, openai_max_tokens,
        openai_continuous_chat,
        use_gemini, gemini_api_key, gemini_model, gemini_system_prompt,
        reply_delay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, finalUserId, session_id || null, name, trigger_type || 'contains', trigger_value, trigger_value, trigger_type || 'contains', 
        reply_type || 'text', reply_text || null, template_id || null, 
        media_url || null, media_type || null,
        priority || 0, case_sensitive ? 1 : 0, is_active === false ? 0 : 1,
        use_openai ? 1 : 0, openai_api_key || null, openai_model || 'gpt-4o-mini', openai_base_url || null,
        openai_system_prompt || null, openai_temperature || 0.7, openai_max_tokens || null,
        openai_continuous_chat ? 1 : 0,
        use_gemini ? 1 : 0, gemini_api_key || null, gemini_model || 'gemini-2.5-flash-lite', gemini_system_prompt || null,
        reply_delay || 0
      ]
    );

    const [rows] = await db.query('SELECT * FROM auto_reply_rules WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auto-reply/:id — Update a rule
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = { ...req.body };

  try {
    // Handle booleans for MySQL
    if (updates.case_sensitive !== undefined) updates.case_sensitive = updates.case_sensitive ? 1 : 0;
    if (updates.is_active !== undefined) updates.is_active = updates.is_active ? 1 : 0;
    if (updates.use_openai !== undefined) updates.use_openai = updates.use_openai ? 1 : 0;
    if (updates.use_gemini !== undefined) updates.use_gemini = updates.use_gemini ? 1 : 0;
    if (updates.openai_continuous_chat !== undefined) updates.openai_continuous_chat = updates.openai_continuous_chat ? 1 : 0;

    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'user_id' && k !== 'userId');
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const sql = `UPDATE auto_reply_rules SET ${fields.map(f => `\`${f}\` = ?`).join(', ')} WHERE id = ?`;
    const params = [...fields.map(f => updates[f]), id];

    await db.query(sql, params);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auto-reply/:id — Delete a rule
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM auto_reply_rules WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
