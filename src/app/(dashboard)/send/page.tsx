'use client';

import { useEffect, useState, useRef } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import {
  Send, Plus, X, Users, MessageSquare, Loader2, CheckCircle2,
  XCircle, Phone, ChevronDown, ChevronUp, Paperclip, FileText, 
  Image as ImageIcon, Clock, Smartphone, Trash2, Search, AlertCircle
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function SendMessagePage() {
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ phone: string; ok: boolean; error?: string }[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [delay, setDelay] = useState(3);
  const [attachedFile, setAttachedFile] = useState<{url: string, type: 'image'|'document', name: string} | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      try {
        const [sess, c, t] = await Promise.all([
          apiFetch(`/api/whatsapp/sessions/${data.user.id}`),
          apiFetch(`/api/contacts/${data.user.id}`),
          apiFetch(`/api/templates/${data.user.id}`),
        ]);

        const connectedSess = (sess || []).filter((s: any) => s.status === 'connected');
        setSessions(connectedSess);
        if (connectedSess.length > 0) {
          setSelectedSessionName(connectedSess[0].session_name);
        }

        setContacts(c.contacts || []);
        setTemplates(t || []);
      } catch (err) {
        console.error('Failed to load send page data:', err);
      }
    });
  }, []);

  function addPhone() { setPhones([...phones, '']); }
  function removePhone(i: number) { setPhones(phones.filter((_, idx) => idx !== i)); }
  function updatePhone(i: number, v: string) { const p = [...phones]; p[i] = v; setPhones(p); }

  function importContact(contact: any) {
    const phone = contact.phone?.replace(/[^0-9]/g, '');
    if (!phone) return;
    if (!phones.includes(phone)) {
      setPhones(prev => prev[0] === '' ? [phone] : [...prev.filter(Boolean), phone]);
    }
    toast(`Added ${contact.name}`, 'success');
  }

  async function handleSend() {
    if (!user || !message.trim()) return;
    const validPhones = phones.filter(p => p.trim().replace(/[^0-9]/g, '').length >= 5);
    if (validPhones.length === 0) return;

    setSending(true);
    setResults([]);
    const res: typeof results = [];

    for (let i = 0; i < validPhones.length; i++) {
      const phone = validPhones[i].replace(/[^0-9]/g, '');
      try {
        await apiFetch('/api/whatsapp/send', {
          method: 'POST',
          body: JSON.stringify({ 
            userId: user.id, 
            phone, 
            message, 
            sessionName: selectedSessionName,
            mediaUrl: attachedFile?.url,
            mediaType: attachedFile?.type
          }),
        });
        res.push({ phone, ok: true });
      } catch (e: any) {
        res.push({ phone, ok: false, error: e.message });
      }
      setResults([...res]);

      if (i < validPhones.length - 1) {
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }
    setSending(false);
    toast('Send operation complete', 'success');
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

      toast('File attached successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone?.includes(contactSearch)
  );

  const validCount = phones.filter(p => p.trim().replace(/[^0-9]/g, '').length >= 5).length;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-foreground flex items-center gap-3">
            <Send className="w-8 h-8 text-primary" /> Broadcast Messenger
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Send bulk WhatsApp messages to multiple recipients with custom delays</p>
        </div>
      </div>

      {!sessions.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 uppercase tracking-tighter text-sm">Action Required</h3>
            <p className="text-amber-700 font-medium text-xs">No active WhatsApp sessions found. Please connect an account in the Setup section before sending messages.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: Setup & Recipients */}
        <div className="lg:col-span-1 space-y-8">
          {/* Account Selection */}
          <section className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Smartphone className="w-3 h-3" /> Sending Account
            </h3>
            <div className="w-full">
              <CustomSelect
                value={selectedSessionName}
                onChange={(val) => setSelectedSessionName(val)}
                options={sessions.map(s => ({
                  value: s.session_name,
                  label: `${s.session_name === 'default' ? 'Primary Account' : s.session_name} (+${s.phone_number})`
                }))}
                icon={<Smartphone className="w-4 h-4 text-primary" />}
              />
            </div>
          </section>

          {/* Recipients List */}
          <section className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Users className="w-3 h-3" /> Recipients ({validCount})
              </h3>
              <button
                onClick={() => setShowContactPicker(!showContactPicker)}
                className="btn-secondary !py-1.5 !px-3 font-semibold text-[10px] tracking-widest text-primary uppercase"
              >
                {showContactPicker ? 'Close Picker' : 'From Contacts'}
              </button>
            </div>

            {showContactPicker && (
              <div className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => importContact(c)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-background rounded-xl transition-all text-left group"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[10px]">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-[9px] text-muted-foreground">+{c.phone}</p>
                      </div>
                      <Plus className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {phones.map((phone, i) => (
                <div key={i} className="flex gap-2 group">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => updatePhone(i, e.target.value)}
                      placeholder="88017..."
                      className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  {phones.length > 1 && (
                    <button onClick={() => removePhone(i)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addPhone}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-2xl text-muted-foreground hover:text-primary tracking-widest transition-all"
            >
              <Plus className="w-3 h-3" /> Add Number
            </button>

            <div className="pt-4 border-t border-border">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 block">Message Delay (Seconds)</label>
              <div className="flex items-center gap-4 bg-background p-3 rounded-2xl border border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={delay}
                  onChange={e => setDelay(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-semibold text-foreground w-8">{delay}s</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right column: Message Content & Preview */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Message Details
              </h3>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="font-medium uppercase text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all"
              >
                {showTemplates ? 'Show Editor' : 'Use Template'} {showTemplates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showTemplates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setMessage(t.content); setShowTemplates(false); }}
                    className="p-4 bg-background border border-border rounded-2xl hover:border-primary/30 transition-all text-left shadow-sm group"
                  >
                    <p className="text-xs font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{t.content}</p>
                  </button>
                ))}
                {templates.length === 0 && <p className="col-span-2 text-center py-12 text-muted-foreground font-medium italic">No templates available</p>}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-background border border-border rounded-3xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary transition-all">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Write your broadcast message here..."
                    rows={8}
                    className="w-full bg-transparent p-6 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none resize-none"
                  />
                  <div className="px-6 py-4 bg-card border-t border-border flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{message.length} Characters</span>
                    <p className="text-[10px] text-muted-foreground font-medium">Use *bold*, _italic_ for formatting</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest pl-1">Attachment (Optional)</h4>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  
                  {attachedFile ? (
                    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-in zoom-in-95">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-primary/10">
                          {attachedFile.type === 'image' ? <ImageIcon className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground truncate">{attachedFile.name}</p>
                          <p className="text-[9px] font-semibold text-primary uppercase">{attachedFile.type}</p>
                        </div>
                      </div>
                      <button onClick={() => setAttachedFile(null)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-all">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-3 py-6 border-2 border-dashed border-border hover:border-primary/30 hover:bg-primary/5 rounded-3xl text-muted-foreground hover:text-primary transition-all group"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5 group-hover:rotate-45 transition-transform" />}
                      <span className="text-sm font-semibold uppercase tracking-widest">Attach Media Gallery File</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center gap-6">
              <button
                onClick={handleSend}
                disabled={sending || !sessions.length || !message.trim() || validCount === 0}
                className="btn-primary flex-1 md:flex-none md:min-w-[280px]"
              >
                {sending ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin mr-3" /> : <Send className="w-5 h-5 md:w-6 md:h-6 mr-3" />}
                <span className="text-sm md:text-base">
                  {sending ? 'Processing Broadcast...' : `Send to ${validCount} People`}
                </span>
              </button>
              
              {results.length > 0 && !sending && (
                <div className="bg-background px-6 py-4 rounded-2xl border border-border flex items-center gap-4">
                   <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-xs font-semibold text-foreground">{results.filter(r => r.ok).length} Done</span></div>
                   <div className="w-px h-4 bg-border" />
                   <div className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-destructive" /><span className="text-xs font-semibold text-foreground">{results.filter(r => !r.ok).length} Failed</span></div>
                </div>
              )}
            </div>
          </section>

          {/* Results Detailed Table */}
          {results.length > 0 && (
            <section className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 transition-all">
              <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Transmission Status</h3>
                <span className="text-[10px] font-semibold text-muted-foreground">{results.length} Total</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-border">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-6"><span className="text-xs font-semibold text-foreground">+{r.phone}</span></td>
                        <td className="py-3 px-6">
                           {r.ok ? (
                             <span className="text-[10px] text-green-500 font-semibold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Transmitted</span>
                           ) : (
                             <div className="flex flex-col">
                               <span className="text-[10px] text-destructive font-semibold uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Error</span>
                               <span className="text-[9px] text-muted-foreground font-medium">{r.error}</span>
                             </div>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
