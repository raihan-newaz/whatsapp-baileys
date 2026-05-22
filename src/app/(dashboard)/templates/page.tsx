'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import {
  FileText, Plus, Trash2, Edit2, Search, Filter, Tag,
  Monitor, RefreshCcw, CheckCircle, XCircle, BarChart2,
  Bold, Italic, Strikethrough, Code, ChevronDown,
  X, AlignLeft, Copy, Eye, MoreHorizontal, User, ChevronLeft, ChevronRight,
  Send, AlertTriangle, ArrowLeft, EyeOff, FolderOpen, Image as ImageIcon,
  Video, FileText as FileDoc, Smile
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Smartphone } from 'lucide-react';

const CATEGORIES = ['Marketing','Transactional','Notification','Promotional','Welcome','Follow Up','Reminder','Survey','Newsletter','Other'];
const FORM_CATEGORIES = ['All Categories', ...CATEGORIES];
const STATUSES = ['All Status', 'Active', 'Inactive'];
const DEVICES = ['All Devices', 'Mobile', 'Desktop', 'API'];
const QUICK_VARS = ['name', 'first_name', 'phone', 'phone_number', 'email', 'company'];
const ALL_VARS = [
  { key: '{{name}}', desc: 'Contact full name', key2: '{{first_name}}', desc2: 'First name only' },
  { key: '{{phone}}', desc: 'Phone number', key2: '{{phone_number}}', desc2: 'Phone number (alternate)' },
  { key: '{{email}}', desc: 'Email address', key2: '{{company}}', desc2: 'Company name' },
  { key: '{{job_title}}', desc: 'Job title', key2: '{{country}}', desc2: 'Country' },
  { key: '{{city}}', desc: 'City', key2: '{{address}}', desc2: 'Address' },
];

function formatPreview(text: string) {
  return text
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~([^~]+)~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/10 rounded px-1 text-xs">$1</code>')
    .replace(/{{([^}]+)}}/g, '<span class="text-green-700 font-semibold">[$1]</span>');
}

