-- Create transactional_logs table
CREATE TABLE IF NOT EXISTS transactional_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    recipient VARCHAR(20) NOT NULL,
    content TEXT,
    wa_message_id VARCHAR(255), -- WhatsApp message ID if sent via WA
    sms_message_id VARCHAR(255), -- SMS message ID if sent via SMS (failover)
    method VARCHAR(20) NOT NULL, -- 'whatsapp' or 'sms'
    status VARCHAR(50) DEFAULT 'delivered',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
