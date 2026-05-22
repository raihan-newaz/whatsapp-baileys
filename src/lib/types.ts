export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  plan?: string;
  status: 'active' | 'banned';
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  session_name: string;
  template_id?: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';
  total_contacts: number;
  processed_contacts: number;
  success_count: number;
  failed_count: number;
  scheduled_at?: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  phone: string;
  name?: string;
  tags?: string;
  metadata?: any;
  created_at: string;
}

export interface WhatsAppChat {
  id: string;
  user_id: string;
  session_name: string;
  wid: string;
  name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  session_name: string;
  chat_id: string;
  wid: string;
  is_from_me: boolean;
  body: string;
  media_url?: string;
  media_type?: string;
  filename?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
  ack?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface SystemSettings {
  app_name?: string;
  timezone?: string;
  [key: string]: any;
}