const EMPTY_FORM = { name: '', content: '', category: 'Marketing', status: 'Active', description: '', media_url: '', media_type: '', device: '' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gallery picker
  const [showGallery, setShowGallery] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [cardMenu, setCardMenu] = useState<string | null>(null);
  const [cardPage, setCardPage] = useState(1);
  const CARDS_PER_PAGE = 6;
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [testModal, setTestModal] = useState<any | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testSession, setTestSession] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = async (userId: string) => {
    setRefreshing(true);
    try {
      const [t, s] = await Promise.all([
        apiFetch(`/api/templates/${userId}`),
        apiFetch(`/api/whatsapp/sessions/${userId}`),
      ]);
      setTemplates(t || []);
      const connected = (s || []).filter((x: any) => x.status === 'connected');
      setSessions(connected);
      if (connected.length > 0 && !testSession) setTestSession(connected[0].session_name);
    } catch (err: any) {
      toast.error('Failed to load: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      fetchTemplates(data.user.id);
    });
  }, []);

  async function loadGallery() {
    if (!user) return;
    setGalleryLoading(true);
    try {
      const data = await apiFetch(`/api/media/${user.id}`);
      setGalleryMedia(data || []);
    } catch { }
    setGalleryLoading(false);
  }

  function openGallery() { setShowGallery(true); loadGallery(); }

  function pickMedia(item: any) {
    setForm(p => ({ ...p, media_url: item.url || item.file_url, media_type: item.type || item.media_type || 'image' }));
    setShowGallery(false);
  }

  async function handleSave() {
    if (!user || !form.name || !form.content) return toast.error('Template name and content are required.');
    setSaving(true);
    try {
      if (editingId) {
        const data = await apiFetch(`/api/templates/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        setTemplates(prev => prev.map(t => t.id === editingId ? data : t));
        toast.success('Template updated!');
      } else {
        const data = await apiFetch('/api/templates', { method: 'POST', body: JSON.stringify({ userId: user.id, ...form }) });
        setTemplates(prev => [data, ...prev]);
        toast.success('Template created!');
      }
      setView('list'); setEditingId(null); setForm({ ...EMPTY_FORM });
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  }

  function startCreate() { setEditingId(null); setForm({ ...EMPTY_FORM }); setView('create'); }
  function startEdit(t: any) {
    setEditingId(t.id);
    setForm({ name: t.name || '', content: t.content || '', category: t.category || 'Marketing', status: t.status || 'Active', description: t.description || '', media_url: t.media_url || '', media_type: t.media_type || '', device: t.device || '' });
    setView('create');
  }
  function goBack() { setView('list'); setEditingId(null); setForm({ ...EMPTY_FORM }); }

  function insertVar(v: string) {
    const ta = textareaRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const newContent = form.content.slice(0, s) + `{{${v}}}` + form.content.slice(e);
    setForm(p => ({ ...p, content: newContent }));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + v.length + 4; ta.focus(); }, 0);
  }

  function insertFormat(tag: string) {
    const ta = textareaRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const selected = form.content.slice(s, e);
    const wrapped = selected ? `${tag}${selected}${tag}` : `${tag}text${tag}`;
    const newContent = form.content.slice(0, s) + wrapped + form.content.slice(e);
    setForm(p => ({ ...p, content: newContent }));
  }

  async function handleCopy(content: string) { await navigator.clipboard.writeText(content); toast.success('Copied!'); }

  async function handleDuplicate(t: any) {
    if (!user) return;
    try {
      const data = await apiFetch('/api/templates', { method: 'POST', body: JSON.stringify({ userId: user.id, name: `${t.name} (Copy)`, content: t.content, category: t.category, status: t.status, media_url: t.media_url, media_type: t.media_type }) });
      setTemplates(prev => [data, ...prev]);
      toast.success('Duplicated!');
    } catch (err: any) { toast.error(err.message); }
  }

  function handleDelete(id: string, name: string) { setDeleteTarget({ id, name }); }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/templates/${deleteTarget.id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
      toast.success('Template deleted');
      setDeleteTarget(null);
    } catch (err: any) { toast.error(err.message); }
    setDeleting(false);
  }

  async function handleSendTest() {
    if (!testPhone || !testSession || !testModal) return;
    setTestSending(true);
    try {
      await apiFetch('/api/whatsapp/send', { method: 'POST', body: JSON.stringify({ userId: user?.id, sessionName: testSession, phone: testPhone.replace(/\D/g, ''), message: testModal.content }) });
      toast.success('Test sent!'); setTestModal(null); setTestPhone('');
    } catch (err: any) { toast.error(err.message); }
    setTestSending(false);
  }

  const total = templates.length;
  const active = templates.filter(t => (t.status || 'Active') === 'Active').length;
  const inactive = templates.filter(t => t.status === 'Inactive').length;
  const totalUses = templates.reduce((s, t) => s + (t.uses_count || 0), 0);

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.content?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All Status' || (t.status || 'Active') === filterStatus;
    const matchCat = filterCategory === 'All Categories' || t.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });


  // ─── CREATE / EDIT VIEW ─────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="flex flex-col h-full min-h-screen bg-background">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-base font-semibold text-foreground">{editingId ? 'Edit Template' : 'Create New Template'}</h1>
              <p className="text-xs text-muted-foreground">Create a reusable message template for your campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(v => !v)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:bg-secondary transition">
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            {editingId && (
              <button onClick={() => { setTestModal({ ...form, name: form.name }); }} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-foreground hover:bg-secondary transition">
                <Send className="w-4 h-4" /> Test
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm transition disabled:opacity-50 active:scale-95">
              {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Form Panel */}
          <div className={`${showPreview ? 'w-[55%]' : 'w-full'} overflow-y-auto p-6 space-y-6 border-r border-border`}>

            {/* Basic Information */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-0.5">Basic Information</h2>
              <p className="text-xs text-muted-foreground mb-4">Template name, category, and status</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Template Name <span className="text-destructive">*</span></label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Test Template Name" className="input-standard focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <CustomSelect
                    label="Category"
                    value={form.category}
                    onChange={(val) => setForm(p => ({ ...p, category: val }))}
                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Status"
                    value={form.status}
                    onChange={(val) => setForm(p => ({ ...p, status: val }))}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Device (Optional)"
                    value={form.device}
                    onChange={(val) => setForm(p => ({ ...p, device: val }))}
                    options={[
                      { value: '', label: 'All Devices' },
                      ...sessions.map(s => ({ value: s.session_name, label: s.name || s.session_name, icon: <Smartphone className="w-4 h-4" /> }))
                    ]}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Description <span className="text-xs font-normal text-muted-foreground">(Optional)</span></label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this template" className="input-standard focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>
            </div>

            {/* Media Attachment */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-0.5">Media Attachment</h2>
              <p className="text-xs text-muted-foreground mb-4">Attach an image, video, or document (Optional)</p>
              {form.media_url ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-secondary/30">
                  {form.media_type === 'image' ? (
                    <img src={form.media_url} alt="attachment" className="w-full max-h-48 object-cover" onError={e => (e.currentTarget.src = '')} />
                  ) : form.media_type === 'video' ? (
                    <video src={form.media_url} className="w-full max-h-48" controls />
                  ) : (
                    <div className="flex items-center gap-3 p-4"><FileDoc className="w-8 h-8 text-primary" /><span className="text-sm text-foreground truncate">{form.media_url}</span></div>
                  )}
                  <button onClick={() => setForm(p => ({ ...p, media_url: '', media_type: '' }))} className="absolute top-2 right-2 bg-background/90 border border-border p-1.5 rounded-lg hover:bg-secondary transition"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center py-8 gap-2 hover:border-primary/50 transition cursor-pointer" onClick={openGallery}>
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground font-medium">Select from Media Gallery</p>
                </div>
              )}
              {form.media_url && (
                <div className="mt-3 flex gap-3">
                  <CustomSelect
                    value={form.media_type}
                    onChange={(val) => setForm(p => ({ ...p, media_type: val }))}
                    options={[
                      { value: 'image', label: '🖼️ Image' },
                      { value: 'document', label: '📄 Document' },
                      { value: 'video', label: '🎬 Video' },
                      { value: 'audio', label: '🎵 Audio' },
                    ]}
                    className="w-40"
                  />
                  <button onClick={openGallery} className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl text-foreground hover:bg-secondary/80 transition min-h-[56px] mt-10"><FolderOpen className="w-4 h-4" /> Change</button>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-0.5">Message Content</h2>
              <p className="text-xs text-muted-foreground mb-4">Type your message and use variables for personalization</p>
              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 bg-secondary/50 border border-input border-b-0 rounded-t-xl px-3 py-2">
                {[{ icon: Bold, tag: '*' }, { icon: Italic, tag: '_' }, { icon: Strikethrough, tag: '~' }, { icon: Code, tag: '`' }].map(({ icon: Icon, tag }) => (
                  <button key={tag} type="button" onClick={() => insertFormat(tag)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"><Icon className="w-4 h-4" /></button>
                ))}
              </div>
              <textarea ref={textareaRef} required rows={7} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Type your message.. Use {{name}}, {{company}} etc. for personalization"
                className="w-full bg-background border border-input rounded-b-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none leading-relaxed" />
              <p className="text-xs text-muted-foreground mt-1.5">Use <code className="bg-secondary px-1 rounded text-primary font-mono">{'{{variable_name}}'}</code> syntax. Formatting: *bold*, _italic_, ~strike~, `code`</p>

              {/* Quick vars */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Quick Insert Variables</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_VARS.map(v => (
                    <button key={v} type="button" onClick={() => insertVar(v)} className="flex items-center gap-1.5 text-xs bg-secondary/70 border border-border rounded-lg px-3 py-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 font-mono transition text-foreground">
                      <AlignLeft className="w-3 h-3" /> {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Var reference */}
              <div className="bg-secondary/30 border border-border rounded-xl p-4 mt-4">
                <p className="text-xs font-semibold text-foreground mb-3">Available Variables</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                  {ALL_VARS.map(({ key, desc, key2, desc2 }) => (
                    <React.Fragment key={key}>
                      <div className="flex items-center gap-2"><code className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">{key}</code><span className="text-[10px] text-muted-foreground">— {desc}</span></div>
                      <div className="flex items-center gap-2"><code className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">{key2}</code><span className="text-[10px] text-muted-foreground">— {desc2}</span></div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Panel */}
          {showPreview && (
            <div className="w-[45%] flex flex-col bg-secondary/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-primary" /> Live Preview</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">See how your template will appear to recipients</p>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* WA Header */}
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm">M</div>
                  <div className="flex-1"><p className="text-sm font-semibold">Md Raihan Newaz</p><p className="text-[10px] text-white/70">online</p></div>
                  <div className="flex items-center gap-3 text-white/80">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                  </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 bg-[#ECE5DD] dark:bg-[#0d1418] p-4 overflow-y-auto flex flex-col justify-end gap-2">
                  <div className="flex justify-end">
                    <div className="bg-[#DCF8C6] dark:bg-[#005c4b] text-[#111b21] dark:text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                      {form.media_type === 'image' && form.media_url && (
                        <div className="mb-2 rounded-xl overflow-hidden"><img src={form.media_url} alt="attachment" className="w-full max-h-48 object-cover" onError={e => (e.currentTarget.style.display = 'none')} /></div>
                      )}
                      {form.media_type === 'video' && form.media_url && (
                        <div className="mb-2 rounded-xl overflow-hidden bg-black/20 flex items-center justify-center p-4"><Video className="w-8 h-8 text-white/60" /></div>
                      )}
                      {form.media_type === 'document' && form.media_url && (
                        <div className="mb-2 flex items-center gap-2 bg-black/10 rounded-lg p-2"><FileDoc className="w-5 h-5" /><span className="text-xs truncate">Document</span></div>
                      )}
                      {form.content ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: formatPreview(form.content) }} />
                      ) : (
                        <p className="text-sm leading-relaxed text-[#111b21]/50 dark:text-white/40 italic">Your message preview will appear here...</p>
                      )}
                      <p className="text-[9px] text-right mt-1 text-[#111b21]/50 dark:text-white/50">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                      </p>
                    </div>
                  </div>
                </div>

                {/* WA Input bar */}
                <div className="bg-[#F0F2F5] dark:bg-[#1f2c34] px-3 py-2 flex items-center gap-2">
                  <Smile className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-4 py-2 text-sm text-muted-foreground text-[11px]">Type a message</div>
                </div>

                {/* Template name */}
                <div className="px-4 py-3 border-t border-border bg-card">
                  <p className="text-sm font-semibold text-foreground">{form.name || 'Template Name'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gallery Picker Modal */}
        {showGallery && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Select from Media Gallery</h2>
                <button onClick={() => setShowGallery(false)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {galleryLoading ? (
                  <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
                ) : galleryMedia.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No media files found. Upload files in Media Gallery first.</p></div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {galleryMedia.map((item: any) => (
                      <button key={item.id} onClick={() => pickMedia(item)} className="aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-primary transition group relative bg-secondary">
                        {(item.type || item.media_type) === 'image' ? (
                          <img src={item.url || item.file_url} alt={item.filename} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        ) : (item.type || item.media_type) === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-muted-foreground" /></div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><FileDoc className="w-8 h-8 text-muted-foreground" /></div>
                        )}
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test modal */}
        {testModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div><h2 className="font-semibold text-foreground">Test Template</h2><p className="text-xs text-muted-foreground mt-0.5">Send "{testModal.name}" to a phone number</p></div>
                <button onClick={() => { setTestModal(null); setTestPhone(''); }} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <CustomSelect
                    label="Device"
                    value={testSession}
                    onChange={setTestSession}
                    options={sessions.length === 0 
                      ? [{ value: '', label: 'No connected devices' }] 
                      : sessions.map((s: any) => ({ 
                          value: s.session_name, 
                          label: `${s.name || s.session_name} ${s.phone ? `(${s.phone})` : ''}`,
                          icon: <Smartphone className="w-4 h-4" />
                        }))}
                  />
                </div>
                <div><label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Number</label>
                  <input type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="e.g. 8801XXXXXXXXX" className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div className="bg-secondary/40 border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground font-medium mb-2">Message preview:</p><p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{testModal.content}</p></div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setTestModal(null); setTestPhone(''); }} className="flex-1 py-2.5 bg-secondary border border-border text-foreground rounded-xl hover:bg-secondary/80 transition">Cancel</button>
                  <button onClick={handleSendTest} disabled={testSending || !testPhone || !testSession} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm transition disabled:opacity-50">
                    <Send className="w-4 h-4" />{testSending ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 pb-24 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-semibold text-foreground">Message Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create and manage WhatsApp message templates for your campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => { 
              if (user) {
                await fetchTemplates(user.id);
                toast.success('Templates list refreshed');
              }
            }} 
            className="btn-icon" 
            title="Refresh"
            disabled={refreshing}
          >
            <RefreshCcw className={`w-4 h-4 md:w-5 md:h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={startCreate} className="btn-primary">
            <Plus className="w-4 h-4 md:w-5 md:h-5" /> 
            <span className="whitespace-nowrap">Create Template</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: FileText, label: 'Total Templates', value: total, color: 'text-primary', bg: 'bg-primary/10' },
          { icon: CheckCircle, label: 'Active', value: active, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: XCircle, label: 'Inactive', value: inactive, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { icon: BarChart2, label: 'Total Uses', value: totalUses, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition">
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="input-standard pl-10" />
        </div>
        <div className="flex gap-3 flex-wrap">
          <CustomSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={STATUSES.map(s => ({ value: s, label: s }))}
            className="w-40"
          />
          <CustomSelect
            value={filterCategory}
            onChange={setFilterCategory}
            options={FORM_CATEGORIES.map(c => ({ value: c, label: c }))}
            className="w-48"
          />
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-20 text-center shadow-sm">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-muted-foreground" /></div>
          <p className="text-foreground font-semibold text-lg mb-1">No templates found</p>
          <p className="text-muted-foreground text-sm mb-6">{search || filterStatus !== 'All Status' || filterCategory !== 'All Categories' ? 'Try adjusting your filters' : 'Start by creating your first template'}</p>
          <button onClick={startCreate} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm transition"><Plus className="w-4 h-4" /> Create Template</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.slice((cardPage - 1) * CARDS_PER_PAGE, cardPage * CARDS_PER_PAGE).map(t => (
              <div key={t.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate mb-1.5">{t.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide border ${(t.status || 'Active') === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>{t.status || 'Active'}</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">{t.category || 'General'}</span>
                      {t.media_type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border font-medium">{t.media_type === 'image' ? '🖼 Image' : t.media_type === 'document' ? '📄 PDF' : t.media_type === 'video' ? '🎬 Video' : '🎵 Audio'}</span>}
                    </div>
                  </div>
                  <div className="relative ml-2 shrink-0">
                    <button onClick={() => setCardMenu(cardMenu === t.id ? null : t.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"><MoreHorizontal className="w-4 h-4" /></button>
                    {cardMenu === t.id && (
                      <><div className="fixed inset-0 z-30" onClick={() => setCardMenu(null)} />
                      <div className="absolute right-0 top-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl py-1.5 z-40 min-w-[150px] animate-in fade-in zoom-in-95 duration-150">
                        <button onClick={() => { setPreviewTemplate(t); setCardMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-secondary transition"><Eye className="w-3.5 h-3.5" /> Preview</button>
                        <button onClick={() => { startEdit(t); setCardMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-secondary transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                        <button onClick={() => { handleDuplicate(t); setCardMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-secondary transition"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
                        <button onClick={() => { setTestModal(t); setCardMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-secondary transition"><Send className="w-3.5 h-3.5" /> Test</button>
                        <div className="my-1 border-t border-border" />
                        <button onClick={() => { handleDelete(t.id, t.name); setCardMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-destructive hover:bg-destructive/10 transition"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div></>
                    )}
                  </div>
                </div>
                <div className="bg-secondary/40 border border-border/50 rounded-xl p-3 flex-1"><p className="text-foreground text-xs leading-relaxed whitespace-pre-wrap line-clamp-4">{t.content}</p></div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  <a href="#" className="flex items-center gap-1.5 text-primary hover:underline font-medium"><User className="w-3 h-3" />{t.author_name || 'My Account'}</a>
                  <span>{new Date(t.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <p className="font-medium">Showing <span className="text-foreground font-semibold">{Math.min((cardPage - 1) * CARDS_PER_PAGE + 1, filtered.length)}</span> to <span className="text-foreground font-semibold">{Math.min(cardPage * CARDS_PER_PAGE, filtered.length)}</span> of <span className="text-foreground font-semibold">{filtered.length}</span> templates</p>
            <div className="flex items-center gap-2">
              <button disabled={cardPage === 1} onClick={() => setCardPage(p => p - 1)} className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border rounded-xl hover:bg-secondary text-foreground disabled:opacity-40 transition"><ChevronLeft className="w-4 h-4" /> Previous</button>
              <span className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground">Page {cardPage} of {Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE))}</span>
              <button disabled={cardPage >= Math.ceil(filtered.length / CARDS_PER_PAGE)} onClick={() => setCardPage(p => p + 1)} className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border rounded-xl hover:bg-secondary text-foreground disabled:opacity-40 transition">Next <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div><h2 className="font-semibold text-foreground">{previewTemplate.name}</h2><p className="text-xs text-muted-foreground mt-0.5">{previewTemplate.category}</p></div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <div className="bg-[#ECE5DD] dark:bg-[#0d1418] rounded-2xl p-4 flex justify-end">
                <div className="bg-[#DCF8C6] dark:bg-[#005c4b] text-[#111b21] dark:text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[90%] shadow-sm">
                  {previewTemplate.media_type === 'image' && previewTemplate.media_url && <img src={previewTemplate.media_url} alt="" className="w-full rounded-lg mb-2 max-h-40 object-cover" />}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: formatPreview(previewTemplate.content) }} />
                  <p className="text-[9px] text-right mt-1 opacity-50">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setPreviewTemplate(null)} className="flex-1 px-5 py-2.5 bg-secondary border border-border text-foreground rounded-xl hover:bg-secondary/80 transition">Close</button>
                <button onClick={() => { startEdit(previewTemplate); setPreviewTemplate(null); }} className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm transition"><Edit2 className="w-4 h-4" /> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div><h2 className="font-semibold text-foreground">Test Template</h2><p className="text-xs text-muted-foreground mt-0.5">Send "{testModal.name}" to a phone number to test it</p></div>
              <button onClick={() => { setTestModal(null); setTestPhone(''); }} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <CustomSelect
                  label="Device"
                  value={testSession}
                  onChange={setTestSession}
                  options={sessions.length === 0 
                    ? [{ value: '', label: 'No connected devices' }] 
                    : sessions.map((s: any) => ({ 
                        value: s.session_name, 
                        label: `${s.name || s.session_name} ${s.phone ? `(${s.phone})` : ''}`,
                        icon: <Smartphone className="w-4 h-4" />
                      }))}
                />
              </div>
              <div><label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Number</label>
                <input type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="e.g. 8801XXXXXXXXX" className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>
              <div className="bg-secondary/40 border border-border rounded-xl p-4"><p className="text-xs text-muted-foreground font-medium mb-2">Message preview:</p><p className="text-sm text-foreground whitespace-pre-wrap">{testModal.content}</p></div>
              <div className="flex gap-3">
                <button onClick={() => { setTestModal(null); setTestPhone(''); }} className="flex-1 py-2.5 bg-secondary border border-border text-foreground rounded-xl hover:bg-secondary/80 transition">Cancel</button>
                <button onClick={handleSendTest} disabled={testSending || !testPhone || !testSession} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm transition disabled:opacity-50">
                  <Send className="w-4 h-4" />{testSending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 p-6">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-7 h-7 text-destructive" /></div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">Delete Template</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget.name}"</span>? This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-secondary border border-border text-foreground rounded-xl hover:bg-secondary/80 transition">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl shadow-sm transition disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
