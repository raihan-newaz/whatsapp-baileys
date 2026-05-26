'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { MessageCircle, Users, Megaphone, CheckCircle, XCircle, X, Clock, Wifi, WifiOff, MessageSquare, Smartphone, Search, RefreshCcw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { format } from 'date-fns';

interface UsageLimit {
  current: number;
  limit: number;
}

interface Stats {
  whatsappStatus: string;
  totalContacts: number;
  totalCampaigns: number;
  sentToday: number;
  failedToday: number;
  queuePending: number;
  plan_expires_at?: string;
  usage?: {
    deviceConnections: UsageLimit;
    messagesMonthly: UsageLimit;
    contacts: UsageLimit;
    numberCheckerCredits: UsageLimit;
    apiRequests: UsageLimit;
    additionalUsers: UsageLimit;
    mediaStorage: UsageLimit;
  };
}

function StatCard({ icon: Icon, label, value, color, delay }: { icon: any; label: string; value: string | number; color: string; delay?: string }) {
  return (
    <div className={`bg-card rounded-2xl p-5 shadow-sm border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2 ${delay}`}>
      <div className="flex flex-col gap-4">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest mb-1.5 opacity-80">{label}</p>
          <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function UsageLimitRow({ icon: Icon, label, current, limit, unit = '', showBadge = false, badgeText = '' }: { icon: any; label: string; current: number; limit: number; unit?: string; showBadge?: boolean; badgeText?: string }) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isLimitReached = current >= limit && limit > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
           <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {showBadge && isLimitReached && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <XCircle className="w-3 h-3" /> {badgeText}
            </span>
          )}
           <span className="text-sm font-medium text-foreground">
            {unit === 'MB' ? (
              current < 1024 ? `${current.toLocaleString()} B` :
              current < 1024 * 1024 ? `${(current / 1024).toFixed(1)} KB` :
              `${(current / (1024 * 1024)).toFixed(1)} MB`
            ) : current.toLocaleString()} 
            <span className="text-muted-foreground font-medium"> / {limit === 0 ? 'Unlimited' : (unit === 'MB' ? `${(limit / 1024 / 1024).toFixed(0)} MB` : limit.toLocaleString())}</span>
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isLimitReached ? 'bg-destructive' : 'bg-primary'}`} 
          style={{ width: `${limit === 0 ? 0 : percentage}%` }} 
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ 
    whatsappStatus: 'disconnected', 
    totalContacts: 0, 
    totalCampaigns: 0, 
    sentToday: 0, 
    failedToday: 0, 
    queuePending: 0,
    usage: {
      deviceConnections: { current: 0, limit: 1 },
      messagesMonthly: { current: 0, limit: 60000 },
      contacts: { current: 0, limit: 25000 },
      numberCheckerCredits: { current: 0, limit: 3000 },
      apiRequests: { current: 0, limit: 30000 },
      additionalUsers: { current: 0, limit: 0 },
      mediaStorage: { current: 0, limit: 104857600 }
    }
  });
  const [userId, setUserId] = useState('');
  const [mounted, setMounted] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('');
  const [showBanner, setShowBanner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { success } = useToast();

  const loadStats = async (uid: string) => {
    setRefreshing(true);
    try {
      const statsData = await apiFetch(`/api/stats?userId=${uid}`);
      if (statsData) {
        setStats(statsData);
        setLastUpdated(new Date().toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          second: '2-digit', 
          hour12: true 
        }));
        // If stats says disconnected, double-check directly with sessions API
        if (statsData.whatsappStatus !== 'connected') {
          try {
            const sessions = await apiFetch(`/api/whatsapp/sessions/${uid}`);
            if (Array.isArray(sessions) && sessions.some((s: any) => s.status === 'connected')) {
              setStats((prev: Stats) => ({ ...prev, whatsappStatus: 'connected' }));
            }
          } catch (e) { /* ignore secondary check errors */ }
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      // Stats API failed — try to at least get WhatsApp connection status
      try {
        const sessions = await apiFetch(`/api/whatsapp/sessions/${uid}`);
        if (Array.isArray(sessions) && sessions.some((s: any) => s.status === 'connected')) {
          setStats((prev: Stats) => ({ ...prev, whatsappStatus: 'connected' }));
        }
      } catch (e) { /* ignore */ }
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    await loadStats(userId);
    success('Dashboard stats refreshed');
  };

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const uid = data.user.id;
      setUserId(uid);
      
      try {
        await loadStats(uid);
        const profile = await apiFetch(`/api/profiles/${uid}`);

        if (profile) {
          setUserPlan(profile.plan);
          const isDismissed = localStorage.getItem('hide_trial_banner');
          if (profile.plan === 'free_trial' && !isDismissed) {
            setShowBanner(true);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch profile:', err);
      }
    });
  }, []);

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('hide_trial_banner', 'true');
  };

  const isConnected = stats.whatsappStatus === 'connected';

  const formatPlanName = (p: string) => {
    if (!p) return 'Free Plan';
    return p.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-medium text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Monitor your WhatsApp marketing performance in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="badge-standard">
            <Clock className="w-4 h-4 text-primary" />
            <span>Last Updated: {mounted ? (lastUpdated || '--:----') : '--:----'}</span>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-icon"
            title="Refresh stats"
          >
            <RefreshCcw className={`w-4 h-4 md:w-5 md:h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Trial Banner */}
      {showBanner && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl p-5 md:p-6 flex items-center gap-6 shadow-sm relative group animate-in fade-in slide-in-from-top-4 duration-500">
           {/* Dismiss Button */}
           <button 
             onClick={dismissBanner}
             className="absolute top-5 right-6 p-1 text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
           >
             <X className="w-4 h-4" />
           </button>

           {/* Icon Box */}
           <div className="w-16 h-16 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0 shadow-inner">
             <Clock className="w-8 h-8 text-orange-500 dark:text-orange-400" />
           </div>

           <div className="flex-1">
             <div className="flex items-center gap-4 mb-1">
                <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-widest border border-orange-200 dark:border-orange-800">
                 Free Trial
               </span>
                <span className="text-foreground font-medium text-xl tracking-tight">Solo</span>
             </div>
             <p className="text-muted-foreground text-base font-medium">
               Only <span className="text-orange-600 dark:text-orange-400 font-semibold">{stats.plan_expires_at ? Math.max(0, Math.ceil((new Date(stats.plan_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '2'} days left!</span> Subscribe before your trial ends.
             </p>
           </div>

           <a 
             href="/billing"
             className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.03] active:scale-[0.97] whitespace-nowrap hidden sm:block"
           >
             Upgrade
           </a>
        </div>
      )}

      {/* WhatsApp status banner */}
      <div className={`flex items-center gap-4 px-6 py-5 rounded-3xl border shadow-sm transition-all duration-500 ${isConnected ? 'bg-card border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${isConnected ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        </div>
        <div className="flex-1">
           <p className={`font-medium tracking-tight ${isConnected ? 'text-foreground' : 'text-destructive'}`}>
            WhatsApp Status: {isConnected ? 'Connected & Active' : 'Not Connected'}
          </p>
          <p className="text-muted-foreground text-xs font-medium">
            {isConnected ? 'Your device is currently sending and receiving messages smoothly.' : 'Go to WhatsApp Manager to scan your QR code and start messaging.'}
          </p>
        </div>
        {isConnected ? (
           <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded-full uppercase tracking-widest border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live Now
          </div>
        ) : (
          <Link href="/whatsapp">
            <button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-5 py-2 rounded-xl shadow-lg shadow-destructive/20 transition-all uppercase tracking-widest">
              Fix Connection
            </button>
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        <StatCard icon={Users} label="Total Contacts" value={stats.totalContacts.toLocaleString()} color="bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20" delay="delay-0" />
        <StatCard icon={Megaphone} label="Total Campaigns" value={stats.totalCampaigns.toLocaleString()} color="bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20" delay="delay-75" />
        <StatCard icon={CheckCircle} label="Sent Today" value={stats.sentToday.toLocaleString()} color="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20" delay="delay-100" />
        <StatCard icon={XCircle} label="Failed Today" value={stats.failedToday.toLocaleString()} color="bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20" delay="delay-150" />
        <StatCard icon={Clock} label="Queue Pending" value={stats.queuePending.toLocaleString()} color="bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20" delay="delay-200" />
        <StatCard icon={MessageCircle} label="Active Sessions" value={stats.usage?.deviceConnections.current.toLocaleString() || (isConnected ? '1' : '0')} color="bg-teal-500/10 text-teal-500 dark:text-teal-400 border border-teal-500/20" delay="delay-300" />
      </div>

      {/* Quick Actions / Activity Feed Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-xl p-8 shadow-sm border border-border">
           <h2 className="text-xl font-medium text-foreground mb-6 flex items-center gap-3">
             <div className="w-2 h-6 bg-primary rounded-full" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Create Campaign', icon: Megaphone, href: '/campaigns' },
              { label: 'Connect WhatsApp', icon: Smartphone, href: '/whatsapp' },
              { label: 'Import Contacts', icon: Users, href: '/contacts' },
              { label: 'Check Numbers', icon: Search, href: '/tools/number-checker' },
            ].map(action => (
              <a key={action.label} href={action.href} className="p-4 rounded-2xl border border-border hover:border-primary hover:bg-primary/5 group transition-all duration-300">
                <action.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                 <p className="text-sm font-medium text-card-foreground group-hover:text-primary">{action.label}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-sm border border-border flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6 border border-border">
               <MessageSquare className="w-10 h-10 text-muted-foreground" />
            </div>
             <h3 className="font-medium text-foreground text-lg mb-2">No recent activity</h3>
            <p className="text-muted-foreground text-sm max-w-xs">Start a campaign or import contacts to see your recent interactions here.</p>
        </div>
      </div>

      {/* Usage & Limits */}
      {stats.usage && (
        <div className="bg-card rounded-xl p-8 shadow-sm border border-border">
           <h2 className="text-xl font-medium text-foreground mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-primary rounded-full" /> Usage & Limits
            </div>
            {stats.plan_expires_at && (
               <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
                {formatPlanName(userPlan)} - Plan Expires: {new Date(stats.plan_expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <UsageLimitRow icon={Smartphone} label="Device Connections" current={stats.usage.deviceConnections.current} limit={stats.usage.deviceConnections.limit} showBadge badgeText="Limit Reached" />
            <UsageLimitRow icon={MessageCircle} label="Messages (Monthly)" current={stats.usage.messagesMonthly.current} limit={stats.usage.messagesMonthly.limit} />
            <UsageLimitRow icon={Users} label="Contacts" current={stats.usage.contacts.current} limit={stats.usage.contacts.limit} />
            <UsageLimitRow icon={Smartphone} label="Number Checker Credits" current={stats.usage.numberCheckerCredits.current} limit={stats.usage.numberCheckerCredits.limit} />
            <UsageLimitRow icon={Wifi} label="API Requests (Monthly)" current={stats.usage.apiRequests.current} limit={stats.usage.apiRequests.limit} />
            <UsageLimitRow icon={Users} label="Additional Users" current={stats.usage.additionalUsers.current} limit={stats.usage.additionalUsers.limit} showBadge badgeText="Limit Reached" />
            <div className="md:col-span-2 pt-4 border-t border-border">
               <UsageLimitRow icon={MessageSquare} label="Media Storage" current={stats.usage.mediaStorage.current} limit={stats.usage.mediaStorage.limit} unit="MB" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
