import { Router, Request, Response } from 'express';
import db, { generateUUID } from '../lib/db';
import { isNumberRegistered, checkNumberWithProfile } from '../lib/whatsappManager';
import { io } from '../index';

const router = Router();

// GET /api/checker/jobs/:userId
router.get('/jobs/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM verification_jobs WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checker/stats/:userId
router.get('/stats/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                COUNT(*) as totalJobs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedJobs,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processingJobs,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingJobs,
                SUM(valid_count) as totalValid,
                SUM(invalid_count) as totalInvalid
            FROM verification_jobs 
            WHERE user_id = ?
        `, [userId]);
        res.json(rows[0] || {
            totalJobs: 0,
            completedJobs: 0,
            processingJobs: 0,
            pendingJobs: 0,
            totalValid: 0,
            totalInvalid: 0
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/checker/quick
router.post('/quick', async (req: Request, res: Response) => {
    const { userId, sessionId, phone } = req.body;
    
    if (!userId || !phone) {
        return res.status(400).json({ error: 'Missing userId or phone' });
    }

    try {
        let sessionName = 'default';
        if (sessionId) {
            const [sessionRows] = await db.query('SELECT session_name FROM whatsapp_sessions WHERE id = ?', [sessionId]) as any[];
            if (sessionRows[0]) {
                sessionName = sessionRows[0].session_name;
            }
        }

        const { isValid, profilePicUrl } = await checkNumberWithProfile(userId, sessionName, phone);
        res.json({ success: true, isValid, profilePicUrl });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/checker/jobs
router.post('/jobs', async (req: Request, res: Response) => {
  const { userId, sessionId, name, phones } = req.body;
  
  if (!userId || !phones || !Array.isArray(phones)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const jobId = generateUUID();
  const jobName = name || `WhatsApp Check - ${new Date().toLocaleString()}`;
  
  try {
    await db.query(`
      INSERT INTO verification_jobs (id, user_id, session_id, name, phones, total_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [jobId, userId, sessionId, jobName, JSON.stringify(phones), phones.length, 'pending']);

    // Respond immediately
    res.json({ success: true, jobId });

    // Start background processing
    processVerificationJob(jobId, userId, sessionId, phones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/checker/jobs/:id
router.delete('/jobs/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.query;
    try {
        await db.query('DELETE FROM verification_jobs WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

async function processVerificationJob(jobId: string, userId: string, sessionId: string, phones: string[]) {
    console.log(`[Checker] Starting Job ${jobId} for user ${userId}...`);
    
    // Get session name from sessionId
    let sessionName = 'default';
    if (sessionId) {
        const [sessionRows] = await db.query('SELECT session_name FROM whatsapp_sessions WHERE id = ?', [sessionId]) as any[];
        if (sessionRows[0]) {
            sessionName = sessionRows[0].session_name;
        }
    }

    await db.query('UPDATE verification_jobs SET status = ? WHERE id = ?', ['processing', jobId]);

    let valid = 0;
    let invalid = 0;
    let completed = 0;

    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < phones.length; i += batchSize) {
        const batch = phones.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (phone) => {
            try {
                const isValid = await isNumberRegistered(userId, sessionName, phone);
                if (isValid) valid++;
                else invalid++;
            } catch (err) {
                invalid++;
            }
            completed++;
        }));

        // Update progress in DB
        await db.query(`
            UPDATE verification_jobs 
            SET completed_count = ?, valid_count = ?, invalid_count = ? 
            WHERE id = ?
        `, [completed, valid, invalid, jobId]);

        // Emit progress via socket
        io.to(userId).emit('checker:progress', {
            jobId,
            completed,
            valid,
            invalid,
            total: phones.length
        });

        // Small delay between batches to be safe
        await new Promise(r => setTimeout(r, 1000));
    }

    await db.query('UPDATE verification_jobs SET status = ? WHERE id = ?', ['completed', jobId]);
    io.to(userId).emit('checker:completed', { jobId, valid, invalid });
    
    console.log(`[Checker] Job ${jobId} finished. Valid: ${valid}, Invalid: ${invalid}`);
}

export default router;
