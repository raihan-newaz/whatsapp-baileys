'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { 
  Webhook as WebhookIcon, Plus, Trash2, Copy, Check, Filter, Search, 
  MessageSquare, Zap, ChevronDown, X, Info, AlertCircle, ShoppingCart, 
  Code, Settings, Clock, RefreshCcw, Eye
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const HTTP_METHODS = [
  { value: 'POST', label: 'POST' },
  { value: 'GET', label: 'GET' },
  { value: 'PUT', label: 'PUT' }
];

const WEBHOOK_EVENTS = [
  { id: 'message_received', label: 'Message Received' },
  { id: 'message_sent', label: 'Message Sent' },
  { id: 'message_delivered', label: 'Message Delivered' },
  { id: 'message_read', label: 'Message Read' },
  { id: 'message_failed', label: 'Message Failed' }
];

export default function WebhooksPage() {
  const [user, setUser] = useState<any>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ 
    name: '', 
    url: '', 
    method: 'POST', 
    session_id: '', 
    events: [] as string[],
    headers: '',
    retry_count: 3,
    is_active: true,
    timeout: 30
  });
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      await loadAll(data.user.id);
    });
  }, []);

  async function loadAll(uid: string) {
    try {
      const [whData, sRaw] = await Promise.all([
        apiFetch(`/api/webhooks/${uid}`),
        apiFetch(`/api/whatsapp/sessions/${uid}`),
      ]);
      const allSessions = sRaw || [];
      const connected = allSessions.filter((sess: any) => sess.status === 'connected');
      
      setWebhooks(whData || []);
      // Only keep connected sessions for the filter and create dropdowns
      setSessions(connected);
      
      if (connected.length > 0) setForm(p => ({ ...p, session_id: connected[0].id }));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      await apiFetch('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, ...form }),
      });
      setForm({ 
        name: '', 
        url: '', 
        method: 'POST', 
        session_id: sessions[0]?.id || '', 
        events: [],
        headers: '',
        retry_count: 3,
        is_active: true,
        timeout: 30
      });
      await loadAll(user.id);
      setShowCreate(false);
      toast('Webhook created successfully', 'success');
    } catch (err: any) { 
      toast(err.message, 'error'); 
    }
    setCreating(false);
  }

  async function handleToggle(id: string) {
    const { is_active } = await apiFetch(`/api/webhooks/${id}/toggle`, { method: 'PATCH' });
    setWebhooks((prev: any[]) => prev.map((w: any) => w.id === id ? { ...w, is_active } : w));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook?')) return;
    await apiFetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    setWebhooks((prev: any[]) => prev.filter((w: any) => w.id !== id));
    toast('Webhook deleted', 'success');
  }

  function copyApiKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function copyTriggerUrl(w: any) {
    const isWoo = w.trigger_event && w.trigger_event !== 'generic';
    const endpoint = isWoo ? 'woocommerce' : 'trigger';
    const key = w.api_key || w.secret_token;
    const url = `${BACKEND_URL}/api/webhooks/${endpoint}/${key}`;
    navigator.clipboard.writeText(url);
    setCopiedKey(`url_${w.id}`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const filteredWebhooks = webhooks.filter((w: any) => {
    // 1. Search Filter
    const searchLow = (search || '').trim().toLowerCase();
    if (searchLow) {
      const nameMatch = (w.name?.toLowerCase() || '').includes(searchLow);
      const urlMatch = (w.url?.toLowerCase() || '').includes(searchLow);
      if (!nameMatch && !urlMatch) return false;
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      const isActive = w.is_active === true || Number(w.is_active) === 1;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
    }

    // 3. Device Filter
    if (deviceFilter !== 'all') {
      const webhookSid = String(w.session_id || '').trim();
      const filterSid = String(deviceFilter || '').trim();
      if (webhookSid !== filterSid) return false;
    }

    return true;
  });

  return (
    <div className="p-4 md:p-8 pb-24 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-foreground flex items-center gap-3">
             <WebhookIcon className="w-8 h-8 text-primary" /> Webhooks
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Receive real-time events from your WhatsApp connections</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
               if (user) {
                 await loadAll(user.id);
                 toast('Webhooks refreshed', 'success');
               }
            }}
            className="btn-icon"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" /> New Webhook
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-4 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="relative w-full xl:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search webhooks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-input pl-11 pr-4 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:font-medium shadow-inner"
            style={{ 
              height: 'var(--comp-height)',
              borderRadius: 'var(--comp-radius)'
            }}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <CustomSelect
            value={deviceFilter}
            onChange={setDeviceFilter}
            icon={<Filter className="w-4 h-4" />}
            options={[
              { value: 'all', label: 'All Devices' },
              ...sessions.map(s => ({ value: s.id, label: s.session_name }))
            ]}
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            icon={<Zap className="w-4 h-4" />}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm min-h-[400px]">
        {webhooks.length === 0 ? (
          <div className="p-12 h-full flex flex-col items-center justify-center text-center">
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
               <div className="w-20 h-20 rounded-3xl bg-secondary/50 flex items-center justify-center mx-auto shadow-inner border border-border">
                  <WebhookIcon className="w-10 h-10 text-muted-foreground/50" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-foreground">No webhooks</h3>
                  <p className="text-muted-foreground mt-2 font-medium max-w-sm mx-auto">
                     Create your first webhook to receive real-time events and automate your workflow with external apps.
                  </p>
               </div>
               <button
                 onClick={() => setShowCreate(true)}
                 className="flex items-center gap-2 bg-background border border-border hover:bg-secondary text-foreground font-semibold px-6 py-3 rounded-2xl mx-auto transition-all shadow-sm active:scale-95"
               >
                 <Plus className="w-4 h-4" /> Create Webhook
               </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/30 border-b border-border">
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Hits</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Details</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Events</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredWebhooks.map((w: any) => (
                  <tr key={w.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-6">
                      <button 
                        onClick={() => handleToggle(w.id)}
                        className={`relative w-11 h-5 rounded-full transition-all duration-300 ${w.is_active ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${w.is_active ? 'left-6' : 'left-1'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <span className="inline-flex items-center justify-center w-10 h-10 bg-secondary/50 rounded-2xl text-sm font-bold text-foreground border border-border shadow-inner">
                          {w.total_triggered || w.received_count || 0}
                       </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-foreground">{w.name}</span>
                        <div className="flex items-center gap-2 text-primary">
                           <Zap className="w-3.5 h-3.5 fill-current opacity-70" />
                           <code className="text-[11px] font-mono font-bold truncate max-w-[200px]">{w.url}</code>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground/60">
                           <ShoppingCart className="w-3 h-3" />
                           <span className="text-[10px] font-bold uppercase tracking-wide italic">
                              Device: {sessions.find(s => String(s.id) === String(w.session_id))?.session_name || 'Disconnected'}
                           </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-medium">
                      <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                        {Array.isArray(w.events) && w.events.length > 0 ? (
                          w.events.map((ev: string) => (
                            <span key={ev} className="text-[9px] font-bold uppercase tracking-tight bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                               {ev.split('_').join(' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-tight bg-secondary text-muted-foreground/70 px-2 py-0.5 rounded-md italic">
                             All Events
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-2">
                         <button 
                           onClick={() => copyTriggerUrl(w)}
                           className="p-2.5 rounded-xl bg-background border border-border hover:bg-secondary text-muted-foreground hover:text-primary transition-all shadow-sm active:scale-95 group/btn"
                           title="Copy Webhook URL"
                         >
                            {copiedKey === `url_${w.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                         </button>
                         <button 
                           onClick={() => copyApiKey(w.api_key || w.secret_token)}
                           className="p-2.5 rounded-xl bg-background border border-border hover:bg-secondary text-muted-foreground hover:text-primary transition-all shadow-sm active:scale-95"
                           title="Copy Secret Token"
                         >
                            {copiedKey === (w.api_key || w.secret_token) ? <Check className="w-4 h-4 text-emerald-500" /> : <RefreshCcw className="w-4 h-4" />}
                         </button>
                         <button 
                           onClick={() => handleDelete(w.id)}
                           className="p-2.5 rounded-xl bg-background border border-border hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-all shadow-sm active:scale-95"
                           title="Delete Webhook"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="pt-12 flex items-center justify-center text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
         ©2026 Wa Cloud · Powered by <a href="#" className="underline decoration-primary/30 text-primary/80">Globyn</a> · Made in Bangladesh
      </footer>

      {/* Create Webhook Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">Create Webhook</h2>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">Configure a new webhook endpoint</p>
              </div>
              <button 
                onClick={() => setShowCreate(false)}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect
                  label="Device *"
                  value={form.session_id}
                  onChange={(val) => setForm(p => ({ ...p, session_id: val }))}
                  options={sessions.map(s => ({ value: s.id, label: s.session_name }))}
                  placeholder="Select device"
                />
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-2 px-1">Name *</label>
                  <input 
                    required 
                    value={form.name} 
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. n8n Integration"
                    className="w-full bg-background border border-input rounded-2xl px-5 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-inner" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-2 px-1">Webhook URL *</label>
                <input 
                  required 
                  type="url"
                  value={form.url} 
                  onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://your-webhook-url.com/webhook"
                  className="w-full bg-background border border-input rounded-2xl px-5 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-inner" 
                />
                <p className="text-[10px] text-muted-foreground/60 font-semibold mt-1.5 px-1 tracking-wide italic">n8n compatible webhook URL</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect
                  label="HTTP Method"
                  value={form.method}
                  onChange={(val) => setForm(p => ({ ...p, method: val }))}
                  options={HTTP_METHODS}
                />
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-2 px-1">Timeout (seconds)</label>
                  <input 
                    type="number"
                    value={form.timeout} 
                    onChange={e => setForm(p => ({ ...p, timeout: Number(e.target.value) }))}
                    className="w-full bg-background border border-input rounded-2xl px-5 py-3.5 text-foreground text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-inner" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-3 px-1">Events</label>
                <p className="text-[11px] text-muted-foreground mb-4 px-1 font-medium italic">Select specific events or leave empty for all events</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 bg-secondary/20 p-5 rounded-[1.5rem] border border-border/50 shadow-inner">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev.id} className="flex items-center gap-3 group cursor-pointer">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={form.events.includes(ev.id)}
                          onChange={() => {
                            const newEv = form.events.includes(ev.id) 
                              ? form.events.filter(i => i !== ev.id)
                              : [...form.events, ev.id];
                            setForm(p => ({ ...p, events: newEv }));
                          }}
                          className="peer appearance-none w-5 h-5 rounded-full border-2 border-border checked:bg-primary checked:border-primary transition-all duration-300 cursor-pointer"
                        />
                        <Check className="absolute w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-all duration-300 pointer-events-none" strokeWidth={4} />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{ev.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-2 px-1">Custom Headers (JSON)</label>
                <textarea 
                  value={form.headers} 
                  onChange={e => setForm(p => ({ ...p, headers: e.target.value }))}
                  placeholder={`{"Authorization": "Bearer token"}`}
                  className="w-full bg-background border border-input rounded-[1.5rem] px-5 py-4 text-foreground placeholder:text-muted-foreground/40 text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-inner min-h-[100px]"
                />
                <p className="text-[10px] text-muted-foreground/60 font-semibold mt-1.5 px-1 tracking-wide italic">Optional JSON object with custom headers</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="w-1/2">
                   <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-2 px-1">Retry Count</label>
                   <input 
                    type="number"
                    value={form.retry_count} 
                    onChange={e => setForm(p => ({ ...p, retry_count: Number(e.target.value) }))}
                    className="w-24 bg-background border border-input rounded-2xl px-5 py-3 text-foreground text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-inner" 
                  />
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-sm font-bold text-foreground">Active</span>
                   <button 
                    type="button"
                    onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.is_active ? 'bg-primary' : 'bg-muted'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${form.is_active ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreate(false)} 
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-2xl py-4 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl py-4 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
