'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Search, RefreshCw, MessageSquare, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase';
import { io, Socket } from 'socket.io-client';

interface IncomingSms {
  id: string;
  device_id: string;
  sender_number: string;
  message_content: string;
  received_at: string;
}

export default function IncomingSmsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IncomingSms[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchMessages(data.user.id);
        setupSocket(data.user.id);
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const setupSocket = (uid: string) => {
    const newSocket = io(window.location.origin);
    newSocket.on('connect', () => {
      newSocket.emit('join', uid);
    });

    newSocket.on('new_incoming_sms', (sms: IncomingSms) => {
      setMessages((prev) => [sms, ...prev]);
    });

    setSocket(newSocket);
  };

  const fetchMessages = async (uId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/android/incoming/${uId}`);
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/android/incoming/${id}`, { method: 'DELETE' });
      if (res.success && userId) {
        setMessages(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    (m.sender_number || '').includes(search) || (m.message_content || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#005a41]" /> Incoming SMS
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            View SMS replies and incoming messages synced from your Android Gateways.
          </p>
        </div>
        <button
          onClick={() => userId && fetchMessages(userId)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-semibold transition-all shadow-sm active:scale-95 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by sender or message..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-[#005a41] transition-colors"
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {filteredMessages.map(msg => (
            <div key={msg.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#005a41]/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-[#005a41]" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">{msg.sender_number}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-zinc-400">
                      {new Date(msg.received_at).toLocaleString()}
                    </span>
                    <button onClick={() => handleDelete(msg.id)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Delete message">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {msg.message_content}
                </p>
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    Device: {msg.device_id.slice(-6)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No incoming messages found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
