import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'whatsapp_db',
});

async function main() {
    try {
        await pool.query("ALTER TABLE message_logs ADD COLUMN webhook_url TEXT DEFAULT NULL;");
        console.log("Column webhook_url added to message_logs");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column already exists");
        } else {
            console.error(e);
        }
    }
    
    try {
        await pool.query("ALTER TABLE profiles ADD COLUMN api_key VARCHAR(255) UNIQUE;");
        console.log("Column api_key added to profiles (if it was missing in local setup)");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column api_key already exists");
        }
    }
    process.exit(0);
}

main();
