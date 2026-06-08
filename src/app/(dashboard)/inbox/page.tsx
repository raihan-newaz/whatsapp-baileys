'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { WhatsAppChat, WhatsAppMessage } from '@/lib/types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/context/ToastContext';
import { 
  Search, 
  Send, 
  Smartphone, 
  User as UserIcon, 
  MessageSquare, 
  Loader2, 
  Check,
  CheckCheck, 
  MoreVertical,
  ChevronLeft,
  RefreshCw,
  Paperclip,
  FileText,
  Download,
  Trash2,
  Camera,
  Video,
  Mic,
  Image as ImageIcon
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export default function InboxPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<string>('default');
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [activeChat, setActiveChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { socket } = useSocket();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        fetchSessions(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (user && activeSession) {
      fetchChats();
    }
  }, [user, activeSession]);

  useEffect(() => {
    if (activeChat) {
      setHasMore(true);
      fetchMessages();
    }
  }, [activeChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: WhatsAppMessage; chat: WhatsAppChat; sessionName: string }) => {
      if (data.sessionName !== activeSession) return;

      setChats((prev: WhatsAppChat[]) => {
        const index = prev.findIndex(c => c.id === data.chat.id);
        
        // Generate a preview for the sidebar
        const isMedia = !!(data.message.media_url || data.message.media_type);
        let preview = data.message.body || '';
        if (isMedia && !preview) {
          const type = data.message.media_type;
          preview = type === 'image' ? '[Photo]' : 
                    type === 'video' ? '[Video]' : 
                    type === 'audio' ? '[Audio]' : '[Media]';
        }

        if (index === -1) {
          const newChat = { ...data.chat, last_message: preview, last_message_at: data.message.timestamp };
          return [newChat, ...prev];
        } else {
          const updated = [...prev];
          updated[index] = { 
            ...updated[index],
            last_message: preview,
            last_message_at: data.message.timestamp,
            unread_count: (activeChat?.id === data.chat.id) ? updated[index].unread_count : (updated[index].unread_count || 0) + 1 
          };
          const [item] = updated.splice(index, 1);
          return [item, ...updated];
        }
      });

      if (activeChat && data.chat.wid === activeChat.wid) {
        setMessages(prev => {
          if (prev.find(m => m.wid === data.message.wid)) return prev;
          return [...prev, data.message];
        });
      }
    };

    socket.on('wa:new_message', handleNewMessage);
    return () => {
      socket.off('wa:new_message', handleNewMessage);
    };
  }, [socket, activeSession, activeChat]);

  async function fetchSessions(userId: string) {
    try {
      const data = await apiFetch(`/api/whatsapp/sessions/${userId}`);
      if (data) {
        const connectedSessions = data.filter((s: any) => s.status === 'connected');
        if (connectedSessions.length > 0) {
          setSessions(connectedSessions);
          const primary = connectedSessions.find((s: any) => s.session_name === 'Primary') || connectedSessions[0];
          setActiveSession(primary.session_name);
        } else {
          setLoadingChats(false);
        }
      } else {
        setLoadingChats(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setLoadingChats(false);
    }
  }

  async function fetchChats() {
    if (!user) return;
    setLoadingChats(true);
    try {
      const data = await apiFetch(`/api/inbox/chats?userId=${user.id}&sessionName=${activeSession}`);
      if (data.success) {
        setChats(data.chats);
      }
    } catch (err: any) {
      console.error('Failed to fetch chats:', err);
      toast(err.message || 'Failed to fetch chats', 'error');
    } finally {
      setLoadingChats(false);
    }
  }

  async function fetchMessages(before?: string) {
    if (!user || !activeChat) return;
    
    if (before) setLoadingMore(true);
    else setLoadingMessages(true);
    
    try {
      const url = `/api/inbox/messages/${activeChat.id}?userId=${user.id}${before ? `&before=${before}` : ''}`;
      const data = await apiFetch(url);
      if (data.success) {
        if (before) {
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        setHasMore(data.messages.length >= 20);
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      toast(err.message || 'Failed to fetch messages', 'error');
    } finally {
      if (before) setLoadingMore(false);
      else setLoadingMessages(false);
    }
  }

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || !messages.length) return;
    
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0) {
      const earliestTimestamp = messages[0].timestamp;
      // Store current height to maintain scroll position after loading
      const oldScrollHeight = e.currentTarget.scrollHeight;
      
      await fetchMessages(earliestTimestamp);
      
      // Small delay to allow react to finish rendering new messages
      setTimeout(() => {
        if (scrollRef.current) {
          const newScrollHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = newScrollHeight - oldScrollHeight;
        }
      }, 50);
    }
  };

  async function handleSendReply() {
    if (!user || !activeChat || !replyText.trim()) return;
    
    const text = replyText;
    setReplyText('');

    try {
      const data = await apiFetch('/api/inbox/send', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          sessionName: activeSession,
          chatId: activeChat.id,
          message: text
        })
      });

      if (!data.success) {
        toast(data.error || 'Failed to send message', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Connection error', 'error');
    }
  }

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChat) return;

    setUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      let uploadFile: File | Blob = file;
      
      if (isImage) {
        try {
          uploadFile = await compressImage(file);
        } catch (err) {
          console.warn('Compression failed, using original:', err);
        }
      }

      const formData = new FormData();
      formData.append('file', uploadFile, file.name);

      const res = await apiFetch('/api/inbox/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.success) throw new Error(res.error || 'Upload failed');

      const mediaUrl = res.url;

      const sendData = await apiFetch('/api/inbox/send', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          sessionName: activeSession,
          chatId: activeChat.id,
          message: isImage ? '' : file.name,
          mediaUrl: mediaUrl,
          mediaType: isImage ? 'image' : 'document'
        })
      });
      if (sendData.success) {
        toast('File sent successfully', 'success');
      } else {
        toast(sendData.error || 'Failed to send file', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteMessage(msgId: string) {
    if (!user || !confirm('Are you sure you want to delete this message and its media?')) return;

    try {
      const data = await apiFetch(`/api/inbox/messages/${msgId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      if (data.success) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        toast('Message deleted', 'success');
      } else {
        toast(data.error || 'Delete failed', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Connection error', 'error');
    }
  }

  async function handleSyncHistory() {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      const data = await apiFetch('/api/inbox/sync-history', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, sessionName: activeSession })
      });
      if (data.success) {
        toast(`Successfully synced ${data.count} chats`, 'success');
        fetchChats();
      } else {
        toast(data.error || 'Sync failed', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Connection error', 'error');
    } finally {
      setSyncing(false);
    }
  }

  const filteredChats = chats
    .filter(c => 
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.wid || '').includes(searchQuery)
    )
    .sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });

  function formatTime(iso: string) {
    const d = new Date(iso);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd/MM/yy');
  }


  return (
    <div className="flex flex-col h-[calc(100vh-0px)] overflow-hidden bg-background">
      {/* Header */}
      <div className="h-16 border-b border-border bg-secondary/30 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3 text-foreground font-semibold">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span>WhatsApp Inbox</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Sync Button */}
          <button 
            onClick={handleSyncHistory}
            disabled={syncing || sessions.length === 0}
            className="btn-secondary !py-2 !px-4"
          >
            {syncing ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mr-2" />}
            <span>{syncing ? 'Syncing...' : 'Sync History'}</span>
          </button>

          <div className="w-64">
            <CustomSelect
              value={activeSession}
              onChange={(val) => {
                setActiveSession(val);
                setActiveChat(null);
              }}
              options={sessions.map(s => ({
                value: s.session_name,
                label: `${s.session_name} (${s.phone_number?.slice(-4) || 'Linked'})`
              }))}
              placeholder={sessions.length === 0 ? "No Active Account" : "Select Account"}
              icon={<Smartphone className="w-4 h-4 text-primary" />}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat List Sidebar */}
        <div className={`w-80 md:w-96 border-r border-border flex flex-col bg-card/10 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingChats ? (
              <div className="flex flex-col">
                {Array(6).fill(0).map((_, i) => (
                   <div key={i} className="flex items-center gap-3 p-4 border-b border-border/30 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-2">
                         <div className="flex justify-between">
                            <div className="h-3 w-24 bg-muted rounded-full" />
                            <div className="h-2 w-8 bg-muted rounded-full opacity-50" />
                         </div>
                         <div className="h-2 w-40 bg-muted rounded-full opacity-50" />
                      </div>
                   </div>
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 text-muted-foreground px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 border border-border">
                  <MessageSquare className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No chats found</p>
                <p className="text-xs mt-1 text-muted-foreground shadow-sm opacity-60">Start a conversation from your phone or send a campaign to see messages here.</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-all border-b border-border/30 text-left relative
                    ${activeChat?.id === chat.id ? 'bg-primary/10 border-r-2 border-r-primary' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                    <UserIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-foreground text-sm truncate">{chat.name}</span>
                      <span className="text-[10px] text-muted-foreground">{chat.last_message_at ? formatTime(chat.last_message_at) : ''}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {(() => {
                        const text = chat.last_message || '';
                        if (!text) return 'No messages yet';
                        
                        if (text.startsWith('[Photo]')) return <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5 text-primary/70" /> {text.replace('[Photo]', '').trim() || 'Photo'}</span>;
                        if (text.startsWith('[Video]')) return <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5 text-primary/70" /> {text.replace('[Video]', '').trim() || 'Video'}</span>;
                        if (text.startsWith('[Audio]')) return <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5 text-primary/70" /> {text.replace('[Audio]', '').trim() || 'Audio'}</span>;
                        if (text.startsWith('[Document]')) return <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-primary/70" /> {text.replace('[Document]', '').trim() || 'Document'}</span>;
                        if (text.startsWith('[Sticker]')) return <span className="flex items-center gap-1">🏷️ Sticker</span>;
                        
                        return text;
                      })()}
                    </div>
                  </div>
                  {chat.unread_count > 0 && (
                    <div className="absolute top-9 right-4 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                      {chat.unread_count}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-background/40 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-secondary/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-2 hover:bg-secondary rounded-lg text-muted-foreground">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{activeChat.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{activeChat.wid}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('https://w0.peakpx.com/wallpaper/580/630/wallpaper-whatsapp-background.jpg')] bg-fixed" 
                ref={scrollRef}
                onScroll={handleScroll}
              >
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border flex items-center gap-2 shadow-xl">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-foreground">Loading older messages...</span>
                    </div>
                  </div>
                )}
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.wid} className={`flex ${m.is_from_me ? 'justify-end' : 'justify-start'} group mb-4`}>
                      <div className={`max-w-[75%] px-4 py-2 rounded-2xl relative shadow-md group-hover:pr-10 transition-all
                        ${m.is_from_me 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-card text-card-foreground rounded-tl-none border border-border'
                        }`}>
                        
                        {/* Media Rendering (Manual Download) */}
                        {m.media_url && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm group/media">
                            <button 
                              onClick={() => window.open(m.media_url, '_blank')}
                              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-all text-left"
                            >
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                m.media_type === 'image' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {m.media_type === 'image' ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium text-sm text-zinc-100">
                                  {m.media_type === 'image' ? 'Image Message' : (m.filename || 'Document')}
                                </p>
                                <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider mt-0.5">
                                  {m.media_type || 'Media'} • Click to download
                                </p>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity">
                                <Download className="w-5 h-5 text-zinc-400" />
                              </div>
                            </button>
                          </div>
                        )}

                        <p className="text-sm whitespace-pre-wrap">
                          {m.body || (m.media_url || (m as any).type ? (
                            <span className="italic opacity-70 flex items-center gap-1.5 text-[11px]">
                              {((m.media_type || (m as any).type) === 'image') ? <><Camera className="w-3 h-3" /> Photo</> : 
                               ((m.media_type || (m as any).type) === 'video') ? <><Video className="w-3 h-3" /> Video</> : 
                               ((m.media_type || (m as any).type) === 'audio' || (m as any).type === 'ptt') ? <><Mic className="w-3 h-3" /> Audio</> : 
                               <><FileText className="w-3 h-3" /> Document</>}
                              <span className="text-[9px] opacity-60">(Not downloaded)</span>
                            </span>
                          ) : '')}
                        </p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className={`text-[9px] ${
                            m.is_from_me 
                              ? 'text-white/70 dark:text-[#022c22]/70' 
                              : 'text-card-foreground/50'
                          }`}>
                            {format(new Date(m.timestamp), 'HH:mm')}
                          </span>
                          {!!m.is_from_me && (
                            (m.ack ?? 0) <= 1 ? (
                              <Check className="w-3.5 h-3.5 text-white/60 dark:text-[#022c22]/60" />
                            ) : (
                              <CheckCheck className={`w-3.5 h-3.5 ${
                                (m.ack ?? 0) >= 3 
                                  ? 'text-[#34b7f1] dark:text-[#1d4ed8]' 
                                  : 'text-zinc-200 dark:text-[#022c22]/85'
                              }`} />
                            )
                          )}
                        </div>

                        {/* Delete Button (Hidden by default, shown on hover) */}
                        <button 
                          onClick={() => handleDeleteMessage(m.id)}
                          className="absolute right-2 top-2 p-1.5 rounded-lg bg-red-500/0 group-hover:bg-red-500/20 text-red-400/0 group-hover:text-red-400 transition-all hover:scale-110"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-background/80 border-t border-border backdrop-blur-md">
                <div className="max-w-4xl mx-auto flex items-end gap-3">
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-12 h-12 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center justify-center transition-all border border-border disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>

                  <div className="flex-1 bg-secondary/50 rounded-2xl border border-border p-2 focus-within:border-primary/50 transition-all flex items-center px-4">
                    <textarea 
                      placeholder="Type your message..."
                      rows={1}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-foreground text-sm py-2 resize-none max-h-32"
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                  </div>
                  <button 
                    disabled={!replyText.trim() || uploading}
                    onClick={handleSendReply}
                    className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex-shrink-0"
                  >
                    <Send className="w-5 h-5 -rotate-45" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-24 h-24 rounded-full bg-secondary border border-border flex items-center justify-center mb-6">
                <MessageSquare className="w-12 h-12 opacity-10" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Select a Conversation</h2>
              <p className="text-sm text-muted-foreground max-w-xs text-center">
                Click on a chat from the sidebar to view messages and reply in real-time.
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
