import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
import { isNumberRegistered, checkNumberWithProfile } from '../lib/whatsappManager';
import { getPlanLimits } from '../lib/safetyManager';

const router = Router();

// GET /api/contacts/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { group_id, tag, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    console.log(`[Contacts] Fetching for user: ${userId}`, { group_id, search, page, limit });
    let whereSql = 'WHERE user_id = ?';
    const params: any[] = [userId];

    // If search is provided, we search the full database (ignore group_id)
    if (search) {
      whereSql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    } else if (group_id && group_id !== 'all') {
      if (group_id === 'ungrouped') {
        whereSql += ' AND group_id IS NULL';
      } else {
        whereSql += ' AND group_id = ?';
        params.push(group_id);
      }
    }

    if (tag) {
      whereSql += ' AND JSON_CONTAINS(tags, ?)';
      params.push(JSON.stringify([tag]));
    }

    // Get total count for pagination
    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM contacts ${whereSql}`, params);
    const total = (countRows as any[])[0].total;

    // Get paginated data
    let sql = `SELECT * FROM contacts ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const paginatedParams = [...params, Number(limit), offset];
    
    const [rows] = await db.query(sql, paginatedParams);
    const parsedRows = (rows as any[]).map(row => ({
      ...row,
      is_wa_valid: row.is_wa_valid === null ? null : Boolean(row.is_wa_valid),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || [])
    }));

    res.json({
      success: true,
      contacts: parsedRows,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      debug: { whereSql, params }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/bulk — bulk import
router.post('/bulk', async (req: Request, res: Response) => {
  const { userId, contacts } = req.body;
  if (!userId || !Array.isArray(contacts)) return res.status(400).json({ error: 'userId and contacts array required' });
  try {
    // Check contact limits
    const [profileRows] = await db.query('SELECT plan, role FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const limits = await getPlanLimits(profile?.plan || 'free', profile?.role || 'user');
    const maxContacts = limits.max_contacts || 500;

    const [countRows] = await db.query('SELECT COUNT(*) as count FROM contacts WHERE user_id = ?', [userId]);
    const currentCount = (countRows as any)[0].count || 0;

    const isUnlimited = maxContacts === 0;

    if (!isUnlimited && currentCount + contacts.length > maxContacts) {
      if (currentCount >= maxContacts) {
        return res.status(403).json({ error: `Contact limit reached. Your plan allows a maximum of ${maxContacts} contacts.` });
      }
      // Trim the contacts to fit the limit if some room is left
      const remaining = maxContacts - currentCount;
      contacts.splice(remaining);
    }

    const values: any[] = [];
    const insertedData: any[] = [];

    for (const c of contacts) {
      const id = generateUUID();
      const tags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : []);
      const phone = c.phone?.toString().replace(/[^0-9]/g, '');
      
      values.push([
        id,
        userId,
        c.name || 'Unknown',
        phone,
        c.email || null,
        JSON.stringify(tags),
        c.custom_message || null,
        c.group_id || null
      ]);

      insertedData.push({ id, user_id: userId, name: c.name, phone, tags });
    }

    const sql = 'INSERT IGNORE INTO contacts (id, user_id, name, phone, email, tags, custom_message, group_id) VALUES ?';
    await db.query(sql, [values]);

    res.json({ imported: insertedData.length, data: insertedData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts — single add
router.post('/', async (req: Request, res: Response) => {
  const { userId, ...contact } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const id = generateUUID();

  try {
    // Check contact limits
    const [profileRows] = await db.query('SELECT plan, role FROM profiles WHERE id = ?', [userId]);
    const profile = (profileRows as any[])[0];
    const limits = await getPlanLimits(profile?.plan || 'free', profile?.role || 'user');
    const maxContacts = limits.max_contacts === 0 ? 0 : (limits.max_contacts || 500);

    const isUnlimited = maxContacts === 0;

    const [countRows] = await db.query('SELECT COUNT(*) as count FROM contacts WHERE user_id = ?', [userId]);
    const currentCount = (countRows as any)[0].count || 0;

    if (!isUnlimited && currentCount >= maxContacts) {
      return res.status(403).json({ error: `Contact limit reached. Your plan allows a maximum of ${maxContacts} contacts.` });
    }

    // Optional: Fetch profile pic immediately if we have a connection and it's a single add
    let initialProfilePic = null;
    try {
      const { isValid, profilePicUrl } = await checkNumberWithProfile(userId, contact.sessionName || 'default', contact.phone);
      if (isValid) initialProfilePic = profilePicUrl;
    } catch (e) {}

    await db.query(
      'INSERT INTO contacts (id, user_id, name, phone, email, tags, custom_message, group_id, profile_pic, last_profile_fetch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, contact.name, contact.phone, contact.email, JSON.stringify(contact.tags || []), contact.custom_message, contact.group_id, initialProfilePic, initialProfilePic ? new Date() : null]
    );
    const [rows] = await db.query('SELECT * FROM contacts WHERE id = ?', [id]);
    const row = (rows as any[])[0];
    if (row) {
      row.tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []);
    }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM contacts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/group/:groupId — Delete all contacts in a group
router.delete('/group/:groupId', async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    await db.query('DELETE FROM contacts WHERE user_id = ? AND group_id = ?', [userId, groupId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/:id/validate
router.post('/:id/validate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, sessionName = 'default' } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const [rows] = await db.query('SELECT phone FROM contacts WHERE id = ?', [id]);
    const contact = (rows as any[])[0];
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const { isValid, profilePicUrl } = await checkNumberWithProfile(userId, sessionName, contact.phone);
    
    await db.query(
      'UPDATE contacts SET is_wa_valid = ?, last_validated_at = ?, profile_pic = ?, last_profile_fetch = ? WHERE id = ?',
      [isValid, new Date(), profilePicUrl, profilePicUrl ? new Date() : null, id]
    );

    res.json({ success: true, isValid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/bulk-validate
router.post('/bulk-validate', async (req: Request, res: Response) => {
  const { userId, contactIds, sessionName = 'default' } = req.body;
  if (!userId || !Array.isArray(contactIds)) return res.status(400).json({ error: 'userId and contactIds array required' });

  try {
    const [rows] = await db.query('SELECT id, phone FROM contacts WHERE id IN (?)', [contactIds]);
    const contacts = rows as any[];

    const results = [];
    for (const c of contacts) {
      try {
        const { isValid, profilePicUrl } = await checkNumberWithProfile(userId, sessionName, c.phone);
        await db.query(
          'UPDATE contacts SET is_wa_valid = ?, last_validated_at = ?, profile_pic = ?, last_profile_fetch = ? WHERE id = ?',
          [isValid, new Date(), profilePicUrl, profilePicUrl ? new Date() : null, c.id]
        );
        results.push({ id: c.id, isValid, profilePicUrl });
      } catch (e) {
        results.push({ id: c.id, error: true });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
