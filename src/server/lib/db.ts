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

    // Create sms_gateways table if not exists
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sms_gateways (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            provider VARCHAR(100) NOT NULL,
            config JSON NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log("[DB] Checked/Created 'sms_gateways' table");
    } catch (e: any) {
      console.warn("[DB] Failed to create sms_gateways table:", e.message);
    }

    // Create android_devices table if not exists
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS android_devices (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            device_name VARCHAR(255) DEFAULT 'WaCloud SMS Gateway',
            connection_token VARCHAR(255) UNIQUE NOT NULL,
            socket_id VARCHAR(255) NULL,
            status VARCHAR(50) DEFAULT 'disconnected',
            battery_level INT NULL,
            default_sim INT DEFAULT 1,
            sms_delay_seconds INT DEFAULT 0,
            sync_mode VARCHAR(20) DEFAULT 'all',
            last_active_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log("[DB] Checked/Created 'android_devices' table");
    } catch (e: any) {
      console.warn("[DB] Failed to create android_devices table:", e.message);
    }

    // Create android_incoming_sms table if not exists
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS android_incoming_sms (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            device_id VARCHAR(36) NOT NULL,
            sender_number VARCHAR(50) NOT NULL,
            message_content TEXT NOT NULL,
            received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("[DB] Checked/Created 'android_incoming_sms' table");
    } catch (e: any) {
      console.warn("[DB] Failed to create android_incoming_sms table:", e.message);
    }
    // Create transactional_logs table if not exists
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS transactional_logs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            recipient VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            wa_message_id VARCHAR(255),
            sms_message_id VARCHAR(255),
            method VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'delivered',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("[DB] Checked/Created 'transactional_logs' table");
    } catch (e: any) {
      console.warn("[DB] Failed to create transactional_logs table:", e.message);
    }

    // Add Performance Indexes
    const indexes = [
      { table: 'whatsapp_sessions', name: 'idx_user_id', cols: 'user_id' },
      { table: 'message_queue', name: 'idx_status_scheduled', cols: 'status, scheduled_at' },
      { table: 'message_queue', name: 'idx_campaign_id', cols: 'campaign_id' },
      { table: 'message_logs', name: 'idx_user_status_sent', cols: 'user_id, status, sent_at' },
      { table: 'campaigns', name: 'idx_user_id', cols: 'user_id' },
      { table: 'contacts', name: 'idx_group_id', cols: 'group_id' }
    ];

    for (const idx of indexes) {
      try {
        await connection.query(`CREATE INDEX ${idx.name} ON ${idx.table} (${idx.cols})`);
        console.log(`[DB] Created index ${idx.name} on ${idx.table}`);
      } catch (e: any) {
        if (e.code !== 'ER_DUP_KEYNAME') console.warn(`[DB] Failed to create index ${idx.name}:`, e.message);
      }
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
