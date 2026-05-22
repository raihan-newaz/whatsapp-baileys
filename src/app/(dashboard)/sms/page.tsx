'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { 
  Send, Wallet, BarChart, BarChart3, History, Settings, 
  Loader2, Check, AlertCircle, RefreshCw, Smartphone, 
  MessageSquare, Calendar, Zap, ShieldCheck
} from 'lucide-react';

export default function SmsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [accountDetails, setAccountDetails] = useState<any>(null);
    const [token, setToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [savingToken, setSavingToken] = useState(false);
    const [sendingSms, setSendingSms] = useState(false);
    const [smsForm, setSmsForm] = useState({ to: '', message: '' });
    const [smsStatus, setSmsStatus] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser(data.user);
                fetchData(data.user.id);
            }
        });
    }, []);

    async function fetchData(userId: string) {
        setLoading(true);
        try {
            const [acc, settings] = await Promise.all([
                apiFetch(`/api/sms/account/${userId}`),
                apiFetch(`/api/sms/settings/${userId}`)
            ]);
            setAccountDetails(acc.details);
            setToken(settings.token || '');
        } catch (err) {
            console.error('Failed to fetch SMS data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function refreshAccount() {
        if (!user) return;
        setRefreshing(true);
        try {
            const acc = await apiFetch(`/api/sms/account/${user.id}`);
            setAccountDetails(acc.details);
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setRefreshing(false);
        }
    }

    async function handleSaveToken() {
        if (!user || !token) return;
        setSavingToken(true);
        try {
            await apiFetch('/api/sms/settings', {
                method: 'PATCH',
                body: JSON.stringify({ userId: user.id, token })
            });
            await refreshAccount();
        } catch (err) {
            console.error('Failed to save token:', err);
        } finally {
            setSavingToken(false);
        }
    }

    async function handleSendSms(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !smsForm.to || !smsForm.message) return;
        setSendingSms(true);
        setSmsStatus(null);
        try {
            const res = await apiFetch('/api/sms/send', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id, ...smsForm })
            });
            setSmsStatus(res.results);
            setSmsForm({ to: '', message: '' });
            refreshAccount();
        } catch (err: any) {
            console.error('Send failed:', err);
            setSmsStatus({ error: err.message });
        } finally {
            setSendingSms(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading SMS dashboard...</p>
            </div>
        );
    }

    const stats = [
        { 
            label: 'Total Balance', 
            value: `${accountDetails?.balance || '0.00'} BDT`, 
            sub: `Expiry: ${accountDetails?.expiry || 'N/A'}`,
            icon: Wallet, 
            color: 'bg-emerald-500', 
            textColor: 'text-emerald-600' 
        },
        { 
            label: 'SMS Rate', 
            value: `${accountDetails?.rate || '0.00'} BDT`, 
            sub: 'Per standard segment',
            icon: Zap, 
            color: 'bg-amber-500', 
            textColor: 'text-amber-600' 
        },
        { 
            label: 'Account Total Sent', 
            value: accountDetails?.totalsms || '0', 
            sub: `Monthly: ${accountDetails?.monthlysms || '0'}`,
            icon: BarChart3, 
            color: 'bg-blue-500', 
            textColor: 'text-blue-600' 
        },
        { 
            label: 'Token Usage', 
            value: accountDetails?.tokensms || '0', 
            sub: `Monthly: ${accountDetails?.tokenmonthlysms || '0'}`,
            icon: History, 
            color: 'bg-purple-500', 
            textColor: 'text-purple-600' 
        },
    ];

    return (
        <div className="min-h-screen bg-transparent p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto pb-24">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight italic flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-[#005a41]" />
                        SMS DASHBOARD
                    </h1>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">
                        Monitor your GreenWeb SMS integration and usage statistics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={refreshAccount}
                        disabled={refreshing}
                        className="h-12 px-6 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 hover:border-[#005a41] text-zinc-600 dark:text-zinc-300 transition-all text-[14px] font-bold flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        Refresh Data
                    </button>
                    <button 
                        onClick={() => window.location.href = '/sms-gateways'}
                        className="h-12 px-6 rounded-2xl bg-[#005a41] text-white transition-all text-[14px] font-bold flex items-center gap-2 shadow-lg shadow-[#005a41]/20 active:scale-95"
                    >
                        <Settings className="w-5 h-5" />
                        Gateways
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="p-6 rounded-[24px] bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none flex flex-col justify-between group hover:border-[#005a41]/30 transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-[13px] font-bold text-zinc-400 uppercase tracking-wider">{stat.label}</p>
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-2xl ${stat.color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-900 flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${stat.color}`} />
                             <p className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400">{stat.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Send SMS Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-950 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#005a41] rounded-xl shadow-lg shadow-[#005a41]/20">
                                    <Send className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 italic">Quick Dispatch</h2>
                                    <p className="text-[12px] text-zinc-500 font-medium">Send SMS via default gateway</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSendSms} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 ml-1">Recipient Numbers</label>
                                <div className="relative group">
                                    <Smartphone className="absolute left-4 top-4 w-5 h-5 text-zinc-400 group-focus-within:text-[#005a41] transition-colors" />
                                    <textarea 
                                        rows={1}
                                        placeholder="017xxxxxxxx, 016xxxxxxx" 
                                        value={smsForm.to}
                                        onChange={(e) => setSmsForm(f => ({ ...f, to: e.target.value }))}
                                        className="w-full h-14 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[18px] pl-12 pr-4 pt-3.5 text-sm focus:border-[#005a41] focus:ring-4 focus:ring-[#005a41]/5 outline-none transition-all font-medium text-zinc-900 dark:text-zinc-100 shadow-inner"
                                        required
                                    />
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[11px] text-zinc-400 font-bold italic uppercase tracking-tighter">Numbers separated by comma</p>
                                    <p className="text-[11px] text-[#005a41] font-black uppercase">Recipient Count: {smsForm.to.split(',').filter(n => n.trim().length > 0).length}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 ml-1">Message Content</label>
                                <textarea 
                                    placeholder="Type your message here..." 
                                    rows={5}
                                    value={smsForm.message}
                                    onChange={(e) => setSmsForm(f => ({ ...f, message: e.target.value }))}
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[24px] p-5 text-sm focus:border-[#005a41] focus:ring-4 focus:ring-[#005a41]/5 outline-none transition-all font-medium text-zinc-900 dark:text-zinc-100 resize-none shadow-inner leading-relaxed"
                                    required
                                />
                                <div className="flex justify-between items-center px-2 py-1">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Characters</span>
                                            <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-100">{smsForm.message.length}</span>
                                        </div>
                                        <div className="w-px h-6 bg-zinc-100 dark:bg-zinc-800" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Segments</span>
                                            <span className="text-[13px] font-black text-[#005a41]">{Math.ceil(smsForm.message.length / 160) || 1}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-[11px] font-bold text-zinc-500 uppercase">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Encryption Active
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={sendingSms}
                                className="w-full h-14 bg-[#005a41] text-white rounded-[20px] font-black shadow-xl shadow-[#005a41]/20 hover:shadow-[#005a41]/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                            >
                                {sendingSms ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                                DISPATCH MESSAGE
                            </button>
                        </form>

                        {smsStatus && (
                            <div className="mx-8 mb-8">
                                <div className={`p-6 rounded-[24px] border-2 ${Array.isArray(smsStatus) ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 'bg-red-50 border-red-100 dark:bg-red-500/5 dark:border-red-500/20'} animate-in slide-in-from-bottom-5 duration-300`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-xl ${Array.isArray(smsStatus) ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {Array.isArray(smsStatus) ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className={`text-sm font-black uppercase tracking-tight ${Array.isArray(smsStatus) ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                                {Array.isArray(smsStatus) ? 'System Response' : 'Dispatch Failed'}
                                            </h4>
                                            <div className="space-y-1">
                                                {Array.isArray(smsStatus) ? (
                                                    smsStatus.map((s: any, i: number) => (
                                                        <p key={i} className="text-[13px] font-bold text-emerald-800/80 dark:text-emerald-400/80">{s.statusmsg || s.status}</p>
                                                    ))
                                                ) : (
                                                    <p className="text-[13px] font-bold text-red-800/80 dark:text-red-400/80">{smsStatus.error || 'Unknown dispatch error occurred'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column / API Guide */}
                <div className="space-y-8">
                    {/* Simplified API Info */}
                    <div className="p-8 rounded-[32px] bg-zinc-900 border border-zinc-800 shadow-2xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <ShieldCheck className="w-24 h-24 text-white" />
                        </div>
                        <div className="space-y-4 relative z-10">
                            <h2 className="text-xl font-black text-white italic tracking-tight">API CONNECT</h2>
                            <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                                Your dashboard is currently linked with the **{accountDetails?.rate ? 'GreenWeb' : 'Default'}** SMS infrastructure.
                            </p>
                            
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-[#005a41]/50 transition-all">
                                    <div className="p-2 bg-white/5 rounded-lg">
                                        <Calendar className="w-4 h-4 text-[#005a41]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">VALID UNTIL</span>
                                        <span className="text-sm font-black text-white uppercase">{accountDetails?.expiry || 'ACTIVE'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-[#005a41]/50 transition-all">
                                    <div className="p-2 bg-white/5 rounded-lg">
                                        <ShieldCheck className="w-4 h-4 text-[#005a41]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TOKEN STATUS</span>
                                        <span className="text-sm font-black text-white uppercase">{(token || accountDetails?.rate) ? 'SECURED' : 'NOT SET'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 relative z-10">
                             <p className="text-[11px] text-zinc-500 font-bold mb-4 uppercase tracking-widest">Quick Resources</p>
                             <div className="grid grid-cols-1 gap-2">
                                 <a href="https://gwb.li/sms" target="_blank" className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 text-zinc-300 hover:bg-[#005a41] hover:text-white transition-all text-xs font-bold transform hover:-translate-y-1">
                                     SMS Portal
                                     <RefreshCw className="w-3.5 h-3.5 opacity-50" />
                                 </a>
                                 <a href="https://gwb.li/token" target="_blank" className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 text-zinc-300 hover:bg-[#005a41] hover:text-white transition-all text-xs font-bold transform hover:-translate-y-1">
                                     Generate Token
                                     <RefreshCw className="w-3.5 h-3.5 opacity-50" />
                                 </a>
                             </div>
                        </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="p-8 rounded-[32px] bg-emerald-50/50 dark:bg-[#005a41]/5 border-2 border-emerald-100/50 dark:border-[#005a41]/10 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">Pro Notification</h3>
                        </div>
                        <p className="text-[13px] text-emerald-900/70 dark:text-emerald-400/70 font-bold leading-relaxed">
                            You can send bulk messages by separating numbers with a comma. Ensure your message is within **160 characters** to avoid multi-part charges.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
