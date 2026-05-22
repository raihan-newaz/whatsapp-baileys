'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { 
  Megaphone, Play, Pause, Plus, Copy, ArrowLeft, Eye, 
  Settings, FileText, Users, User, Clock, ChevronRight, ChevronLeft,
  Phone, Shield, Shuffle, Info, Smile, Paperclip, Send,
  MoreVertical, Video, CheckCircle2, Search, X, ChevronDown, RefreshCcw,
  Smartphone, ShieldCheck, Check, AlignLeft, ImageIcon, MessageSquare, Hourglass, Timer,
  Calendar, RefreshCw, CheckCheck, Mic, Zap, Monitor
} from 'lucide-react';
import React from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useToast } from '@/context/ToastContext';

const STATUS_COLOR: Record<string, string> = {
  running: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  draft: 'bg-secondary text-muted-foreground border-border',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', 
    template_id: '', 
    group_id: '', 
    sessionName: '', 
    interval_seconds: 15, 
    daily_limit: 200, 
    random_delay_min: 15, 
    random_delay_max: 45, 
    scheduled_at: '', 
    is_recurring: false, 
    recurrence_type: 'daily', 
    recurrence_day: 0,
    // Anti-block features
    device_mode: 'single',
    content_mode: 'compose' as 'compose' | 'template',
    spintax: false,
    verify_numbers: false,
    replied_only: false,
    window_24h: false,
    uniqueness: 'smart',
    batch_pause_msgs: 30,
    batch_pause_wait: 300,
    fail_limit: 5,
    start_time: '',
    end_time: '',
    round_robin_sessions: [] as string[],
    media_url: '',
    media_type: ''
  });
  const [media, setMedia] = useState<any[]>([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAntiBlock, setShowAntiBlock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const { success } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      await loadData(data.user.id);
    });
  }, []);

  async function loadData(uid: string) {
    setLoading(true);
    try {
      const [c, g, t, s, m] = await Promise.all([
        apiFetch(`/api/campaigns/${uid}`),
        apiFetch(`/api/groups/${uid}`),
        apiFetch(`/api/templates/${uid}`),
        apiFetch(`/api/whatsapp/sessions/${uid}`),
        apiFetch(`/api/media/${uid}`),
      ]);
      setCampaigns(c || []);
      setGroups(g || []);
      setTemplates(t || []);
      const connectedSessions = (s || []).filter((sess: any) => sess.status === 'connected');
      setSessions(connectedSessions);
      setMedia(m || []);
      
      if (connectedSessions.length > 0 && !form.sessionName) {
        setForm(p => ({ ...p, sessionName: connectedSessions[0].session_name }));
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!user) return;
    await loadData(user.id);
    success('Campaign data refreshed');
  }

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user || !form.sessionName) return alert('Select a WhatsApp account first');
    setCreating(true);
    try {
      const selectedSession = sessions.find(s => s.session_name === form.sessionName);
      const { sessionName, ...restForm } = form;
      await apiFetch('/api/campaigns', { 
        method: 'POST', 
        body: JSON.stringify({ 
          userId: user.id, 
          sessionId: selectedSession?.id, 
          sessionName, 
          ...restForm 
        }) 
      });
      setView('list');
      setStep(1);
      await loadData(user.id);
      success('Campaign created successfully');
    } catch (err: any) { alert(err.message); }
    setCreating(false);
  }

  async function handleUpdateStatus(id: string, status: string) {
    await apiFetch(`/api/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    success(`Campaign ${status === 'running' ? 'resumed' : 'paused'}`);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this campaign? This will also remove queued messages.')) return;
    await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    setCampaigns(prev => prev.filter(c => c.id !== id));
    success('Campaign deleted successfully');
  }

  async function handleClone(id: string) {
    try {
      const { campaign } = await apiFetch(`/api/campaigns/${id}/clone`, { method: 'POST' });
      setForm({
        ...form,
        name: `Clone of ${campaign.name}`,
        template_id: campaign.template_id,
        group_id: campaign.group_id,
        sessionName: sessions.find(s => s.id === campaign.session_id)?.session_name || (sessions.length > 0 ? sessions[0].session_name : ''),
        interval_seconds: campaign.interval_seconds || 15,
        daily_limit: campaign.daily_limit || 200,
        random_delay_min: campaign.random_delay_min || 15,
        random_delay_max: campaign.random_delay_max || 45,
        scheduled_at: '',
        device_mode: campaign.device_mode || 'single',
        spintax: campaign.spintax !== undefined ? campaign.spintax : true,
        verify_numbers: campaign.verify_numbers !== undefined ? campaign.verify_numbers : true,
        replied_only: !!campaign.replied_only,
        window_24h: !!campaign.window_24h,
        uniqueness: campaign.uniqueness || 'smart',
        batch_pause_msgs: campaign.batch_pause_msgs || 30,
        batch_pause_wait: campaign.batch_pause_wait || 300,
        fail_limit: campaign.fail_limit || 5,
        start_time: campaign.start_time || '',
        end_time: campaign.end_time || '',
      });
      setView('create');
      setStep(1);
    } catch (err: any) { alert(err.message); }
  }

  if (view === 'create') {
    const formatPreview = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\*([^*]+)\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
        .replace(/~([^~]+)~/g, '<s class="line-through">$1</s>')
        .replace(/`([^`]+)`/g, '<code class="bg-black/10 rounded px-1 text-xs font-mono">$1</code>')
        .replace(/{{([^}]+)}}/g, '<span class="text-green-700 font-semibold">[$1]</span>');
    };

    const previewMsg = form.content_mode === 'template' 
      ? (templates.find(t => t.id === form.template_id)?.body_text || '') 
      : form.template_id;
    
    const previewHeader = form.content_mode === 'template' 
      ? templates.find(t => t.id === form.template_id)
      : null;

    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground tracking-tight overflow-hidden">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('list')}
                className="p-2 hover:bg-muted text-muted-foreground/50 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Create New Campaign</h1>
                <p className="text-sm text-muted-foreground font-medium -mt-1">Create and send a new WhatsApp campaign</p>
              </div>
            </div>

            <button 
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl hover:bg-muted transition-all text-xs font-bold text-muted-foreground shadow-sm"
            >
              {showPreview ? <Eye className="w-4 h-4 text-emerald-500" /> : <Eye className="w-4 h-4 opacity-50" />} 
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row items-start overflow-hidden bg-background">
          {/* Left Column: Main Form Panel - 65% width */}
          <div className="flex-1 lg:w-[65%] flex flex-col min-w-0 bg-background relative h-full">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar pb-32">
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Stepper Card */}
                <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between max-w-2xl mx-auto">
                    {[
                      { n: 1, label: 'Campaign', icon: Settings },
                      { n: 2, label: 'Content', icon: FileText },
                      { n: 3, label: 'Recipients', icon: Users },
                      { n: 4, label: 'Schedule', icon: Clock }
                    ].map((s, idx) => (
                      <React.Fragment key={s.n}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            step === s.n ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20' : 
                            step > s.n ? 'bg-emerald-600 text-white' : 'bg-muted dark:bg-muted border border-border text-muted-foreground/50'
                          }`}>
                            {step > s.n ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                          </div>
                          <span className={`text-sm font-bold tracking-tight ${
                            step === s.n ? 'text-emerald-700 dark:text-emerald-500' : 'text-muted-foreground/50'
                          }`}>{s.label}</span>
                        </div>
                        {idx < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground/30 mx-2" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-card border border-border rounded-2xl p-8 shadow-sm space-y-8">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Campaign Settings</h2>
                        <p className="text-sm text-muted-foreground font-medium">Basic campaign information and device selection</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Campaign Name <span className="text-destructive">*</span></label>
                        <input 
                          value={form.name} 
                          onChange={e => setForm({...form, name: e.target.value})}
                          className="h-11 w-full bg-muted/50 dark:bg-muted/50 border border-border dark:border-white/10 rounded-xl px-4 text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-muted-foreground/50 dark:text-gray-100"
                          placeholder="e.g., Summer Sale Campaign"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Device Mode</label>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { id: 'single', label: 'Single', icon: Phone, desc: 'One device' },
                            { id: 'failover', label: 'Failover', icon: Shield, desc: 'Sequential backup' },
                            { id: 'round_robin', label: 'Round Robin', icon: Shuffle, desc: 'Rotate devices' }
                          ].map(mode => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setForm({...form, device_mode: mode.id})}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                form.device_mode === mode.id 
                                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 ring-1 ring-emerald-500 shadow-sm' 
                                  : 'border-border dark:border-white/10 bg-card dark:bg-card hover:border-emerald-100 dark:hover:border-emerald-500/30'
                              }`}
                            >
                              <mode.icon className={`w-5 h-5 mb-2 ${form.device_mode === mode.id ? 'text-emerald-600 dark:text-emerald-500' : 'text-muted-foreground/50'}`} />
                              <p className="text-sm font-bold text-foreground">{mode.label}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">{mode.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Device <span className="text-destructive">*</span></label>
                         <CustomSelect
                           value={form.sessionName}
                           onChange={(val) => setForm({...form, sessionName: val})}
                           options={sessions.map(s => ({
                             value: s.session_name,
                             label: s.session_name,
                             icon: <Smartphone className="w-4 h-4" />
                           }))}
                           placeholder="Select a device"
                         />
                      </div>

                      {form.device_mode === 'round_robin' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-500">
                          <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 ml-1">Devices for Rotation</h3>
                            
                            <div className="p-4 bg-[#f9f5ff] dark:bg-[#7c3aed]/10 border border-[#f4ebff] dark:border-[#7c3aed]/20 rounded-[20px] flex items-start gap-3 shadow-sm">
                              <Info className="w-5 h-5 text-[#7c3aed] dark:text-[#a78bfa] shrink-0 mt-0.5" />
                              <p className="text-xs text-[#6941c6] dark:text-[#d6bbfb] font-medium leading-relaxed">
                                Messages rotate across all selected devices. Device 1 sends message 1, Device 2 sends message 2, and so on in a loop.
                              </p>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-card border border-border dark:border-white/10 rounded-[20px] p-2 space-y-1">
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                              {sessions.map(s => {
                                const isPrimary = s.session_name === form.sessionName;
                                const isSelected = form.round_robin_sessions.includes(s.id) || isPrimary;
                                return (
                                  <div 
                                    key={s.id} 
                                    onClick={() => {
                                      if (isPrimary) return;
                                      const current = [...form.round_robin_sessions];
                                      if (current.includes(s.id)) {
                                        setForm({...form, round_robin_sessions: current.filter(id => id !== s.id)});
                                      } else {
                                        setForm({...form, round_robin_sessions: [...current, s.id]});
                                      }
                                    }}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                                      isSelected ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-500/10 shadow-sm' : 'border-border bg-white dark:bg-card hover:border-emerald-200 dark:hover:border-emerald-500/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-muted border-border'
                                      }`}>
                                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </div>
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-foreground">{s.session_name}</span>
                                          {isPrimary && <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Primary</span>}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium">{s.phone_number}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                        <RefreshCw className="w-3 h-3 animate-spin-slow" /> Online
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {form.device_mode === 'failover' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                           <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Backup Devices</label>
                              <div className="p-3 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                                <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                                  If the primary device disconnects, messages will be sent from the next device in order.
                                </p>
                              </div>
                           </div>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {sessions.filter(s => s.session_name !== form.sessionName).map(s => (
                              <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white dark:bg-card group hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <div className="w-4 h-4 rounded border border-emerald-500/50 text-emerald-600 dark:text-emerald-500 flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-foreground">{s.session_name}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">{s.phone_number}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 opacity-60">
                                  <RefreshCcw className="w-3 h-3" /> Offline
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                       <div className="space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Random Delay Between Messages (seconds)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="number" 
                            value={form.random_delay_min}
                            onChange={e => setForm({...form, random_delay_min: Number(e.target.value)})}
                            className="w-24 h-11 bg-muted/50 dark:bg-muted/50 border border-border dark:border-white/10 rounded-xl px-4 text-sm text-center focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none dark:text-gray-100"
                          />
                          <span className="text-xs text-muted-foreground/50 font-medium">to</span>
                          <input 
                            type="number" 
                            value={form.random_delay_max}
                            onChange={e => setForm({...form, random_delay_max: Number(e.target.value)})}
                            className="w-24 h-11 bg-muted/50 dark:bg-muted/50 border border-border dark:border-white/10 rounded-xl px-4 text-sm text-center focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none dark:text-gray-100"
                          />
                          <span className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest">sec</span>
                        </div>
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
                            <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                                <span className="font-bold">WhatsApp guideline:</span> Minimum 12s enforced server-side. Recommended: 15-45s for established accounts.
                            </p>
                        </div>
                      </div>

                       <div className="bg-card dark:bg-card border border-border dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                        <button 
                          type="button"
                          onClick={() => setShowAntiBlock(!showAntiBlock)}
                          className="w-full p-3 flex items-center justify-between hover:bg-emerald-50/20 dark:hover:bg-emerald-500/5 transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl transition-all ${showAntiBlock ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'}`}>
                              <Shield className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-3">
                               <span className="text-sm font-medium leading-5 text-foreground tracking-tight">Anti-Block Protection</span>
                              <div className="inline-flex items-center rounded-full border py-0.5 font-bold text-[9px] h-4 px-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wider">WhatsApp Safe</div>
                            </div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground/50 transition-all duration-300 ${showAntiBlock ? 'rotate-180 text-emerald-600 dark:text-emerald-500' : ''}`} />
                        </button>

                        {showAntiBlock && (
                          <div className="px-6 pb-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 {[
                                   { id: 'spintax', label: 'Spintax', desc: 'Use {Hi|Hello|Hey} syntax' },
                                   { id: 'verify_numbers', label: 'Verify Numbers', desc: 'Check WhatsApp registration' },
                                   { id: 'replied_only', label: 'Replied Only', desc: 'Skip cold contacts' },
                                   { id: 'window_24h', label: '24h Window', desc: 'Recent conversations only' }
                                 ].map(item => (
                                   <label key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:bg-emerald-50/10 transition-all group ${form[item.id as keyof typeof form] ? 'border-emerald-200 bg-emerald-50/20 dark:bg-emerald-500/10' : 'border-border bg-card dark:bg-muted/30'}`}>
                                     <div className="flex-1">
                                       <p className="text-sm font-bold text-foreground">{item.label}</p>
                                       <p className="text-[10px] text-muted-foreground font-medium mt-1 leading-tight">{item.desc}</p>
                                     </div>
                                     <button 
                                       type="button" 
                                       onClick={(e) => {
                                         e.preventDefault();
                                         setForm({...form, [item.id]: !form[item.id as keyof typeof form]});
                                       }}
                                       className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${form[item.id as keyof typeof form] ? 'bg-emerald-600' : 'bg-muted-foreground/20 dark:bg-muted'}`}
                                     >
                                       <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${form[item.id as keyof typeof form] ? 'translate-x-4' : 'translate-x-0'}`}></span>
                                     </button>
                                   </label>
                                 ))}
                             </div>

                              <div className="space-y-6 pt-6 border-t border-border dark:border-white/5">
                               <div className="flex items-center gap-4">
                                 <label className="text-xs font-bold text-muted-foreground shrink-0 uppercase tracking-wider">Uniqueness</label>
                                 <div className="flex-1">
                                   <CustomSelect
                                     value={form.uniqueness}
                                     onChange={(val) => setForm({...form, uniqueness: val})}
                                     options={[
                                       { value: 'none', label: 'None' },
                                       { value: 'smart', label: 'Smart Mix (Recommended)' },
                                       { value: 'emoji', label: 'Random Emoji' }
                                     ]}
                                   />
                                 </div>
                               </div>
 
                               <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                                 <div className="flex items-center gap-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Batch Pause</label>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-muted-foreground font-bold italic">every</span>
                                      <input 
                                        type="number"
                                        value={form.batch_pause_msgs}
                                        onChange={e => setForm({...form, batch_pause_msgs: Number(e.target.value)})}
                                        className="w-16 h-8 rounded-lg border border-border bg-card dark:bg-muted text-sm text-center focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold dark:text-gray-100"
                                      />
                                      <span className="text-[11px] text-muted-foreground font-bold italic">msgs, wait</span>
                                      <input 
                                        type="number"
                                        value={form.batch_pause_wait}
                                        onChange={e => setForm({...form, batch_pause_wait: Number(e.target.value)})}
                                        className="w-20 h-8 rounded-lg border border-border bg-card dark:bg-muted text-sm text-center focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold dark:text-gray-100"
                                      />
                                      <span className="text-[11px] text-muted-foreground font-bold italic">sec</span>
                                    </div>
                                 </div>
 
                                 <div className="flex items-center gap-3">
                                   <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fail Limit</label>
                                   <input 
                                     type="number"
                                     value={form.fail_limit}
                                     onChange={e => setForm({...form, fail_limit: Number(e.target.value)})}
                                     className="w-12 h-8 rounded-lg border border-border bg-card dark:bg-muted text-sm text-center focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold dark:text-gray-100"
                                   />
                                   <span className="text-[11px] text-muted-foreground font-bold italic whitespace-nowrap">in a row</span>
                                 </div>

                                 <div className="flex items-center gap-3">
                                   <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hours</label>
                                   <div className="flex items-center gap-2">
                                     <div className="relative">
                                       <input 
                                         type="time"
                                         value={form.start_time}
                                         onChange={e => setForm({...form, start_time: e.target.value})}
                                         className="w-24 h-8 px-2 rounded-lg border border-border bg-white dark:bg-muted text-[10px] font-bold outline-none dark:text-gray-100"
                                       />
                                       <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-gray-500 pointer-events-none" />
                                     </div>
                                     <span className="text-gray-400 dark:text-gray-500">-</span>
                                     <div className="relative">
                                       <input 
                                         type="time"
                                         value={form.end_time}
                                         onChange={e => setForm({...form, end_time: e.target.value})}
                                         className="w-24 h-8 px-2 rounded-lg border border-border bg-white dark:bg-muted text-[10px] font-bold outline-none dark:text-gray-100"
                                       />
                                       <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-gray-500 pointer-events-none" />
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {step === 2 && (
                  <div className="bg-white dark:bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Compose Message</h2>
                      <p className="text-[11px] text-muted-foreground font-medium">Craft your campaign message with dynamic variables</p>
                    </div>

                    <div className="flex p-1 bg-gray-50/50 dark:bg-muted/50 rounded-2xl border border-gray-100 dark:border-white/10">
                      <button
                        onClick={() => setForm({...form, content_mode: 'compose'})}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                          form.content_mode === 'compose' ? 'bg-white dark:bg-card shadow-sm text-emerald-700 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-500/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        Compose Message
                      </button>
                      <button
                        onClick={() => setForm({...form, content_mode: 'template'})}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                          form.content_mode === 'template' ? 'bg-white dark:bg-card shadow-sm text-emerald-700 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-500/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        Use Template
                      </button>
                    </div>

                    {form.content_mode === 'compose' ? (
                      <div className="space-y-6 animate-in fade-in duration-500">
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Message Content <span className="text-destructive">*</span></label>
                               <div className="flex items-center gap-2">
                                  {['name', 'phone'].map(token => (
                                    <button 
                                      key={token}
                                      onClick={() => {
                                        const textarea = document.getElementById('message-compose') as HTMLTextAreaElement;
                                        if (textarea) {
                                          const start = textarea.selectionStart;
                                          const end = textarea.selectionEnd;
                                          const text = textarea.value;
                                          setForm({...form, template_id: text.substring(0, start) + `{{${token}}}` + text.substring(end)});
                                        }
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-white/10 bg-white dark:bg-muted/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-[10px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1 transition-all"
                                    >
                                      <Plus className="w-2.5 h-2.5 text-emerald-500" /> {token}
                                    </button>
                                  ))}
                               </div>
                            </div>
                            <textarea 
                              id="message-compose"
                              value={form.template_id}
                              onChange={e => setForm({...form, template_id: e.target.value})}
                              placeholder="Hello {{name}}..."
                              className="w-full min-h-[200px] bg-gray-50/30 dark:bg-muted/30 border border-gray-100 dark:border-white/10 rounded-2xl p-6 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all resize-none font-medium leading-relaxed dark:text-gray-100"
                            />
                         </div>

                         <div className="space-y-3">
                             <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Media Attachment</label>
                             {form.media_url ? (
                               <div className="relative group rounded-2xl overflow-hidden border border-border bg-muted/30 p-2">
                                 {form.media_type === 'image' ? (
                                   <img src={form.media_url} className="w-full h-32 object-cover rounded-xl" alt="Selected media" />
                                 ) : (
                                   <div className="w-full h-32 flex flex-col items-center justify-center bg-card rounded-xl gap-2">
                                     {form.media_type === 'video' ? <Video className="w-8 h-8 text-primary" /> : <FileText className="w-8 h-8 text-primary" />}
                                     <span className="text-[10px] font-bold uppercase text-muted-foreground">{form.media_type}</span>
                                   </div>
                                 )}
                                 <button 
                                   onClick={() => setForm({...form, media_url: '', media_type: ''})}
                                   className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                   <X className="w-4 h-4" />
                                 </button>
                               </div>
                             ) : (
                               <div 
                                 onClick={() => setShowMediaModal(true)}
                                 className="border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all cursor-pointer group bg-gray-50/20 dark:bg-muted/20"
                                >
                                 <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card shadow-sm flex items-center justify-center text-gray-400 group-hover:text-emerald-500 transition-all">
                                    <ImageIcon className="w-6 h-6" />
                                 </div>
                                 <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Select from Gallery</p>
                               </div>
                              )}
                           </div>
                        </div>
                     ) : (
                       <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 shrink-0" />
                          <input 
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-11 w-full bg-muted/50 dark:bg-muted/50 border border-border dark:border-white/10 rounded-2xl pl-11 pr-4 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all dark:text-gray-100"
                          />
                        </div>
 
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                            <button
                              key={t.id}
                              onClick={() => setForm({...form, template_id: t.id})}
                              className={`p-5 rounded-2xl border text-left transition-all ${
                                form.template_id === t.id ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-500/10 ring-1 ring-emerald-500 shadow-sm' : 'border-border dark:border-white/10 bg-card dark:bg-card hover:border-emerald-100 dark:hover:border-emerald-500/30'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-sm text-foreground">{t.name}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-muted dark:bg-muted text-muted-foreground">{t.category || 'marketing'}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground/50 line-clamp-2 leading-relaxed">{t.content}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                     <div className="bg-card dark:bg-card border border-border rounded-2xl p-8 shadow-sm space-y-8">
                      <div>
                        <h2 className="text-xl font-bold text-foreground mb-1">Audience Selection</h2>
                        <p className="text-[11px] text-muted-foreground font-medium">Select the contact group for this campaign</p>
                      </div>
 
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 shrink-0" />
                        <input 
                          placeholder="Search groups..."
                          value={groupSearchTerm}
                          onChange={e => setGroupSearchTerm(e.target.value)}
                          className="h-11 w-full bg-muted/20 dark:bg-muted/50 border border-border rounded-2xl pl-11 pr-4 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all font-medium dark:text-gray-100"
                        />
                      </div>
 
                      <div className="grid grid-cols-1 gap-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                        {groups.filter(g => g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())).map(g => (
                          <button
                            key={g.id}
                            onClick={() => setForm({...form, group_id: g.id})}
                            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                              form.group_id === g.id ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-500/10 ring-1 ring-emerald-500 shadow-sm' : 'border-border bg-card dark:bg-muted/30 hover:border-emerald-200 dark:hover:border-emerald-500/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.group_id === g.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-muted text-muted-foreground/50 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-500'}`}>
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-foreground tracking-tight">{g.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{g.contact_count || 0} Contacts</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">• Last updated 2 days ago</span>
                                  </div>
                                </div>
                              </div>
                              {form.group_id === g.id && (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 animate-in zoom-in-50 duration-300">
                                   <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            {form.group_id === g.id && (
                               <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                          </button>
                        ))}
                        {groups.length === 0 && (
                           <div className="text-center py-12 space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto text-muted-foreground/20">
                                 <Users className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-bold text-muted-foreground/50">No contact groups found</p>
                              <button className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest hover:underline decoration-2">Create your first group</button>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                     <div className="bg-card dark:bg-card border border-border rounded-2xl p-8 shadow-sm space-y-8">
                      <div>
                        <h2 className="text-xl font-bold text-foreground mb-1">Scheduling</h2>
                        <p className="text-[11px] text-muted-foreground font-medium">When should this campaign be launched?</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          type="button"
                          onClick={() => setForm({...form, scheduled_at: ''})}
                          className={`p-6 rounded-2xl border text-left transition-all group relative overflow-hidden ${
                            !form.scheduled_at 
                              ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/10 ring-1 ring-emerald-500 shadow-sm' 
                              : 'border-border bg-white dark:bg-muted/30 hover:border-emerald-200 hover:bg-emerald-50/10 dark:hover:bg-emerald-500/5'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all ${!form.scheduled_at ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-gray-100 dark:bg-muted text-gray-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-500'}`}>
                             <Zap className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-foreground leading-none">Instant Launch</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1.5 leading-tight uppercase tracking-wider">Start immediately</p>
                          {!form.scheduled_at && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                        </button>

                        <div 
                          className={`p-6 rounded-2xl border text-left transition-all group relative overflow-hidden cursor-pointer ${
                            form.scheduled_at 
                              ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/10 ring-1 ring-emerald-500 shadow-sm' 
                              : 'border-border bg-white dark:bg-muted/30 hover:border-emerald-200 hover:bg-emerald-50/10 dark:hover:bg-emerald-500/5'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all ${form.scheduled_at ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-gray-100 dark:bg-muted text-gray-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-500'}`}>
                             <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-none">Schedule Task</p>
                            <input 
                              type="datetime-local" 
                              value={form.scheduled_at}
                              onChange={e => setForm({...form, scheduled_at: e.target.value})}
                              className="mt-2 w-full bg-transparent border-none p-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-500 focus:ring-0 outline-none uppercase tracking-widest placeholder:text-muted-foreground"
                            />
                          </div>
                          {form.scheduled_at && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                        </div>
                      </div>

                      <div className="pt-8 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl transition-all ${form.is_recurring ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'}`}>
                               <RefreshCw className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-sm font-bold text-foreground leading-none">Recurring Campaign</p>
                               <p className="text-[10px] text-muted-foreground font-medium mt-1.5 leading-none">Repeat this campaign periodically</p>
                            </div>
                         </div>
                         <button 
                           type="button" 
                           role="switch" 
                           onClick={() => setForm({...form, is_recurring: !form.is_recurring})}
                           className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 ${form.is_recurring ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-muted'}`}
                         >
                           <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${form.is_recurring ? 'translate-x-5' : 'translate-x-0'}`}></span>
                         </button>
                      </div>

                      {form.is_recurring && (
                        <div className="grid grid-cols-2 gap-4 p-6 bg-emerald-50/20 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 animate-in slide-in-from-top-4 duration-500">
                           <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest ml-1">Repeat Type</label>
                             <CustomSelect
                               value={form.recurrence_type}
                               onChange={(val) => setForm({...form, recurrence_type: val})}
                               options={[
                                 { value: 'daily', label: 'Daily' },
                                 { value: 'weekly', label: 'Weekly' },
                                 { value: 'monthly', label: 'Monthly' },
                               ]}
                             />
                           </div>
                           {form.recurrence_type !== 'daily' && (
                             <div className="space-y-1.5 animate-in fade-in duration-300">
                               <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest ml-1">{form.recurrence_type === 'weekly' ? 'Day of Week' : 'Day of Month'}</label>
                               <CustomSelect
                                 value={form.recurrence_day.toString()}
                                 onChange={(val) => setForm({...form, recurrence_day: Number(val)})}
                                 options={
                                   form.recurrence_type === 'weekly' 
                                     ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => ({ value: i.toString(), label: d }))
                                     : Array.from({length:28},(_,i)=>i+1).map(d => ({ value: d.toString(), label: d.toString() }))
                                 }
                               />
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step Navigation Bar - Sticky Footer */}
            <div className="shrink-0 bg-white/95 dark:bg-card/95 backdrop-blur-md border-t border-border p-5 px-12 z-40 flex items-center justify-start gap-4">
              {step > 1 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2.5 text-gray-500 dark:text-gray-400 bg-white dark:bg-card border border-border rounded-xl hover:bg-gray-50 dark:hover:bg-muted/50 transition-all flex items-center gap-2 font-bold text-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
              )}
                  
              {step < 4 ? (
                <button 
                  onClick={() => {
                    if (step === 1 && (!form.name || !form.sessionName)) return alert('Name and Account are required');
                    if (step === 2 && !form.template_id && form.content_mode === 'template') return alert('Please select a template');
                    if (step === 3 && !form.group_id) return alert('Please select a recipient group');
                    setStep(step + 1);
                  }}
                  className="px-10 py-2.5 bg-[#004d40] dark:bg-emerald-600 text-white rounded-xl hover:bg-[#003d33] dark:hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 font-bold text-xs"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-10 py-2.5 bg-[#004d40] dark:bg-emerald-600 text-white rounded-xl hover:bg-[#003d33] dark:hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-900/10 text-[13px]"
                >
                  {creating ? 'Launching...' : 'Launch Campaign'}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Live Preview Panel - 35% width */}
          {showPreview && (
            <div className="hidden lg:block w-[35%] p-6 md:p-8 overflow-y-auto custom-scrollbar relative h-full">
              <div className="bg-card dark:bg-card border border-border rounded-2xl shadow-lg shadow-black/5 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-card dark:bg-card border-b border-border p-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                       <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-foreground leading-none">Live Preview</h3>
                       <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">Dynamic WhatsApp Mockup</p>
                    </div>
                 </div>
              </div>

              <div className="p-8 space-y-8">
                 {/* Phone Mockup */}
                 <div className="max-w-[300px] mx-auto relative rounded-[40px] border-[8px] border-zinc-900 aspect-[9/18.5] shadow-2xl overflow-hidden bg-[#e5ddd5] dark:bg-zinc-800/50">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-20 flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-zinc-800" />
                    </div>

                    {/* Header */}
                    <div className="bg-[#075e54] pt-8 pb-3 px-4 flex items-center justify-between text-white relative z-10 shadow-md">
                       <div className="flex items-center gap-3">
                          <ArrowLeft className="w-4 h-4" />
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                             <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                             <p className="text-xs font-bold leading-none text-white">Recipient Name</p>
                             <p className="text-[9px] text-white/70 mt-0.5">Online</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <Video className="w-4 h-4" />
                          <Phone className="w-4 h-4" />
                          <MoreVertical className="w-4 h-4" />
                       </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="p-4 space-y-4">
                       {previewMsg ? (
                          <div className="flex flex-col gap-2">
                             {previewHeader?.header_type === 'image' && previewHeader?.header_url && (
                                <div className="max-w-[85%] bg-white p-1 rounded-xl shadow-sm">
                                   <img src={previewHeader.header_url} alt="Header" className="w-full h-auto rounded-lg object-cover" />
                                </div>
                               )}
                               {form.content_mode === 'compose' && form.media_url && (
                                 <div className="max-w-[85%] bg-white p-1 rounded-xl shadow-sm mb-2">
                                   {form.media_type === 'image' ? (
                                     <img src={form.media_url} alt="Manual Media" className="w-full h-auto rounded-lg object-cover" />
                                   ) : (
                                     <div className="w-full aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-1">
                                       {form.media_type === 'video' ? <Video className="w-6 h-6 text-gray-400" /> : <FileText className="w-6 h-6 text-gray-400" />}
                                       <span className="text-[8px] font-bold text-gray-400 uppercase">{form.media_type}</span>
                                     </div>
                                   )}
                                 </div>
                               )}
                             <div className="max-w-[85%] bg-white dark:bg-emerald-950/40 p-3 rounded-2xl rounded-tl-none shadow-sm relative">
                                <div className="absolute top-0 -left-2 w-4 h-4 bg-white dark:bg-emerald-950/40" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} />
                                <div 
                                  className="text-[11px] text-gray-800 dark:text-emerald-50 font-medium whitespace-pre-wrap message-content leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: formatPreview(previewMsg) }}
                                />
                                <div className="flex items-center justify-end gap-1 mt-1">
                                   <span className="text-[8px] text-gray-400 dark:text-emerald-500/50">12:45 PM</span>
                                   <CheckCheck className="w-2.5 h-2.5 text-blue-500" />
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="flex flex-col items-center justify-center h-[200px] text-center px-6">
                             <MessageSquare className="w-10 h-10 text-gray-400/30 mb-4 dark:text-gray-600/30" />
                             <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed italic">Select or compose a message to see how it looks on WhatsApp</p>
                          </div>
                       )}
                    </div>
                 </div>                 {/* Campaign Summary Card */}
                 <div className="bg-gray-50/50 dark:bg-muted/30 border border-gray-100 dark:border-white/5 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-sm font-bold text-foreground">Campaign Summary</h4>
                       <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-tighter">Draft</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-white/5 shadow-sm space-y-3">
                          <div className="flex items-center gap-2">
                             <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Users className="w-3.5 h-3.5" />
                             </div>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recipients</span>
                          </div>
                          <p className="text-lg font-bold text-foreground leading-none">
                             {groups.find(g => g.id === form.group_id)?.contact_count || 0}
                          </p>
                       </div>

                       <div className="p-4 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-white/5 shadow-sm space-y-3">
                          <div className="flex items-center gap-2">
                             <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                             </div>
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Interval</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">
                             {form.random_delay_min}-{form.random_delay_max}s
                          </p>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                       <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2.5">
                             <Smartphone className="w-4 h-4 text-gray-400" />
                             <span className="text-xs font-bold text-muted-foreground">Source Account</span>
                          </div>
                          <span className="text-xs font-bold text-foreground">{form.sessionName || 'Not selected'}</span>
                       </div>
                       <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2.5">
                             <Calendar className="w-4 h-4 text-gray-400" />
                             <span className="text-xs font-bold text-muted-foreground">Scheduled for</span>
                          </div>
                          <span className="text-xs font-bold text-foreground truncate max-w-[150px]">
                             {form.scheduled_at ? new Date(form.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Instant launch'}
                          </span>
                       </div>
                    </div>

                     <div className="p-4 bg-emerald-600 dark:bg-emerald-700 rounded-2xl text-white space-y-2 shadow-lg shadow-emerald-200 dark:shadow-none">
                        <div className="flex items-center gap-2">
                           <Shield className="w-4 h-4" />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </main>

          <MediaSelectorModal 
            isOpen={showMediaModal} 
            onClose={() => setShowMediaModal(false)} 
            media={media}
            onSelect={(m) => setForm({ ...form, media_url: m.url, media_type: m.type })}
          />
        </div>
      );
    }

  // --- List View ---
  return (
    <div className="p-4 md:p-8 pb-24 min-h-screen bg-background dark:bg-background">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-semibold text-foreground tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-xs font-medium">Manage and track your messaging campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="btn-icon"
          >
            <RefreshCcw className={`w-4 h-4 md:w-5 md:h-5 ${loading && 'animate-spin'}`} />
          </button>
          <button 
            onClick={() => setView('create')} 
            className="btn-primary"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" /> 
            <span className="whitespace-nowrap">New Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-card dark:bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2 animate-pulse">
               <div className="h-2 w-16 bg-muted rounded-full opacity-50" />
               <div className="h-8 w-12 bg-muted rounded-lg" />
            </div>
          ))
        ) : (
          [
            { label: 'TOTAL', count: campaigns.length, color: 'text-gray-900 dark:text-gray-100' },
            { label: 'ACTIVE', count: campaigns.filter(c => c.status === 'running').length, color: 'text-emerald-600 dark:text-emerald-500' },
            { label: 'SCHEDULED', count: campaigns.filter(c => c.status === 'scheduled' || !!c.scheduled_at).length, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'PAUSED', count: campaigns.filter(c => c.status === 'paused').length, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'COMPLETED', count: campaigns.filter(c => c.status === 'completed').length, color: 'text-blue-600 dark:text-blue-400' }
          ].map(stat => (
            <div key={stat.label} className="bg-card dark:bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-1">
               <p className="text-[9px] font-semibold tracking-widest text-muted-foreground/60 uppercase">{stat.label}</p>
               <p className={`text-2xl font-semibold ${stat.color}`}>{stat.count}</p>
            </div>
          ))
        )}
      </div>

      {sessions.length === 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl p-5 mb-8 flex items-center gap-4 animate-in pulse duration-3000 infinite">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-500">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
             <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Security Warning: No Active Sessions</p>
             <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">Please connect a WhatsApp account in the Setup section to launch campaigns.</p>
          </div>
          <Link href="/dashboard/whatsapp">
            <button className="font-medium text-amber-700 dark:text-amber-400 underline underline-offset-4 decoration-2">GO TO SETUP</button>
          </Link>
        </div>
      )}

      {/* Campaign List Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
         <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              placeholder="Search campaigns..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-standard pl-11 group-focus-within:ring-primary/10 group-focus-within:border-primary/50" 
            />
         </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'running', label: 'Running' },
                { value: 'completed', label: 'Completed' },
                { value: 'paused', label: 'Paused' },
              ]}
              className="w-full sm:w-48"
            />
          </div>
      </div>
      <div className="bg-card dark:bg-card border border-border rounded-[24px] overflow-hidden shadow-sm min-h-[400px] flex">
        {loading ? (
          <div className="flex-1 w-full p-6">
            <div className="grid gap-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-card dark:bg-card border border-border rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-muted" />
                      <div className="h-4 w-32 bg-muted rounded-full" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                    </div>
                  </div>
                  <div className="flex gap-6 mt-2">
                    <div className="h-2 w-20 bg-muted rounded-full" />
                    <div className="h-2 w-20 bg-muted rounded-full" />
                    <div className="h-2 w-20 bg-muted rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="w-16 h-16 bg-muted/20 dark:bg-muted/10 rounded-2xl flex items-center justify-center mx-auto border border-border shadow-sm">
               <FileText className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground tracking-tight">No campaigns yet</p>
              <p className="text-sm text-muted-foreground font-medium max-w-[280px]">Create your first campaign to start messaging</p>
            </div>
            <button 
              onClick={() => setView('create')}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#004d40] dark:bg-emerald-600 hover:bg-[#003d33] dark:hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md active:scale-95 mx-auto"
            >
              <Plus className="w-4 h-4" /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="flex-1 w-full p-6">
            <div className="grid gap-4">
              {campaigns
                .filter(c => searchTerm === '' || c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .filter(c => statusFilter === 'all' || c.status === statusFilter)
                .map(c => (
                  <div 
                    key={c.id} 
                    className="group relative bg-white dark:bg-muted/10 border border-border rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            c.status === 'running' ? 'bg-emerald-500 animate-pulse' : 
                            c.status === 'completed' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          <h3 className="text-base font-semibold text-foreground tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{c.name}</h3>
                          <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md border ${STATUS_COLOR[c.status] || STATUS_COLOR.draft}`}>
                            {c.status}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                           <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-semibold text-muted-foreground/50 tracking-widest">Progress</span>
                              <div className="flex items-center gap-3 mt-0.5">
                                 <div className="w-24 h-1 bg-muted/50 dark:bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all duration-1000" 
                                      style={{ width: `${(c.total_sent / (c.target_count || 1)) * 100}%` }} 
                                    />
                                 </div>
                                 <span className="text-[10px] font-semibold text-foreground">{c.total_sent} Sent</span>
                              </div>
                           </div>
                           
                           <div className="h-6 w-px bg-border hidden sm:block" />
  
                           <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-semibold text-muted-foreground/50 tracking-widest">Target</span>
                              <p className="text-[10px] font-semibold mt-0.5 text-muted-foreground">{c.group_name || 'Contacts'}</p>
                           </div>
  
                           <div className="h-6 w-px bg-border hidden sm:block" />
  
                           <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-semibold text-muted-foreground/50 tracking-widest">Interval</span>
                              <p className="text-[10px] font-semibold mt-0.5 text-muted-foreground">{c.interval_seconds}s</p>
                           </div>
                        </div>
                      </div>
  
                      <div className="flex items-center gap-1.5">
                        <button 
                          title="Clone" 
                          onClick={() => handleClone(c.id)} 
                          className="p-2 rounded-lg bg-secondary/50 dark:bg-muted/50 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        
                        {c.status === 'paused' || c.status === 'pending' ? (
                          <button 
                            title="Resume" 
                            onClick={() => handleUpdateStatus(c.id, 'running')}
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : c.status === 'running' ? (
                          <button 
                            title="Pause" 
                            onClick={() => handleUpdateStatus(c.id, 'paused')}
                            className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
  
                        <button 
                          title="Delete" 
                          onClick={() => handleDelete(c.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Media Selector Modal Sub-component
function MediaSelectorModal({ isOpen, onClose, media, onSelect }: { isOpen: boolean, onClose: () => void, media: any[], onSelect: (m: any) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  if (!isOpen) return null;

  const filteredMedia = media.filter(m => {
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background border border-border w-full max-w-4xl max-h-[80vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Select Media</h2>
            <p className="text-xs text-muted-foreground font-medium">Choose a file from your gallery</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-center bg-muted/20">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
          <div className="flex bg-background p-1 rounded-xl border border-border">
            {['all', 'image', 'video', 'document'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${filter === f ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                 {f}
               </button>
             ))}
           </div>
          </div>
 
         <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {filteredMedia.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
              <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
              <p className="text-sm font-bold text-muted-foreground">No media found matching filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMedia.map(m => (
                <div 
                  key={m.id}
                  onClick={() => {
                    onSelect(m);
                    onClose();
                  }}
                  className="group relative aspect-square bg-muted/30 border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 transition-all"
                >
                  {m.type === 'image' ? (
                    <img src={m.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={m.name} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                       {m.type === 'video' ? <Video className="w-8 h-8 text-primary" /> : <FileText className="w-8 h-8 text-primary" />}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-[9px] font-bold text-white truncate w-full bg-black/60 px-2 py-1 rounded backdrop-blur-sm">{m.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-muted text-muted-foreground rounded-xl font-bold text-xs hover:bg-muted/80 transition-all">
             Cancel
           </button>
         </div>
       </div>
     </div>
  );
}