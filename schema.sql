-- Create Database
CREATE DATABASE IF NOT EXISTS whatsapp_db;
USE whatsapp_db;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    company VARCHAR(255),
    timezone VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    plan VARCHAR(50) DEFAULT 'free_trial',
    plan_expires_at TIMESTAMP NULL,
    api_key VARCHAR(255) UNIQUE,
    notification_settings JSON,
    app_preferences JSON,
    is_banned BOOLEAN DEFAULT FALSE,
    number_checker_credits INT DEFAULT 0,
    api_requests_count INT DEFAULT 0,
    parent_user_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_user_id) REFERENCES profiles(id)
);

-- 2. WhatsApp Sessions Table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_name VARCHAR(255) DEFAULT 'default',
    phone_number VARCHAR(20),
    status VARCHAR(50) DEFAULT 'disconnected',
    device_info JSON,
    last_active_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Contact Groups Table
CREATE TABLE IF NOT EXISTS contact_groups (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    media_url TEXT,
    media_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36),
    name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    tags JSON,
    custom_message TEXT,
    is_wa_valid BOOLEAN DEFAULT NULL,
    messages_sent INT DEFAULT 0,
    last_validated_at TIMESTAMP NULL,
    last_active_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_user_phone (user_id, phone)
);

-- 6. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36),
    template_id VARCHAR(36),
    group_id VARCHAR(36),
    name VARCHAR(255),
    total_sent INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    interval_seconds INT DEFAULT 40,
    random_delay_min INT DEFAULT 10,
    random_delay_max INT DEFAULT 30,
    daily_limit INT DEFAULT 200,
    scheduled_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type VARCHAR(50),
    recurrence_day INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Message Queue Table
CREATE TABLE IF NOT EXISTS message_queue (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    campaign_id VARCHAR(36),
    contact_id VARCHAR(36),
    session_id VARCHAR(36),
    phone VARCHAR(20) NOT NULL,
    message TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    source VARCHAR(50) DEFAULT 'system',
    error_message TEXT,
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Message Logs Table
CREATE TABLE IF NOT EXISTS message_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    campaign_id VARCHAR(36),
    message_id VARCHAR(255), -- WhatsApp message ID
    phone VARCHAR(20) NOT NULL,
    message TEXT,
    session_name VARCHAR(255),
    media_url TEXT,
    media_type VARCHAR(100),
    status VARCHAR(50),
    source VARCHAR(50) DEFAULT 'system',
    ack INT DEFAULT 0,
    error_message TEXT,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36)
);

-- 10. WhatsApp Chats Table
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_name VARCHAR(255) NOT NULL,
    wid VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    last_message TEXT,
    last_message_at TIMESTAMP NULL,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, session_name, wid)
);

-- 11. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_name VARCHAR(255) NOT NULL,
    chat_id VARCHAR(36) NOT NULL,
    wid VARCHAR(255) NOT NULL,
    `from` VARCHAR(255),
    `to` VARCHAR(255),
    body TEXT,
    type VARCHAR(50),
    timestamp TIMESTAMP NULL,
    is_from_me BOOLEAN DEFAULT FALSE,
    media_url TEXT,
    media_type VARCHAR(100),
    filename VARCHAR(255),
    ack INT DEFAULT 0 COMMENT '0=pending,1=sent,2=delivered,3=read',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending,sent,delivered,read',
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (wid)
);

-- 12. Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    template_id VARCHAR(36),
    session_id VARCHAR(36),
    trigger_event VARCHAR(50) DEFAULT 'generic',
    api_key VARCHAR(255) UNIQUE,
    secret_token VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    total_triggered INT DEFAULT 0,
    received_count INT DEFAULT 0,
    last_triggered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id),
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id)
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- 14. Verification Jobs Table
CREATE TABLE IF NOT EXISTS verification_jobs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NULL,
    name VARCHAR(255) NOT NULL,
    phones TEXT NOT NULL,
    total_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    valid_count INT DEFAULT 0,
    invalid_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- 15. Auto Reply Rules Table
CREATE TABLE IF NOT EXISTS auto_reply_rules (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NULL,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) DEFAULT 'contains',
    trigger_value TEXT NOT NULL,
    keywords TEXT NULL,
    match_type VARCHAR(50) DEFAULT 'contains',
    reply_type VARCHAR(50) DEFAULT 'text',
    reply_text TEXT NULL,
    template_id VARCHAR(36) NULL,
    media_url TEXT NULL,
    media_type VARCHAR(100) NULL,
    priority INT DEFAULT 0,
    case_sensitive BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    use_openai BOOLEAN DEFAULT FALSE,
    openai_api_key VARCHAR(255) NULL,
    openai_model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    openai_base_url VARCHAR(255) NULL,
    openai_system_prompt TEXT NULL,
    openai_temperature FLOAT DEFAULT 0.7,
    openai_max_tokens INT NULL,
    openai_continuous_chat BOOLEAN DEFAULT FALSE,
    use_gemini BOOLEAN DEFAULT FALSE,
    gemini_api_key VARCHAR(255) NULL,
    gemini_model VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    gemini_system_prompt TEXT NULL,
    reply_delay INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id),
    FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id)
);

-- 16. SMS Gateways Table
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
);

-- 17. Media Table
CREATE TABLE IF NOT EXISTS media (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'document',
    size BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default system settings
INSERT INTO system_settings (`key`, `value`) VALUES
('billing_limits', '{"free_trial": {"name": "Free Trial", "accounts": 1, "daily_msgs": 2000, "group_extractions": 10, "max_contacts": 25000, "monthly_price": "$0", "yearly_price": "$0", "media_limit": 100, "media_limit_unit": "MB", "validity_days": 3}, "pro": {"name": "Pro Plan", "accounts": 5, "daily_msgs": 5000, "group_extractions": 50, "max_contacts": 50000, "monthly_price": "$29", "yearly_price": "$249", "media_limit": 500, "media_limit_unit": "MB", "validity_days": 30}, "business": {"name": "Business Plan", "accounts": 12, "daily_msgs": 16666, "group_extractions": 200, "max_contacts": 100000, "monthly_price": "$59", "yearly_price": "$499", "media_limit": 1024, "media_limit_unit": "MB", "validity_days": 30}, "enterprise": {"name": "Enterprise Plan", "accounts": 20, "daily_msgs": 50000, "group_extractions": 500, "max_contacts": 250000, "monthly_price": "$99", "yearly_price": "$899", "media_limit": 5120, "media_limit_unit": "MB", "validity_days": 30}, "admin": {"name": "Administrator", "accounts": 0, "daily_msgs": 0, "group_extractions": 0, "max_contacts": 0, "monthly_price": "$0", "yearly_price": "$0", "media_limit": 0, "media_limit_unit": "MB", "validity_days": 0}}')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

INSERT INTO system_settings (`key`, `value`) VALUES
('emergency_controls', '{"global_pause": false, "disable_sending": false}')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

INSERT INTO system_settings (`key`, `value`) VALUES
('anti_spam', '{"max_identical_msgs": 200, "bad_words": []}')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

INSERT INTO system_settings (`key`, `value`) VALUES
('warmup_rules', '{"day1": 20, "day2": 50, "day3": 100, "day4": 200}')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

INSERT INTO system_settings (`key`, `value`) VALUES
('campaign_defaults', '{"min_interval": 20, "min_delay": 20, "max_delay": 60}')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- 17. Android Devices Table
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
);

-- 18. Android Incoming SMS Table
CREATE TABLE IF NOT EXISTS android_incoming_sms (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    sender_number VARCHAR(50) NOT NULL,
    message_content TEXT NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
