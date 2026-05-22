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

export default pool;

/**
 * Helper to generate UUIDs for MySQL since we are moving away from Supabase's automatic UUIDs.
 * We can use crypto.randomUUID() in Node.js.
 */
import { randomUUID } from 'crypto';
export const generateUUID = () => randomUUID();
