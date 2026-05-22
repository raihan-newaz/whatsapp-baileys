'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Loader2, Users, MessageSquare, 
  Paperclip, Image as ImageIcon, FileText,
  ChevronDown, CheckCircle2, AlertCircle, Search,
  Bold, Italic, Strikethrough, Code as CodeIcon, Upload
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Smartphone } from 'lucide-react';

interface QuickMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageSent?: () => void;
}

export function QuickMessageModal({ isOpen, onClose, onMessageSent }: QuickMessageModalProps) {
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'template'>('compose');
  
  const [contacts, setContacts] = useState<any[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [attachedFile, setAttachedFile] = useState<{url: string, type: 'image'|'document', name: string} | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gallery, setGallery] = useState<any[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      try {
        const [sess, c, t, g] = await Promise.all([
          apiFetch(`/api/whatsapp/sessions/${data.user.id}`),
          apiFetch(`/api/contacts/${data.user.id}`),
          apiFetch(`/api/templates/${data.user.id}`),
          apiFetch(`/api/media/${data.user.id}`),
        ]);

        const connectedSess = (sess || []).filter((s: any) => s.status === 'connected');
        setSessions(connectedSess);
        if (connectedSess.length > 0 && !selectedSession) {
          setSelectedSession(connectedSess[0].session_name);
        }

        setContacts(c.contacts || []);
        setTemplates(t || []);
        setGallery(g || []);
      } catch (err) {
        console.error('Failed to load modal data:', err);
      }
    });
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  async function handleSend() {
    if (!user || !message.trim() || !recipient.trim()) {
      toast('Please fill in all fields', 'error');
      return;
    }
    
    setSending(true);
    try {
      const phone = recipient.replace(/[^0-9]/g, '');
      await apiFetch('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: user.id, 
          phone, 
          message, 
          sessionName: selectedSession,
          mediaUrl: attachedFile?.url,
          mediaType: attachedFile?.type
        }),
      });
      toast('Message sent successfully', 'success');
      onMessageSent?.();
      onClose();
      // Reset state
      setMessage('');
      setRecipient('');
      setAttachedFile(null);
    } catch (e: any) {
      toast(e.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `broadcast/${user.id}/${fileName}`;
      await supabase.storage.from('whatsapp-media').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
      setAttachedFile({ 
        url: publicUrl, 
        type: file.type.startsWith('image/') ? 'image' : 'document',
        name: file.name
      });

      // Register in Media Gallery automatically
      await apiFetch('/api/media', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          name: file.name,
          url: publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          size: file.size
        })
      });

      toast('File attached and saved to gallery', 'success');
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(recipient.toLowerCase()) || 
    c.phone?.includes(recipient)
  ).slice(0, 5);

  const insertFormat = (format: string) => {
    const formats: any = {
      bold: '*',
      italic: '_',
      strike: '~',
      code: '```'
    };
    const char = formats[format];
    setMessage(prev => prev + char + char);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground leading-tight">Send Quick Message</h3>
              <p className="text-xs text-muted-foreground font-medium">Send a single message to a recipient</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Device Selection */}
          <div className="space-y-2">
            <CustomSelect
              label="Device"
              value={selectedSession}
              onChange={setSelectedSession}
              options={sessions.map(s => ({
                value: s.session_name,
                label: s.session_name === 'default' ? 'Primary Account' : `${s.session_name} (+${s.phone_number})`,
                icon: <Smartphone className="w-4 h-4 text-emerald-600" />
              }))}
              placeholder={sessions.length === 0 ? "No connected accounts" : "Select device"}
            />
          </div>

          {/* Recipient Input */}
          <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Recipient</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Phone number with country code (e.g. 1234567890)"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setShowContactDropdown(true);
                }}
                onFocus={() => setShowContactDropdown(true)}
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm font-semibold text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>

            {showContactDropdown && filteredContacts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-2xl shadow-xl z-20 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setRecipient(c.phone);
                      setShowContactDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left border-b border-border last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[10px]">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">+{c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</label>
              <div className="flex bg-secondary p-1 rounded-xl border border-border">
                <button 
                  onClick={() => setActiveTab('compose')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${activeTab === 'compose' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Compose
                </button>
                <button 
                  onClick={() => setActiveTab('template')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${activeTab === 'template' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Use Template
                </button>
              </div>
            </div>

            {activeTab === 'compose' ? (
              <div className="group">
                <div className="bg-background border border-border rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full bg-transparent px-4 py-4 text-sm text-foreground placeholder-muted-foreground outline-none resize-none min-h-[120px]"
                  />
                  
                  {/* Styling Bar */}
                  <div className="px-4 py-3 bg-card border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => insertFormat('bold')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                      <button onClick={() => insertFormat('italic')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                      <button onClick={() => insertFormat('strike')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                      <button onClick={() => insertFormat('code')} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Monospace"><CodeIcon className="w-4 h-4" /></button>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">{message.length} chars</span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground font-medium px-2">Use formatting: *bold*, _italic_, ~strikethrough~, ```monospace```</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                {templates.length === 0 && <p className="text-center py-8 text-muted-foreground text-xs italic">No templates available</p>}
                {templates.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => {
                      setMessage(t.content);
                      setActiveTab('compose');
                    }}
                    className="w-full p-4 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all text-left group shadow-sm hover:shadow-md"
                  >
                    <p className="text-xs font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{t.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Media Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Media Library</label>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            
            {attachedFile ? (
              <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center border border-primary/10">
                    {attachedFile.type === 'image' ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">{attachedFile.name}</span>
                </div>
                <button onClick={() => setAttachedFile(null)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-3xl text-muted-foreground hover:text-primary transition-all group"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  <span className="text-[10px] font-semibold uppercase tracking-widest">Upload New</span>
                </button>
                <button 
                  onClick={() => setShowGallery(!showGallery)}
                  className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-3xl text-muted-foreground hover:text-primary transition-all group"
                >
                  <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">From Gallery</span>
                </button>
              </div>
            )}

            {showGallery && (
              <div className="mt-4 bg-background border border-border rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-2 custom-scrollbar">
                {gallery.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-xs italic">Gallery is empty</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {gallery.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => {
                          setAttachedFile({ url: m.url, type: m.type, name: m.name });
                          setShowGallery(false);
                        }}
                        className="p-2 bg-card border border-border rounded-xl hover:border-primary/50 transition-all text-left flex items-center gap-2 group shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-border flex-shrink-0">
                          {m.type === 'image' ? <ImageIcon className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <p className="text-[9px] font-semibold text-card-foreground truncate flex-1">{m.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-card flex items-center justify-end gap-3 sticky bottom-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            disabled={sending || !message.trim() || !recipient.trim()}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
