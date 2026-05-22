export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'user';
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
  tags?: string; // JSON string in MySQL
  metadata?: any;
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  session_name: string;
  chat_id: string;
  wid: string;
  from_me: boolean;
  body: string;
  media_url?: string;
  media_type?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}
