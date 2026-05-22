'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import {
  BarChart3, TrendingUp, Users, MessageSquare, Zap, Smartphone,
  CheckCircle2, XCircle, Clock, Award, Lock, FileText, Loader2, RefreshCcw,
  Eye, Send, CheckCheck
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart,
  Pie, Cell, AreaChart, Area
} from 'recharts';

const PLAN_ORDER = ['free_trial', 'starter', 'pro', 'enterprise'];
const PRO_PLANS = ['pro', 'enterprise', 'admin', 'owner'];

const COLORS = ['#085E4D', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState<string>('free_trial');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Stats
  const [msgStats, setMsgStats] = useState({
    total: 0, sent: 0, failed: 0, pending: 0,
    delivered: 0, read: 0,
    successRate: '0', deliveryRate: '0', readRate: '0',
    inboxStats: { total: 0, delivered: 0, read: 0, pending: 0, sentOnly: 0, readRate: '0', deliveryRate: '0' }
  });
  const [dailyChart, setDailyChart] = useState<any[]>([]);
  const [campaignChart, setCampaignChart] = useState<any[]>([]);
  const [templateChart, setTemplateChart] = useState<any[]>([]);
  const [contactStats, setContactStats] = useState<{ groups: any[]; total: number; ungrouped: number }>({ groups: [], total: 0, ungrouped: 0 });
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(200);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      await loadData(data.user.id);
    });
  }, []);

  async function loadData(userId: string) {
    setLoading(true);
    try {
      const stats = await apiFetch(`/api/analytics/${userId}`);
      setPlan(stats.plan || 'free_trial');
      setMsgStats(stats.msgStats);
      setDailyChart(stats.dailyChart);
      setHeatmap(stats.heatmap);
      setQuotaUsed(stats.quotaUsed);
      setCampaignChart(stats.campaignChart);
      setTemplateChart(stats.templateChart);
      setContactStats(stats.contactStats);

      const limits: Record<string, number> = { free_trial: 0, starter: 200, pro: 1000, enterprise: 0, admin: 0, owner: 0 };
      setQuotaLimit(limits[stats.plan] || 200);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  const isPro = PRO_PLANS.includes(plan);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium italic">Analyzing performance data...</p>
      </div>
    );
  }

  const isUnlimited = quotaLimit === 0;
  const quotaPct = isUnlimited ? 0 : Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));

  // ── SHARED COMPONENTS ─────────────────────────────────────────────────────
  const StatCard = ({ label, value, subValue, icon: Icon, color, bg, delay }: any) => (
    <div className={`bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${delay}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shadow-sm`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {subValue && (
          <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-lg">{subValue}</span>
        )}
      </div>
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );

  const ChartContainer = ({ title, subtitle, icon: Icon, children, color }: any) => (
    <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );

  // Inbox message status donut data
  const inboxDonutData = [
    { name: 'Seen / Read', value: msgStats.inboxStats?.read || 0, color: '#3b82f6' },
    { name: 'Delivered', value: Math.max(0, (msgStats.inboxStats?.delivered || 0) - (msgStats.inboxStats?.read || 0)), color: '#10b981' },
    { name: 'Sent Only', value: msgStats.inboxStats?.sentOnly || 0, color: '#f59e0b' },
    { name: 'Pending', value: msgStats.inboxStats?.pending || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // ── HEADER SECTION ────────────────────────────────────────────────────────
  const Header = () => (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-semibold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" /> Analytics Insights
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl font-medium">
            Analyze your campaign effectiveness, delivery rates, and audience engagement levels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (user) {
                await loadData(user.id);
                toast('Analytics refreshed', 'success');
              }
            }}
            className="btn-icon"
            title="Refresh Data"
          >
            <RefreshCcw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!isPro && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl border border-amber-500/20 text-[10px] font-semibold uppercase tracking-wider">
              <Zap className="w-4 h-4" /> {plan?.replace('_', ' ') || 'Free Trial'} Plan
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── FREE / STARTER: Basic analytics ──────────────────────────────────────
  if (!isPro) {
    return (
      <div className="p-4 md:p-8 pb-24 min-h-screen">
        <Header />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total Sent" value={msgStats.sent.toLocaleString()} subValue={`${msgStats.deliveryRate}% delivered`} icon={Send} color="text-emerald-500" bg="bg-emerald-500/10" delay="delay-0" />
          <StatCard label="Delivered" value={msgStats.delivered.toLocaleString()} subValue={`of ${msgStats.sent} sent`} icon={CheckCheck} color="text-blue-500" bg="bg-blue-500/10" delay="delay-75" />
          <StatCard label="Read Rate" value={`${msgStats.readRate}%`} subValue={`${msgStats.read} seen`} icon={Eye} color="text-indigo-500" bg="bg-indigo-500/10" delay="delay-150" />
          <StatCard label="Audience" value={contactStats.total.toLocaleString()} icon={Users} color="text-purple-500" bg="bg-purple-500/10" delay="delay-200" />
        </div>

        <div className="space-y-8">
          <ChartContainer 
            title="Daily Delivery Volume" 
            subtitle="Sent vs Delivered vs Read — last 14 days" 
            icon={TrendingUp}
            color="bg-primary"
          >
            {dailyChart.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center italic text-muted-foreground font-medium">No activity detected yet.</div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChart.slice(-14)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSentFree" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDelivFree" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradReadFree" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', padding: '12px' }} 
                      itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                    <Area type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradSentFree)" name="Sent" animationDuration={1500} />
                    <Area type="monotone" dataKey="delivered" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gradDelivFree)" name="Delivered" animationDuration={1500} />
                    <Area type="monotone" dataKey="read" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#gradReadFree)" name="Read / Seen" animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartContainer>

          {/* Quota Progress */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Daily Message Quota</h2>
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">{quotaUsed} / {quotaLimit} Used</span>
            </div>
            <div className="h-4 bg-secondary rounded-full overflow-hidden border border-border shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${quotaPct >= 90 ? 'bg-destructive' : quotaPct >= 70 ? 'bg-orange-500' : 'bg-primary'}`} 
                style={{ width: `${quotaPct}%` }} 
              />
            </div>
            <div className="flex justify-between mt-4">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3 h-3" /> Resets at midnight
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{quotaLimit - quotaUsed} messages remaining today</span>
            </div>
          </div>

          {/* Upgrade Banner */}
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-8 flex items-center gap-8 shadow-lg shadow-primary/10 relative overflow-hidden group">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner backdrop-blur-sm">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-white font-semibold text-xl tracking-tight">Unlock Advanced Analytics</h3>
              <p className="text-primary-foreground/80 text-sm mt-1 font-medium max-w-lg">Get campaign heatmaps, template performance scores, detailed contact breakdowns, and read receipt tracking.</p>
            </div>
            <a 
              href="/dashboard/billing"
              className="bg-white hover:bg-zinc-100 dark:bg-card dark:hover:bg-accent text-primary px-8 py-3 rounded-xl shadow-xl transition-all hover:scale-[1.03] active:scale-[0.97] whitespace-nowrap relative z-10 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Upgrade Pro
            </a>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── PRO+: Full advanced analytics ─────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 pb-24 min-h-screen">
      <Header />

      {/* Summary Cards — 4 key KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Sent" value={msgStats.sent.toLocaleString()} subValue={`${msgStats.deliveryRate}% delivered`} icon={Send} color="text-emerald-500" bg="bg-emerald-500/10" delay="delay-0" />
        <StatCard label="Delivered" value={msgStats.delivered.toLocaleString()} subValue={`of ${msgStats.sent} sent`} icon={CheckCheck} color="text-blue-500" bg="bg-blue-500/10" delay="delay-75" />
        <StatCard label="Total Read" value={msgStats.read.toLocaleString()} subValue={`${msgStats.inboxStats?.read || 0} from inbox`} icon={Eye} color="text-cyan-500" bg="bg-cyan-500/10" delay="delay-150" />
        <StatCard label="Read Rate" value={`${msgStats.readRate}%`} subValue="of delivered msgs" icon={TrendingUp} color="text-orange-500" bg="bg-orange-500/10" delay="delay-200" />
      </div>

      {/* Inbox-specific mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Inbox Sent', value: msgStats.inboxStats?.total || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Inbox Delivered', value: msgStats.inboxStats?.delivered || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Inbox Seen', value: msgStats.inboxStats?.read || 0, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'Inbox Read Rate', value: `${msgStats.inboxStats?.readRate || '0'}%`, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4 border border-border/50`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {/* Daily Volume Chart — Sent + Delivered + Read */}
        <ChartContainer title="Global Message Trends" subtitle="Sent · Delivered · Read — 30 day overview" icon={TrendingUp} color="bg-emerald-600">
          {dailyChart.length === 0 ? (
            <p className="text-zinc-500 text-center py-12 italic">Initial data gathering in progress...</p>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChart}>
                  <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDeliv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', padding: '12px' }} itemStyle={{ fontSize: '11px', fontWeight: 800 }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <Area type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#gradSent)" name="Sent" />
                  <Area type="monotone" dataKey="delivered" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gradDeliv)" name="Delivered" />
                  <Area type="monotone" dataKey="read" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#gradRead)" name="Read / Seen" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartContainer>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Campaign Performance */}
          <ChartContainer title="Top Campaigns" subtitle="Efficiency scores of your top performing campaigns" icon={Award} color="bg-orange-500">
            {campaignChart.length === 0 ? (
              <p className="text-zinc-500 text-center py-12 italic">No campaigns recorded yet.</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fontWeight: 700 }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '10px' }} itemStyle={{ fontSize: '11px', fontWeight: 800 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                    <Bar dataKey="sent" fill="#10b981" name="Sent" radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartContainer>

          {/* Inbox Message Status Donut */}
          <ChartContainer title="Inbox Message Status" subtitle="Breakdown of your sent inbox messages (last 30 days)" icon={MessageSquare} color="bg-violet-600">
            {inboxDonutData.length === 0 ? (
              <p className="text-zinc-500 text-center py-12 italic">No inbox messages yet.</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-full sm:w-[50%] h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={inboxDonutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="value">
                        {inboxDonutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                        formatter={(val: any) => [`${val} msgs`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {inboxDonutData.map((d, i) => {
                    const total = inboxDonutData.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-xs font-semibold text-foreground">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{d.value.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-muted-foreground/60">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Delivery Rate</span>
                      <span className="text-blue-500">{msgStats.inboxStats?.deliveryRate || '0'}%</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                      <span>Read Rate</span>
                      <span className="text-violet-500">{msgStats.inboxStats?.readRate || '0'}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Group Breakdown */}
          <ChartContainer title="Audience Distribution" subtitle="Composition of your contact groups" icon={Users} color="bg-purple-600">
            {contactStats.groups.length === 0 ? (
              <p className="text-zinc-500 text-center py-12 italic">No contact data available.</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-full sm:w-[50%] h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contactStats.groups} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                        {contactStats.groups.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {contactStats.groups.slice(0, 5).map((g, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{g.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{g.value}</span>
                    </div>
                  ))}
                  {contactStats.ungrouped > 0 && (
                    <div className="flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-muted-foreground">Ungrouped</span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{contactStats.ungrouped}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ChartContainer>

          {/* Hourly Heatmap */}
          <ChartContainer title="Peak Engagement Hours" subtitle="Messages sent by hour — last 7 days" icon={Clock} color="bg-cyan-600">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmap}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#06b6d4" name="Messages" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </div>

        {/* Template Performance */}
        <ChartContainer title="Template Utility" subtitle="Performance scores of used templates" icon={FileText} color="bg-orange-600">
          {templateChart.length === 0 ? (
            <p className="text-zinc-500 text-center py-12 italic">No message templates usage yet.</p>
          ) : (
            <div className="space-y-4">
              {templateChart.slice(0, 5).map((t, i) => {
                const max = templateChart[0].count;
                const pct = max > 0 ? (t.count / max) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[250px]">{t.name}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{t.count.toLocaleString()} Sent</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
                      <div className="h-full rounded-full transition-all duration-500 shadow-sm" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartContainer>

        {/* Quota Section for Pro */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Enterprise Quota Threshold</h2>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${quotaPct >= 90 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'} border`}>
                {quotaPct}% Consumed
              </span>
           </div>
           <div className="h-4 bg-secondary rounded-full overflow-hidden border border-border shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${quotaPct >= 90 ? 'bg-destructive' : quotaPct >= 70 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                style={{ width: `${quotaPct}%` }} 
              />
            </div>
            <div className="flex justify-between mt-4">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Sent Today</span>
                  <span className="text-sm font-semibold text-foreground">{quotaUsed.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Total Limit</span>
                  <span className="text-sm font-semibold text-foreground">{isUnlimited ? 'Unlimited' : quotaLimit.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Available Quota</span>
                <span className="text-sm font-semibold text-emerald-500">{isUnlimited ? '∞' : (quotaLimit - quotaUsed).toLocaleString()} msgs</span>
              </div>
            </div>
        </div>

      </div>

      <p className="text-center text-muted-foreground text-[9px] font-semibold uppercase tracking-[0.2em] py-16 flex items-center justify-center gap-4">
        <span className="w-8 h-[1px] bg-border" />
        INTELLIGENCE ENGINE · ANALYTICS v4.3
        <span className="w-8 h-[1px] bg-zinc-200" />
      </p>
    </div>
  );
}
