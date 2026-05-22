'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { 
  ScrollText, Download, Trash2, Image as ImageIcon, FileText, 
  MessageSquare, Plus, Search, Filter, ChevronDown, 
  CheckCircle2, Clock, AlertCircle, RefreshCcw, MoreHorizontal,
  Database, Eye, X, Check, CheckCheck, Send, Reply
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { QuickMessageModal } from '@/components/QuickMessageModal';
import { CustomSelect } from '@/components/ui/CustomSelect';

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (date: string | null) => {
  if (!date) return null;
  const d = new Date(date);
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  };
};

/** Calculate elapsed time between two timestamps like "3m 12s" */
function elapsedTime(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;
  const diffMs = new Date(to).getTime() - new Date(from).getTime();
  if (diffMs <= 0) return null;
  const secs  = Math.floor(diffMs / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins  > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

/** Baileys ack: 0=pending, 1=sent(queued), 2=delivered, 3=read */
function AckBadge({ ack, status }: { ack: number; status: string }) {
  if (status === 'failed') return (
    <span className="bg-destructive/5 text-destructive px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-destructive/20 flex items-center w-fit gap-1 shadow-sm whitespace-nowrap">
      <AlertCircle className="w-3 h-3" /> Failed
    </span>
  );
  if (ack >= 3) return (
    <span className="bg-violet-500/5 text-violet-600 dark:text-violet-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-violet-500/20 flex items-center w-fit gap-1 shadow-sm whitespace-nowrap">
      <Eye className="w-3 h-3" /> Seen
    </span>
  );
  if (ack === 2) return (
    <span className="bg-blue-500/5 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-blue-500/20 flex items-center w-fit gap-1 shadow-sm whitespace-nowrap">
      <CheckCheck className="w-3 h-3" /> Delivered
    </span>
  );
  if (ack === 1) return (
    <span className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-emerald-500/20 flex items-center w-fit gap-1 shadow-sm whitespace-nowrap">
      <Check className="w-3 h-3" /> Sent
    </span>
  );
  return (
    <span className="bg-zinc-500/5 text-zinc-500 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-zinc-500/10 flex items-center w-fit gap-1 whitespace-nowrap">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

// ── Details Modal ─────────────────────────────────────────────────────────

function MessageDetailsModal({ isOpen, onClose, log }: { isOpen: boolean; onClose: () => void; log: any }) {
  if (!isOpen || !log) return null;

  const sentTs      = fmt(log.sent_at || log.created_at);
  const deliveredTs = fmt(log.delivered_at);
  const readTs      = fmt(log.read_at);
  const deliveryElapsed = elapsedTime(log.sent_at || log.created_at, log.delivered_at);
  const readElapsed     = elapsedTime(log.sent_at || log.created_at, log.read_at);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Message Details</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors border border-border">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare className="w-5 h-5" />
             </div>
             <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Sent to</span>
                <span className="text-lg font-semibold text-foreground">{log.contactName || log.phone}</span>
             </div>
          </div>

          <div className="space-y-3">
             <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest ml-1">Content</p>
             <div className="bg-secondary/50 border border-border rounded-2xl p-5 text-sm font-medium text-foreground leading-relaxed">
                {log.message || <span className="italic opacity-50">No text content</span>}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
             <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] mb-2.5">Source</p>
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest border ${log.campaign_name ? 'bg-primary/5 text-primary border-primary/20' : 'bg-cyan-500/5 text-cyan-600 border-cyan-500/20 dark:text-cyan-400'}`}>
                  {log.source || (log.campaign_name ? 'Campaign' : 'Quick')}
                </span>
             </div>
             <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] mb-2.5">Type</p>
                <span className="bg-secondary px-4 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-foreground/70 border border-border">
                  {log.media_type || 'Text'}
                </span>
             </div>
             <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] mb-2.5">Status</p>
                <AckBadge ack={log.ack ?? 0} status={log.status} />
             </div>
             <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] mb-2.5">Reply Status</p>
                {log.has_reply ? (
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                    <Reply className="w-3 h-3" /> Replied
                  </span>
                ) : (
                  <span className="bg-secondary px-4 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border border-border">
                    No Reply
                  </span>
                )}
             </div>
          </div>

          {/* Timestamps grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
             <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] mb-1.5">Sent At</p>
                {sentTs ? (
                  <div>
                    <div className="text-xs font-semibold text-foreground">{sentTs.date}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{sentTs.time}</div>
                  </div>
                ) : <span className="text-muted-foreground text-xs">—</span>}
             </div>
             <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] mb-1.5">Delivered At</p>
                {deliveredTs ? (
                  <div>
                    <div className="text-xs font-semibold text-foreground">{deliveredTs.date}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{deliveredTs.time}</div>
                    {deliveryElapsed && <div className="text-[9px] text-blue-500 mt-0.5 font-semibold">+{deliveryElapsed}</div>}
                  </div>
                ) : <span className="text-muted-foreground text-xs">—</span>}
             </div>
             <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] mb-1.5">Seen At</p>
                {readTs ? (
                  <div>
                    <div className="text-xs font-semibold text-foreground">{readTs.date}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{readTs.time}</div>
                    {readElapsed && <div className="text-[9px] text-violet-500 mt-0.5 font-semibold">+{readElapsed}</div>}
                  </div>
                ) : <span className="text-muted-foreground text-xs">—</span>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function MessageHistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsLog, setDetailsLog] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  // Compute dynamic filter options with normalized fallback
  const dynamicSources = ['all', ...Array.from(new Set(logs.map((l: any) => l.source || (l.campaign_name ? 'campaign' : 'direct'))))] as string[];
  const dynamicTypes = ['all', ...Array.from(new Set(logs.map((l: any) => {
    if (!l.media_url) return 'text';
    const mt = (l.media_type || '').toLowerCase();
    if (mt.includes('image')) return 'image';
    if (mt.includes('video')) return 'video';
    if (mt.includes('audio')) return 'audio';
    if (mt.includes('document')) return 'document';
    return 'media';
  })))] as string[];
  const dynamicSessions = ['all', ...Array.from(new Set(logs.map((l: any) => l.session_name || 'default')))] as string[];

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);
    try {
      const data = await apiFetch(`/api/logs/${user.id}?limit=200`);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm('Are you sure you want to delete this log entry?')) return;
    try {
      const data = await apiFetch(`/api/logs/message/${id}?userId=${user.id}`, { method: 'DELETE' });
      if (data.success) {
        setLogs(prev => prev.filter(l => l.id !== id));
        toast('Message log deleted', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Delete failed', 'error');
    }
  }

  const exportCSV = () => {
    const headers = ['Contact', 'Device', 'Source', 'Type', 'Status', 'Reply', 'Sent At', 'Delivered At', 'Seen At', 'Delivery Time'].join(',');
    const rows = filtered.map(l => [
      l.phone,
      l.session_name || 'Primary',
      l.source || (l.campaign_name ? 'Campaign' : 'Quick'),
      l.media_type || 'Text',
      l.status + (l.ack >= 3 ? ' (seen)' : l.ack === 2 ? ' (delivered)' : ''),
      l.has_reply ? 'Replied' : 'No Reply',
      l.sent_at || l.created_at,
      l.delivered_at || '',
      l.read_at || '',
      elapsedTime(l.sent_at || l.created_at, l.delivered_at) || ''
    ].map(v => `"${v}"`).join(','));
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'message_history.csv';
    a.click();
  };

  // ── Filtering ───────────────────────────────────────────────────────────
  const filtered = logs.filter(l => {
    if (l.status === 'extracted' || l.phone === 'Extraction') return false;

    // Status filter — Baileys hierarchical: 0=pending, 1=sent, 2=delivered, 3=read
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'seen'      && l.ack >= 3) ||
      (statusFilter === 'delivered' && l.ack >= 2) ||
      (statusFilter === 'sent'      && l.ack >= 1) ||
      (statusFilter === 'pending'   && (l.ack <= 0 || l.status === 'pending') && l.status !== 'failed') ||
      (statusFilter === 'failed'    && l.status === 'failed');

    // Reply filter
    const matchesReply =
      replyFilter === 'all' ||
      (replyFilter === 'replied'   && l.has_reply) ||
      (replyFilter === 'no_reply'  && !l.has_reply);

    const logSource = l.source || (l.campaign_name ? 'campaign' : 'direct');
    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'direct' ? logSource === 'direct' : logSource === sourceFilter);

    const logSession = l.session_name || 'default';
    const matchesSession =
      sessionFilter === 'all' || logSession === sessionFilter;

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'text'  && !l.media_url) ||
      (typeFilter === 'image' && l.media_url && (l.media_type || '').toLowerCase().includes('image')) ||
      (typeFilter === 'video' && l.media_url && (l.media_type || '').toLowerCase().includes('video')) ||
      (typeFilter === 'audio' && l.media_url && (l.media_type || '').toLowerCase().includes('audio')) ||
      (typeFilter === 'document' && l.media_url && (l.media_type || '').toLowerCase().includes('document')) ||
      (typeFilter === 'media' && !!l.media_url);

    const matchesSearch =
      !search ||
      l.phone?.includes(search) ||
      l.message?.toLowerCase().includes(search.toLowerCase()) ||
      l.campaign_name?.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesReply && matchesSource && matchesSession && matchesType && matchesSearch;
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen pb-24">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" /> Message History
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">View and manage all sent messages from your platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => { await fetchLogs(); toast('Message history refreshed', 'success'); }}
            className="btn-icon"
            title="Refresh Logs"
          >
            <RefreshCcw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Quick Message
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-4 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="relative w-full xl:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-input pl-11 pr-4 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:font-medium shadow-inner"
            style={{ height: 'var(--comp-height)', borderRadius: 'var(--comp-radius)' }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full xl:w-auto">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            icon={<Filter className="w-4 h-4" />}
            options={[
              { value: 'all',       label: 'All Status' },
              { value: 'seen',      label: 'Seen' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'sent',      label: 'Sent' },
              { value: 'pending',   label: 'Pending' },
              { value: 'failed',    label: 'Failed' },
            ]}
          />
          <CustomSelect
            value={replyFilter}
            onChange={setReplyFilter}
            icon={<Reply className="w-4 h-4" />}
            options={[
              { value: 'all',      label: 'All Replies' },
              { value: 'replied',  label: 'Replied' },
              { value: 'no_reply', label: 'No Reply' },
            ]}
          />
          <CustomSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            icon={<Database className="w-4 h-4" />}
            options={dynamicSources.map(s => {
              let label = s.charAt(0).toUpperCase() + s.slice(1);
              if (s === 'all') label = 'All Sources';
              else if (s === 'direct') label = 'Direct';
              else if (s === 'api') label = 'API';
              return { value: s, label };
            })}
          />
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            icon={<MessageSquare className="w-4 h-4" />}
            options={dynamicTypes.map(t => ({
              value: t,
              label: t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)
            }))}
          />
          <CustomSelect
            value={sessionFilter}
            onChange={setSessionFilter}
            icon={<Send className="w-4 h-4" />}
            options={dynamicSessions.map(s => ({
              value: s,
              label: s === 'all' ? 'All Devices' : (s === 'default' ? 'Primary' : s.charAt(0).toUpperCase() + s.slice(1))
            }))}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/30 border-b border-border">
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[120px]">Contact</th>
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[80px]">Device</th>
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[80px]">Source</th>
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[60px]">Type</th>
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[100px]">Status</th>
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[100px]">Reply</th>
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[120px]">Date Sent</th>
                <th className="py-4 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[120px]">Delivery Time</th>
                <th className="py-4 px-4 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-widest min-w-[70px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-semibold uppercase tracking-widest text-[10px]">No messages found</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(log => {
                const sentTs = fmt(log.sent_at || log.created_at);
                const deliveredTs = fmt(log.delivered_at);
                const readTs = fmt(log.read_at);
                // Delivery time = time until delivered or read (whichever is available first)
                const deliveryElapsed = elapsedTime(
                  log.sent_at || log.created_at,
                  log.delivered_at || log.read_at
                );

                return (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors group">
                    {/* Contact */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-semibold text-foreground tracking-tight">
                            {/^\d+$/.test(log.phone) ? `+${log.phone}` : log.phone}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 font-medium">{log.session_name || 'Primary'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Device */}
                    <td className="py-4 px-4 text-[12px] text-muted-foreground font-medium">
                      {log.session_name === 'default' ? 'Primary' : (log.session_name || '—')}
                    </td>

                    {/* Source */}
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border shadow-sm whitespace-nowrap 
                        ${log.source === 'campaign' ? 'bg-primary/5 text-primary border-primary/20' : 
                          log.source === 'group'    ? 'bg-amber-500/5 text-amber-500 border-amber-500/20' :
                          log.source === 'api'      ? 'bg-purple-500/5 text-purple-500 border-purple-500/20' :
                          'bg-cyan-500/5 text-cyan-500 border-cyan-500/20 dark:text-cyan-400'}`}>
                        {log.source || (log.campaign_name ? 'Campaign' : 'Quick')}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-4">
                      <span className="bg-secondary px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest text-foreground/70 border border-border whitespace-nowrap">
                        {log.media_type || 'Text'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <AckBadge ack={log.ack ?? 0} status={log.status} />
                    </td>

                    {/* Reply Status */}
                    <td className="py-4 px-4">
                      {log.has_reply ? (
                        <span className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-emerald-500/20 flex items-center w-fit gap-1 shadow-sm whitespace-nowrap">
                          <Reply className="w-3 h-3" /> Replied
                        </span>
                      ) : (
                        <span className="bg-secondary px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border border-border whitespace-nowrap">
                          No Reply
                        </span>
                      )}
                    </td>

                    {/* Date Sent */}
                    <td className="py-4 px-4 text-[12px] text-muted-foreground font-medium whitespace-nowrap">
                      {sentTs ? (
                        <>
                          <div className="text-foreground font-semibold">{sentTs.date}</div>
                          <div className="text-[10px] mt-0.5 opacity-70">{sentTs.time}</div>
                        </>
                      ) : '—'}
                    </td>

                    {/* Delivery Time */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {deliveryElapsed ? (
                        <div>
                          <div className="text-[12px] font-semibold text-foreground">{deliveryElapsed}</div>
                          {deliveredTs && (
                            <div className="text-[10px] text-blue-500 mt-0.5">{deliveredTs.time}</div>
                          )}
                          {!deliveredTs && readTs && (
                            <div className="text-[10px] text-violet-500 mt-0.5">{readTs.time}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => { setDetailsLog(log); setShowDetails(true); }}
                        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ml-1 opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-secondary/30 border-t border-border flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
            Showing {filtered.length} of {logs.length} messages
          </p>
          <div className="flex gap-2">
            <button disabled className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground disabled:opacity-50">1</button>
          </div>
        </div>
      </div>

      <p className="text-center text-zinc-400 text-[10px] font-semibold uppercase tracking-[0.2em] py-8">
        Designed for Excellence · Handcrafted for WaCloud · ©2026
      </p>

      <MessageDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        log={detailsLog}
      />

      <QuickMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMessageSent={fetchLogs}
      />
    </div>
  );
}
