import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root of the unified project
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'whatsapp_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
});

// Auto-migrate to add missing columns
(async () => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query("ALTER TABLE message_logs ADD COLUMN source VARCHAR(50) DEFAULT 'system'");
      console.log("[DB] Added 'source' column to message_logs");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.warn("[DB] Note on message_logs source column:", e.message);
    }
    try {
      await connection.query("ALTER TABLE message_queue ADD COLUMN source VARCHAR(50) DEFAULT 'system'");
      console.log("[DB] Added 'source' column to message_queue");
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.warn("[DB] Note on message_queue source column:", e.message);
    }
    
    // Create media table if not exists (missed in initial schema)
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS media (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            url TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'document',
            size BIGINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("[DB] Checked/Created 'media' table");
    } catch (e: any) {
      console.warn("[DB] Failed to create media table:", e.message);
    }

    connection.release();
  } catch (err) {
    console.error("[DB] Migration check failed:", err);
  }
})();

export default pool;

/**
 * Helper to generate UUIDs for MySQL since we are moving away from Supabase's automatic UUIDs.
 * We can use crypto.randomUUID() in Node.js.
 */
import { randomUUID } from 'crypto';
export const generateUUID = () => randomUUID();
