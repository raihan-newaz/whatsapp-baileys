"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { io } from 'socket.io-client';
import { Loader2, Smartphone, Wifi, WifiOff, RefreshCw, Power, Trash2, AlertTriangle, Plus, X, CheckCircle2, Info, MoreHorizontal, Settings, Calendar, ShieldCheck, Clock, QrCode, Copy, Brain, Sparkles, Wand2, Key, Activity, FileText, Code2, LogOut, Play, Pause } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { format } from 'date-fns';

const BACKEND_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000');

export default function WhatsAppPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [qrTimers, setQrTimers] = useState<Record<string, number>>({});
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeQrSession, setActiveQrSession] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maxAccounts, setMaxAccounts] = useState(1);
  const toast = useToast();
  
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      try {
        const [p, s] = await Promise.all([
          apiFetch('/api/profiles/' + data.user.id),
          apiFetch('/api/settings')
        ]);
        setProfile(p);
        
        if (s.settings?.billing_limits) {
          const billingLimits = s.settings.billing_limits;
          const plan = p.plan || 'free';
          const planLimits = billingLimits[plan] || billingLimits['free_trial'] || { accounts: 1 };
          setMaxAccounts(planLimits.accounts ?? 1);
        }
      } catch (e) {}

      loadSessions(data.user.id);

      const socket = io(BACKEND_URL);
      socketRef.current = socket;
      socket.emit('join', data.user.id);
      
      socket.on('wa:qr', ({ qr, sessionName }: { qr: string, sessionName: string }) => {
        const sName = sessionName || 'default';
        setQrs(prev => ({ ...prev, [sName]: qr }));
        setLiveStatuses(prev => ({ ...prev, [sName]: 'pending' }));
        setQrTimers(prev => {
          // Only reset to 120 if the timer is currently 0 or doesn't exist
          if (!prev[sName] || prev[sName] <= 0) {
            return { ...prev, [sName]: 120 };
          }
          return prev;
        });
        setActiveQrSession(sName);
        setShowQrModal(true);
      });
      
      socket.on('wa:status', ({ status, sessionName }: { status: string, sessionName: string }) => {
        const sName = sessionName || 'default';
        setLiveStatuses(prev => ({ ...prev, [sName]: status }));
        if (status === 'connected') {
          setQrs(prev => { const n = { ...prev }; delete n[sName]; return n; });
          setShowQrModal(false);
          setActiveQrSession(null);
          loadSessions(data.user.id);
        }
      });
    });

    const interval = setInterval(() => {
      setQrTimers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(key => {
          if (next[key] > 0) {
            next[key] -= 1;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      socketRef.current?.disconnect();
      clearInterval(interval);
    };
  }, []);

  async function loadSessions(uid: string) {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/whatsapp/sessions/${uid}`);
      if (data) {
        setSessions(data);
        const initialStatuses: Record<string, string> = {};
        data.forEach((s: any) => {
          initialStatuses[s.session_name] = s.status;
        });
        setLiveStatuses(prev => ({ ...initialStatuses, ...prev }));
      }
    } catch (err: any) {
      toast.error('Failed to load sessions: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newSessionName.trim()) return;
    setAddLoading(true);
    setLiveStatuses(prev => ({ ...prev, [newSessionName]: 'pending' }));
    
    try {
      socketRef.current?.emit('join', user.id);
      await apiFetch('/api/whatsapp/connect', { 
        method: 'POST', 
        body: JSON.stringify({ userId: user.id, sessionName: newSessionName }) 
      });
      setShowAddModal(false);
      setNewSessionName('');
      await loadSessions(user.id);
      toast.success('WhatsApp account added successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add account');
      setLiveStatuses(prev => { const n = { ...prev }; delete n[newSessionName]; return n; });
      setQrTimers(prev => { const n = { ...prev }; delete n[newSessionName]; return n; });
    } finally {
      setAddLoading(false);
    }
  }

  async function handleConnect(sessionName: string) {
    if (!user) return;
    setLiveStatuses(prev => ({ ...prev, [sessionName]: 'pending' }));
    setQrs(prev => { const n = { ...prev }; delete n[sessionName]; return n; });
    setQrTimers(prev => { const n = { ...prev }; delete n[sessionName]; return n; });
    try {
      socketRef.current?.emit('join', user.id);
      await apiFetch('/api/whatsapp/connect', { method: 'POST', body: JSON.stringify({ userId: user.id, sessionName }) });
      toast.success('Connection request sent');
    } catch (e: any) {
      toast.error(e.message || 'Failed to connect session');
      setLiveStatuses(prev => ({ ...prev, [sessionName]: 'disconnected' }));
    }
  }

  async function handleDisconnect(sessionName: string) {
    if (!user) return;
    try {
      await apiFetch('/api/whatsapp/disconnect', { method: 'POST', body: JSON.stringify({ userId: user.id, sessionName }) });
      setLiveStatuses(prev => ({ ...prev, [sessionName]: 'disconnected' }));
      setQrs(prev => { const n = { ...prev }; delete n[sessionName]; return n; });
      await loadSessions(user.id);
      toast.success('Session disconnected. Information preserved.');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to disconnect');
    }
  }

  async function handleLogout(sessionName: string) {
    if (!user) return;
    try {
      await apiFetch('/api/whatsapp/logout', { method: 'POST', body: JSON.stringify({ userId: user.id, sessionName }) });
      setLiveStatuses(prev => ({ ...prev, [sessionName]: 'disconnected' }));
      setQrs(prev => { const n = { ...prev }; delete n[sessionName]; return n; });
      await loadSessions(user.id);
      toast.success('Logged out successfully. Session data cleared.');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to logout');
    }
  }

  async function handleDeleteSession(sessionName: string) {
    if (!user) return;
    setDeleting(true);
    try {
      await apiFetch('/api/whatsapp/session', { method: 'DELETE', body: JSON.stringify({ userId: user.id, sessionName }) });
      setLiveStatuses(prev => { const n = { ...prev }; delete n[sessionName]; return n; });
      setQrs(prev => { const n = { ...prev }; delete n[sessionName]; return n; });
      setSessions(prev => prev.filter(s => s.session_name !== sessionName));
      setDeleteConfirm(null);
      toast.success('Account deleted');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  }

  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const handleRefreshProfile = async (session: any) => {
    if (!user) return;
    setRefreshing(prev => ({ ...prev, [session.session_name]: true }));
    try {
      const res = await apiFetch(`/api/whatsapp/sessions/${session.id}/refresh-profile`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, sessionName: session.session_name })
      });
      if (res.success) {
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, device_info: res.device_info } : s));
        if (!res.profile_pic) {
          toast.info('Profile data fetched, but the picture is restricted by privacy settings.');
        } else {
          toast.success('Profile refreshed successfully');
        }
      }
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('not connected') || msg.toLowerCase().includes('not found')) {
        setLiveStatuses(prev => ({ ...prev, [session.session_name]: 'disconnected' }));
        toast.error('Session is disconnected. Please reconnect.');
      } else if (msg.includes('private') || msg.includes('not set')) {
        toast.info('Profile metadata fetched, but the picture is private or not set.');
      } else {
        toast.error(msg || 'Failed to refresh profile');
      }
    } finally {
      setRefreshing(prev => ({ ...prev, [session.session_name]: false }));
    }
  };

  const handleCheckConnection = async (session: any) => {
    if (!user) return;
    setRefreshing(prev => ({ ...prev, [session.session_name]: true }));
    try {
      const data = await apiFetch(`/api/whatsapp/status/${user.id}?sessionName=${session.session_name}`);
      const newStatus = data.status || 'disconnected';
      setLiveStatuses(prev => ({ ...prev, [session.session_name]: newStatus }));
      
      if (newStatus === 'connected') {
        toast.success('Connection verified: Stable');
      } else {
        toast.error(`Connection status: ${newStatus.toUpperCase()}`);
      }
    } catch (e: any) {
      toast.error('Failed to verify connection');
    } finally {
      setRefreshing(prev => ({ ...prev, [session.session_name]: false }));
    }
  };

  const isUnlimited = maxAccounts === 0;
  const canAddMore = isUnlimited || sessions.length < maxAccounts;

  // Settings State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [settingsData, setSettingsData] = useState({
    pushname: '',
    openedDate: '',
    dailyLimit: '',
    warmupMode: false,
    syncContacts: false
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // AI Smart Reply State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiData, setAiData] = useState({
    ai_enabled: false,
    ai_provider: 'google',
    ai_api_key: '',
    ai_prompt: '',
    ai_model: 'gemini-2.5-flash-lite'
  });
  const [savingAi, setSavingAi] = useState(false);

  // Close menu on click outside
  useEffect(() => {
    const handleOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const handleOpenSettings = (session: any) => {
    setEditingSession(session);
    setSettingsData({
      pushname: session.device_info?.pushname || session.session_name,
      openedDate: session.device_info?.openedDate || '',
      dailyLimit: session.device_info?.dailyLimit || '',
      warmupMode: !!session.device_info?.warmupMode,
      syncContacts: !!session.device_info?.syncContacts,
    });
    setShowSettingsModal(true);
    setActiveMenu(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession || !user) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/sessions/${editingSession.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, settings: settingsData })
      });
      if (!res.ok) throw new Error('Failed to save settings');
      
      const updated = await res.json();
      setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, device_info: updated.device_info } : s));
      toast.success('Settings saved successfully');
      setShowSettingsModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenAiSettings = (session: any) => {
    setEditingSession(session);
    setAiData({
      ai_enabled: !!session.ai_enabled,
      ai_provider: session.ai_provider || 'google',
      ai_api_key: session.ai_api_key || '',
      ai_prompt: session.ai_prompt || '',
      ai_model: session.ai_model || 'gemini-2.5-flash-lite',
    });
    setShowAiModal(true);
    setActiveMenu(null);
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession || !user) return;
    setSavingAi(true);
    try {
      const res = await apiFetch('/api/whatsapp/ai-settings', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: user.id,
          instance_id: editingSession.id,
          ...aiData
        })
      });
      
      setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...aiData } : s));
      toast.success('AI settings updated successfully');
      setShowAiModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingAi(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm border border-primary/20">
                <Smartphone className="w-6 h-6 text-primary" />
             </div>
             <div>
                <h1 className="font-semibold text-foreground tracking-tight">WhatsApp Accounts</h1>
                <p className="text-muted-foreground font-medium italic text-sm">Link your devices to start sending automated campaigns.</p>
             </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button 
            onClick={() => {
              loadSessions(user.id);
              toast.success('Connection statuses refreshed');
            }}
            className="btn-icon shrink-0"
            title="Refresh All Status"
          >
            <RefreshCw className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-180 transition-transform duration-500" />
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            disabled={!canAddMore}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" /> 
            <span className="whitespace-nowrap">Add New Account</span>
          </button>

          <div className="badge-standard">
            <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            <span>Capacity: {sessions.length} / {isUnlimited ? '∞' : maxAccounts}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-[2rem] p-8 animate-pulse shadow-sm flex flex-col gap-6">
               {/* Top skeleton */}
               <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-muted rounded-2xl" />
                  <div className="flex gap-2">
                    <div className="h-7 w-24 bg-muted rounded-full" />
                    <div className="h-7 w-7 bg-muted rounded-full" />
                  </div>
               </div>

               {/* Content skeleton */}
               <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-6 w-3/4 bg-muted rounded-lg" />
                    <div className="h-4 w-1/2 bg-muted/60 rounded-md" />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-muted rounded" />
                      <div className="h-4 w-28 bg-muted rounded-md" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-muted rounded" />
                      <div className="h-4 w-40 bg-muted rounded-md" />
                    </div>
                  </div>
               </div>

               {/* Button skeleton */}
               <div className="pt-2">
                 <div className="h-10 md:h-11 w-full bg-muted/40 rounded-xl md:rounded-2xl" />
               </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-[2.5rem] shadow-sm animate-in fade-in zoom-in-95 duration-500">
           <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-8 relative">
              <Smartphone className="w-10 h-10 text-muted-foreground" />
              <div className="absolute -right-2 -top-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg border-4 border-card animate-bounce">
                 <Plus className="w-4 h-4" />
              </div>
           </div>
           <h2 className="text-2xl font-semibold text-foreground mb-3 tracking-tight">Connect your first number</h2>
           <p className="text-muted-foreground mb-10 max-w-sm text-center font-medium leading-relaxed">
              Link your WhatsApp account to unlock automated messaging, mass campaigns, and real-time analytics.
           </p>
            <button 
              onClick={() => setShowAddModal(true)} 
              disabled={!canAddMore} 
              className="btn-primary !px-10 !rounded-[1.5rem]"
            >
              <Plus className="w-4 h-4" /> Start Configuration
            </button>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {sessions.map((session, idx) => {
            const sName = session.session_name;
            const status = liveStatuses[sName] || session.status || 'disconnected';
            const isConnected = status === 'connected';
            const isPending = status === 'pending';
            const sessionQr = qrs[sName];

            return (
              <div 
                key={sName} 
                className="bg-card border border-border rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-sm transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-6"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Top Row: Image & Status */}
                <div className="flex items-start justify-between">
                  <div className="group/avatar relative w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden border border-border bg-secondary shadow-sm transition-all duration-300">
                    {session.device_info?.profile_pic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={session.device_info.profile_pic} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Smartphone className="w-6 h-6 md:w-7 md:h-7 text-primary opacity-30" />
                      </div>
                    )}
                    
                    {/* Refresh Overlay */}
                    {isConnected && (
                      <button 
                        onClick={() => handleRefreshProfile(session)}
                        disabled={refreshing[sName]}
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity ${refreshing[sName] ? 'opacity-100' : ''}`}
                        title="Refresh Profile"
                      >
                        <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 text-white ${refreshing[sName] ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 md:gap-3 relative">
                    <span className={`flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border transition-colors ${
                      isConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                      isPending ? 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse' : 
                      'bg-secondary text-muted-foreground border-border'
                    }`}>
                      <CheckCircle2 className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isConnected ? 'text-emerald-500' : 'opacity-50'}`} />
                      {String(status || 'disconnected').charAt(0).toUpperCase() + String(status || 'disconnected').slice(1)}
                    </span>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === sName ? null : sName);
                      }}
                      className="btn-icon bg-transparent border-none !w-6 !h-6"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 opacity-60" />
                    </button>
                    
                    {/* 3-dot Dropdown */}
                    {activeMenu === sName && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1.5 space-y-1">
                          {isConnected && (
                            <>
                              <button 
                                onClick={() => handleRefreshProfile(session)}
                                disabled={refreshing[sName]}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary text-foreground transition disabled:opacity-50"
                              >
                                <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing[sName] ? 'animate-spin' : ''}`} />
                                <span className="text-sm font-medium">Refresh Profile</span>
                              </button>
                               <button 
                                 onClick={() => handleCheckConnection(session)}
                                 disabled={refreshing[sName]}
                                 className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary text-foreground transition disabled:opacity-50"
                               >
                                 <ShieldCheck className={`w-4 h-4 text-emerald-500 ${refreshing[sName] ? 'animate-pulse' : ''}`} />
                                 <span className="text-sm font-medium">Test Connection</span>
                               </button>
                               <button 
                                 onClick={() => handleDisconnect(sName)}
                                 className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-orange-600 transition"
                               >
                                 <Pause className="w-4 h-4" />
                                 <span className="text-sm font-medium">Disconnect</span>
                               </button>
                            </>
                          )}
                          {!isConnected && (
                            <>
                               <button 
                                 onClick={() => handleCheckConnection(session)}
                                 disabled={refreshing[sName]}
                                 className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary text-foreground transition disabled:opacity-50"
                               >
                                 <ShieldCheck className={`w-4 h-4 text-emerald-500 ${refreshing[sName] ? 'animate-pulse' : ''}`} />
                                 <span className="text-sm font-medium">Test Connection</span>
                               </button>
                               <button 
                                 onClick={() => handleConnect(sName)}
                                 className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-50 text-emerald-600 transition"
                               >
                                 <Play className="w-4 h-4" />
                                 <span className="text-sm font-medium">Reconnect</span>
                               </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleOpenSettings(session)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary text-foreground transition"
                          >
                            <Settings className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Settings</span>
                          </button>
                          <div className="h-px bg-border mx-2 my-1" />
                          <button 
                            onClick={() => setDeleteConfirm(sName)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 font-bold transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-bold">Delete Account</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground tracking-tight">
                      {session.device_info?.pushname || (sName === 'default' ? 'Global Account' : sName)}
                    </h3>
                    <p className="text-muted-foreground text-sm font-medium mt-0.5 opacity-80">
                      {isPending ? 'Establishing session...' : sessionQr ? 'Scan QR to connect' : 'QR Code Connection'}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                     <div className="flex items-center gap-3 text-foreground font-medium">
                       <Smartphone className="w-4 h-4 text-muted-foreground" />
                       {session.phone_number ? (
                         <span>{session.phone_number}</span>
                       ) : (
                         <span className="text-muted-foreground/60 text-[13px] italic">No phone number</span>
                       )}
                     </div>
                      <div className="flex items-start gap-2 text-muted-foreground text-[12px] font-medium leading-tight">
                        <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                          <RefreshCw className="w-3 h-3" />
                        </div>
                        <span className="whitespace-nowrap">
                          Last active {session.last_active_at ? format(new Date(session.last_active_at), 'MMM dd, yyyy · hh:mm:ss a') : 'Never'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-border/50 mt-2 space-y-2">
                        <div className="flex items-center justify-between group/id">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Instance ID</p>
                            <p className="text-[11px] font-mono text-foreground/70 truncate max-w-[150px]">{session.id}</p>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(session.id);
                              toast.success('Instance ID copied!');
                            }}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-all opacity-0 group-hover/id:opacity-100"
                            title="Copy Instance ID"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2">
                  {isConnected ? (
                    <button 
                      onClick={() => handleDisconnect(sName)} 
                      className="w-full flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 font-bold transition-all active:scale-[0.98] dark:bg-red-500/10 dark:hover:bg-red-500/20 text-[13px] md:text-sm border border-red-100 dark:border-red-500/20"
                    >
                      <Power className="w-4 h-4 md:w-5 md:h-5 rotate-90" />
                      Disconnect
                    </button>
                  ) : sessionQr ? (
                    <div className="flex flex-col gap-4 md:gap-5">
                      <div className="relative p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-border inline-flex justify-center mx-auto shadow-sm group/qr">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(sessionQr)}`} 
                          alt="WhatsApp QR" 
                          className={`w-48 h-48 md:w-64 md:h-64 rounded-xl transition-all duration-500 ${qrTimers[sName] === 0 ? 'opacity-20 blur-sm scale-95' : 'opacity-100'}`} 
                        />
                        
                        {qrTimers[sName] === 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-6 text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-red-50 rounded-full flex items-center justify-center mb-3 md:mb-4 border border-red-100">
                              <Clock className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
                            </div>
                            <h4 className="font-bold text-foreground text-base md:text-lg">QR Expired</h4>
                            <p className="text-muted-foreground text-[10px] md:text-xs font-medium mt-1">For security, QR codes expire after 2 minutes.</p>
                          </div>
                        )}
                      </div>

                      {/* Validity Countdown */}
                      {qrTimers[sName] !== undefined && (
                        <div className="px-2 md:px-4 space-y-2 md:space-y-3">
                          <div className="flex items-center justify-between text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
                            <span className={qrTimers[sName] === 0 ? 'text-red-500' : 'text-muted-foreground'}>
                              {qrTimers[sName] === 0 ? 'Validity Expired' : 'QR Code Validity'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md ${qrTimers[sName] < 10 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-secondary text-foreground'}`}>
                              {formatTime(qrTimers[sName])}
                            </span>
                          </div>
                          <div className="h-1 md:h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                            <div 
                              className={`h-full transition-all duration-1000 ease-linear ${
                                qrTimers[sName] < 10 ? 'bg-red-500' : 'bg-primary'
                              }`}
                              style={{ width: `${(qrTimers[sName] / 120) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                        <button 
                          onClick={() => handleConnect(sName)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-primary text-primary-foreground font-bold transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/20 text-[13px] md:text-sm"
                        >
                          <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isPending && !sessionQr ? 'animate-spin' : ''}`} />
                          {qrTimers[sName] === 0 ? 'Regenerate QR' : 'Refresh QR'}
                        </button>
                    </div>
                  ) : (
                      <button 
                        onClick={() => handleConnect(sName)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold transition-all active:scale-[0.98] dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-[13px] md:text-sm border border-emerald-100 dark:border-emerald-500/20"
                      >
                        <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isPending ? 'animate-spin' : ''}`} />
                        {isPending ? 'Connecting...' : 'Reconnect'}
                      </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modern Add Session Modal - Standardized Spacing */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -z-10" />
            
            <button 
              onClick={() => setShowAddModal(false)} 
              className="absolute top-8 right-8 p-2.5 rounded-[1rem] text-muted-foreground bg-secondary hover:bg-secondary/80 hover:text-foreground transition"
            >
              <X className="w-5 h-5"/>
            </button>

            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-10 shadow-sm border border-primary/20">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-3 mb-12">
              <h3 className="text-2xl font-semibold text-foreground tracking-tight">Add New Device</h3>
              <p className="text-muted-foreground text-sm font-medium pr-4 leading-relaxed">Initialize a new WhatsApp instance. Give it a descriptive name to stay organized.</p>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-10">
              <div className="space-y-3">
                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Session Identity</label>
                <input 
                  autoFocus
                  type="text" 
                  maxLength={30}
                  required
                  value={newSessionName} 
                  onChange={e => setNewSessionName(e.target.value)} 
                  placeholder="e.g. Sales Desk · London"
                   className="w-full bg-secondary outline-none border-2 border-transparent rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/30 focus:bg-background transition-all font-medium text-lg"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={addLoading} 
                className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-lg transition shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-[0.98]"
              >
                {addLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : <Plus className="w-6 h-6"/>}
                Initialize Workspace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Premium Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-red-950/20 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border-2 border-destructive/20 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-8 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-[5rem] -z-10" />
            
            <div className="flex items-start gap-6 mb-10">
              <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center border border-destructive/20 flex-shrink-0 shadow-sm relative">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <div className="pt-2">
                <h3 className="text-2xl font-semibold text-foreground tracking-tight leading-tight mb-1">Remove Device?</h3>
                <p className="text-destructive/80 font-semibold text-[10px] uppercase tracking-widest truncate max-w-[180px]">{deleteConfirm}</p>
              </div>
            </div>

            <div className="bg-secondary/50 p-6 rounded-[2rem] border border-border mb-10">
              <p className="text-foreground text-sm font-medium leading-relaxed">
                This action will permanently terminate the session. All ongoing automated sequences for this number will be <span className="text-destructive font-semibold">halted immediately</span>.
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="flex-1 px-4 py-4 rounded-2xl border-2 border-border text-muted-foreground hover:bg-secondary transition active:scale-95"
              >
                Keep Active
              </button>
              <button 
                onClick={() => handleDeleteSession(deleteConfirm)} 
                disabled={deleting} 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/20 text-destructive-foreground transition disabled:opacity-50 active:scale-95 group"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5 group-hover:shake" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Device Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2.5rem] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Device Settings</h3>
                  <p className="text-muted-foreground text-sm mt-0.5 pr-2">Configure device name, WhatsApp account info, and sending limits.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto p-8 pt-4 space-y-6">
              {/* Device Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Device Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={settingsData.pushname}
                  onChange={e => setSettingsData(prev => ({ ...prev, pushname: e.target.value }))}
                  className="w-full bg-secondary outline-none border-2 border-transparent rounded-2xl px-5 py-3 text-foreground font-semibold focus:border-primary/30 focus:bg-background transition"
                />
              </div>

              {/* Account Opened Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground ml-1">WhatsApp Account Opened Date</label>
                <div className="relative">
                  <input 
                    type="date"
                    value={settingsData.openedDate}
                    onChange={e => setSettingsData(prev => ({ ...prev, openedDate: e.target.value }))}
                    className="w-full bg-secondary outline-none border-2 border-transparent rounded-2xl px-5 py-3 text-foreground font-semibold focus:border-primary/30 focus:bg-background transition pr-12"
                  />
                  <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {/* Info Note */}
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-3.5 rounded-2xl flex gap-3 text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    The date this WhatsApp number was first registered. Used to auto-calculate safe daily limits: <span className="font-semibold">&lt;30 days: 200/day</span>, <span className="font-semibold">30–90 days: 500/day</span>, <span className="font-semibold">&gt;90 days: 800/day</span>.
                  </p>
                </div>
              </div>

              {/* Daily Limit Override */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Daily Limit Override (optional)</label>
                <input 
                  type="number"
                  placeholder="Leave empty to use auto-calculated limit"
                  value={settingsData.dailyLimit}
                  onChange={e => setSettingsData(prev => ({ ...prev, dailyLimit: e.target.value }))}
                  className="w-full bg-secondary outline-none border-2 border-transparent rounded-2xl px-5 py-3 text-foreground font-semibold focus:border-primary/30 focus:bg-background transition"
                />
                <p className="text-[10px] text-muted-foreground font-medium ml-1">Set a custom daily message limit. Overrides the age-based default.</p>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-2">
                {/* Warm-up Mode */}
                <div className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-2xl hover:bg-secondary/50 transition">
                  <div className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-orange-500 mt-1" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Warm-up Mode</h4>
                      <p className="text-[11px] text-muted-foreground font-medium">14-day gradual ramp for new/risky numbers (10 → 700 msgs/day)</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settingsData.warmupMode} onChange={e => setSettingsData(prev => ({ ...prev, warmupMode: e.target.checked }))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Contact Auto Sync */}
                <div className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-2xl hover:bg-secondary/50 transition">
                  <div className="flex gap-3">
                    <RefreshCw className="w-5 h-5 text-emerald-500 mt-1" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Contact Auto Sync</h4>
                      <p className="text-[11px] text-muted-foreground font-medium">Sync WhatsApp contacts to your system. Turn off for privacy (only allowed devices should sync).</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settingsData.syncContacts} onChange={e => setSettingsData(prev => ({ ...prev, syncContacts: e.target.checked }))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* Meta Info from Screenshot */}
              <div className="flex items-center justify-center gap-1.5 pt-4 text-[10px] text-muted-foreground font-semibold uppercase tracking-tighter opacity-50">
                <span>©2026 Wa Cloud</span>
                <span>•</span>
                <span>Powered by Globyn</span>
                <span>•</span>
                <span>Made in Bangladesh</span>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-8 border-t border-border flex gap-4">
              <button 
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 px-4 py-4 rounded-2xl border-2 border-border text-foreground hover:bg-secondary transition active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex-[1.5] flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-[#0d5c4b] hover:bg-[#0d5c4b]/90 text-white transition shadow-xl shadow-emerald-500/10 active:scale-95"
              >
                {savingSettings ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Connection Modal - Matching Screenshot 100% */}
      {showQrModal && activeQrSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#111111] border border-white/10 rounded-[2rem] w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden py-10 px-8">
            <button 
              onClick={() => {
                setShowQrModal(false);
                setActiveQrSession(null);
              }}
              className="absolute top-8 right-8 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition group"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            </button>

            <div className="flex gap-4 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 flex-shrink-0">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-xl font-semibold text-white tracking-tight">Connect WhatsApp</h3>
                <p className="text-white/50 text-[11px] font-medium leading-relaxed">
                  Scan the QR code with your WhatsApp to connect your account
                </p>
              </div>
            </div>

            {/* QR display area */}
            <div className="mt-8 mb-6 flex flex-col items-center">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-black/40 ring-1 ring-white/10 group">
                {qrs[activeQrSession] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrs[activeQrSession])}`} 
                    alt="WhatsApp QR" 
                    className={`w-48 h-48 rounded-2xl transition-all duration-700 ${qrTimers[activeQrSession] === 0 ? 'opacity-10 blur-sm scale-95' : 'opacity-100 animate-in fade-in'}`} 
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-zinc-50 rounded-2xl">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="mt-8 space-y-3 flex flex-col items-center">
                <p className="text-[11px] font-bold text-white/60 tracking-wider">
                  QR code expires in <span className="text-primary ml-1">{formatTime(qrTimers[activeQrSession] || 0)}</span>
                </p>
                <button 
                  onClick={() => handleConnect(activeQrSession)}
                  className="flex items-center gap-2 text-white text-[12px] font-bold hover:text-primary transition group active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                  Refresh QR Code
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
              <h4 className="text-[12px] font-bold text-white/90 uppercase tracking-widest ml-1">How to connect:</h4>
              <div className="space-y-3">
                {[
                  "Open WhatsApp on your phone",
                  "Go to Settings → Linked Devices",
                  "Tap \"Link a Device\" and scan this QR code"
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-4 animate-in fade-in slide-in-from-left duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className="w-5 h-5 rounded-full bg-[#00a787] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-[12px] text-white/70 font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Smart Reply Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            <div className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm border border-primary/20">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">AI Smart Reply</h2>
                    <p className="text-muted-foreground text-sm font-medium">Automate your responses using AI</p>
                  </div>
                </div>
                <button onClick={() => setShowAiModal(false)} className="btn-icon">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAiSettings} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl border border-border">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-foreground">Enable AI Auto-Reply</label>
                    <p className="text-[11px] text-muted-foreground font-medium">Automatically respond to incoming messages</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiData(prev => ({ ...prev, ai_enabled: !prev.ai_enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${aiData.ai_enabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiData.ai_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-primary" /> Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your Google Gemini API Key"
                      value={aiData.ai_api_key}
                      onChange={(e) => setAiData(prev => ({ ...prev, ai_api_key: e.target.value }))}
                      className="input-standard !rounded-xl"
                      required={aiData.ai_enabled}
                    />
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 ml-1">
                      <Info className="w-3 h-3" /> Get it from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google AI Studio</a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Model
                    </label>
                    <select
                      value={aiData.ai_model}
                      onChange={(e) => setAiData(prev => ({ ...prev, ai_model: e.target.value }))}
                      className="input-standard !rounded-xl"
                    >
                      <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fast & Low Cost)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Intelligence)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Wand2 className="w-3.5 h-3.5 text-primary" /> Custom AI Instructions
                    </label>
                    <textarea
                      placeholder="Example: Act as a helpful customer support agent for Globyn Cloud. Keep responses professional and under 100 characters."
                      value={aiData.ai_prompt}
                      onChange={(e) => setAiData(prev => ({ ...prev, ai_prompt: e.target.value }))}
                      className="input-standard !rounded-xl min-h-[120px] py-3 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="flex-1 px-6 py-3.5 rounded-2xl border border-border text-foreground font-bold hover:bg-secondary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAi}
                    className="flex-1 btn-primary !rounded-2xl !py-3.5 shadow-lg shadow-primary/20"
                  >
                    {savingAi ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save AI Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
