'use client';

import React, { useEffect, useState } from 'react';
import { 
  Shield, Zap, Send, Smartphone, Activity, Search, Hash, 
  ArrowRightLeft, CodeXml, TriangleAlert, Key, Eye, Copy, 
  RefreshCw, Download, ChevronDown, Check, EyeOff, BookOpen,
  Terminal, Globe, Clock, MessageCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface Device {
  id: string;
  phone_number: string;
  status: string;
}

export default function DeveloperApiPage() {
  const [apiKey, setApiKey] = useState('sk_live_••••••••••••••••••••••••••••••••');
  const [rawApiKey, setRawApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [userId, setUserId] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({
    'send-message': 'cURL',
    'devices': 'cURL',
    'device-status': 'cURL',
    'message-status': 'cURL',
    'check-whatsapp': 'cURL',
    'send-transactional': 'cURL',
    'sdks': 'PHP'
  });
  const { success, error } = useToast();

  useEffect(() => {
    // Backend URL — where the API actually lives
    const backendUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000');
    setBaseUrl(backendUrl);

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchProfile(data.user.id);
        fetchDevices(data.user.id);
      }
    });
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const profile = await apiFetch(`/api/profiles/${uid}`);
      if (profile?.api_key) {
        setRawApiKey(profile.api_key);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const fetchDevices = async (uid: string) => {
    try {
      const data = await apiFetch(`/api/whatsapp/sessions/${uid}`);
      if (Array.isArray(data)) {
        setDevices(data.map(d => ({
          id: d.id,
          phone_number: d.phone_number || 'Not Linked',
          status: d.status
        })));
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API key? The old key will stop working immediately.')) return;
    
    setRegenerating(true);
    try {
      const res = await apiFetch(`/api/profiles/${userId}/api-key/regenerate`, {
        method: 'POST'
      });
      if (res.success) {
        setRawApiKey(res.api_key);
        success('API Key regenerated successfully');
      }
    } catch (err) {
      error('Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success(`${label} copied to clipboard`);
  };

  const maskKey = (key: string) => {
    if (!key) return 'sk_live_••••••••••••••••••••••••••••••••';
    if (showKey) return key;
    return `${key.substring(0, 8)}${'•'.repeat(24)}${key.substring(key.length - 4)}`;
  };

  const EndpointTabs = ({ endpoint, tabs }: { endpoint: string, tabs: string[] }) => (
    <div className="flex items-center gap-2 border-b border-border/40 pb-3">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTabs({ ...activeTabs, [endpoint]: tab })}
          className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
            activeTabs[endpoint] === tab 
              ? 'bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700' 
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r bg-muted/20">
        <div className="px-4 py-5 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">API Reference</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">v1.0</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium bg-primary/10 text-primary transition-colors hover:bg-primary/20">
            <Shield className="w-3.5 h-3.5 shrink-0" /> Authentication
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <Zap className="w-3.5 h-3.5 shrink-0" /> Quick Start
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <Send className="w-3.5 h-3.5 shrink-0" /> Send Message
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <Smartphone className="w-3.5 h-3.5 shrink-0" /> List Devices
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <Activity className="w-3.5 h-3.5 shrink-0" /> Device Status
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <Search className="w-3.5 h-3.5 shrink-0" /> Message Status
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <Hash className="w-3.5 h-3.5 shrink-0" /> Check WhatsApp
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" /> Transactional
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <CodeXml className="w-3.5 h-3.5 shrink-0" /> SDKs & Tools
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60">
            <TriangleAlert className="w-3.5 h-3.5 shrink-0" /> Error Codes
          </button>
        </div>
        <div className="p-3 border-t">
          <button className="w-full flex items-center justify-center gap-1.5 px-3 h-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-all">
            <Download className="w-3 h-3" /> Postman Collection
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">API Reference</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-2xl">
              Integrate WhatsApp messaging and transactional SMS failover into your applications with our simple, high-performance REST API.
            </p>
          </div>

          {/* API Key Section */}
          <div className="rounded-xl border bg-white dark:bg-zinc-950 text-card-foreground border-primary/20 shadow-sm ring-1 ring-primary/5 overflow-hidden transition-all">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shadow-inner">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground tracking-tight">Your Secret API Key</p>
                  <p className="text-[10px] text-muted-foreground font-medium opacity-80 uppercase tracking-wider">Include this in every request header</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full group">
                  <input 
                    className="flex w-full rounded-lg border border-input px-3 py-2 font-mono text-[13px] pr-20 h-10 bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all border-dashed"
                    readOnly
                    value={maskKey(rawApiKey)}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-primary active:scale-95"
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => copyToClipboard(rawApiKey, 'API Key')}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-primary active:scale-95"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center justify-center whitespace-nowrap text-xs font-bold ring-offset-background transition-all hover:bg-accent hover:text-accent-foreground rounded-lg px-3 gap-2 h-10 shrink-0 border border-input shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} /> 
                  Regenerate
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-primary/60" />
                  Base URL: <code className="font-mono bg-muted/50 px-2 py-0.5 rounded text-foreground border border-border/50 lowercase tracking-normal">{baseUrl}/api</code>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${baseUrl}/api`, 'Base URL')}
                  className="hover:text-primary transition-colors p-1 rounded hover:bg-primary/5 active:scale-95"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Authentication Section */}
          <section id="authentication" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary/70" /> Authentication
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All API requests require authentication. Include your API key in one of the following request headers.
            </p>
            <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm bg-white dark:bg-muted/5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/60">
                      <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest w-1/3">Header Name</th>
                      <th className="text-left px-4 py-2.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Format Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                    <tr className="hover:bg-primary/[0.01] transition-colors">
                      <td className="px-4 py-3 font-bold text-primary/80 italic">API-Key</td>
                      <td className="px-4 py-3 text-muted-foreground">API-Key: sk_live_xxx...</td>
                    </tr>
                    <tr className="hover:bg-primary/[0.01] transition-colors">
                      <td className="px-4 py-3 font-bold text-primary/80 italic">X-API-Key</td>
                      <td className="px-4 py-3 text-muted-foreground">X-API-Key: sk_live_xxx...</td>
                    </tr>
                    <tr className="hover:bg-primary/[0.01] transition-colors">
                      <td className="px-4 py-3 font-bold text-primary/80 italic">Authorization</td>
                      <td className="px-4 py-3 text-muted-foreground">Authorization: Bearer sk_live_xxx...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Quick Start Section */}
          <section id="quick-start" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Quick Start
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Send your first message in seconds using the interactive example below.
            </p>
            
            <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-zinc-800">
                <div className="flex items-center gap-2">
                   <div className="flex gap-1 mr-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                     <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                     <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                   </div>
                   <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">shell / curl</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(`curl -X POST '${baseUrl}/api/send-message' \\\n  -H 'API-Key: YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    "recipient": "88017xxxxxxxx",\n    "content": "Hello from the API!",\n    "instance_id": "YOUR_INSTANCE_ID"\n  }'`, 'Curl Code')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-widest"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="p-5 text-[13px] font-mono leading-relaxed overflow-x-auto text-zinc-300 selection:bg-primary/30 selection:text-white">
                <span className="text-zinc-500">curl</span> -X POST <span className="text-emerald-400">'{baseUrl}/api/send-message'</span> \<br />
                &nbsp;&nbsp;-H <span className="text-emerald-400">'API-Key: YOUR_API_KEY'</span> \<br />
                &nbsp;&nbsp;-H <span className="text-emerald-400">'Content-Type: application/json'</span> \<br />
                &nbsp;&nbsp;-d <span className="text-amber-400 text-indigo-300">'{`{"recipient":"88017xxxxxxxx","content":"Hello!","instance_id":"YOUR_INSTANCE_ID"}`}'</span>
              </pre>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 border-l-2 border-primary/40 ml-1">Your Connected Devices</p>
              <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm bg-card/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="text-left px-4 py-2.5 font-bold uppercase tracking-wider">Phone</th>
                      <th className="text-left px-4 py-2.5 font-bold uppercase tracking-wider">Instance ID</th>
                      <th className="text-left px-4 py-2.5 font-bold uppercase tracking-wider">Status</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {devices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground font-medium italic opacity-60">
                          No devices found. Connect a device in WhatsApp Manager first.
                        </td>
                      </tr>
                    ) : (
                      devices.map((device) => (
                        <tr key={device.id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-4 py-3 font-mono font-medium text-foreground">{device.phone_number}</td>
                          <td className="px-4 py-3 font-mono text-primary/70">{device.id}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                              device.status === 'connected' 
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                              : 'bg-zinc-400/10 text-zinc-500 border border-zinc-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                              {device.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right transition-opacity">
                            <button 
                              onClick={() => copyToClipboard(device.id, 'Device ID')}
                              className="p-1 px-2 rounded-md border bg-background hover:border-primary hover:text-primary transition-all shadow-sm active:scale-90 flex items-center justify-center ml-auto"
                              title="Copy ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Endpoints Reference Section */}
          <section className="space-y-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">Endpoints Reference</h2>
              <p className="text-sm text-muted-foreground">Select an endpoint to view its schema and parameters.</p>
            </div>

            <div className="grid gap-4">
              {/* POST /send-message */}
              <div className={`rounded-xl border overflow-hidden transition-all ${expandedEndpoint === 'send-message' ? 'border-primary/30 bg-white dark:bg-zinc-950 ring-1 ring-primary/5 shadow-sm' : 'border-border bg-card/20 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${expandedEndpoint === 'send-message' ? 'border-b border-border/60 bg-muted/5' : ''}`}
                  onClick={() => setExpandedEndpoint(expandedEndpoint === 'send-message' ? null : 'send-message')}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-sky-100 text-sky-600 border border-sky-200 uppercase tracking-widest dark:bg-sky-500/10 dark:border-sky-500/20">POST</span>
                    <code className="text-[13px] font-mono font-bold text-foreground">/send-message</code>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— Send a WhatsApp message</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEndpoint === 'send-message' ? 'rotate-180 text-primary' : ''}`} />
                </div>
                {expandedEndpoint === 'send-message' && (
                  <div className="p-4 sm:p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Send Message</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Send a text or media message via WhatsApp to any phone number.
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-200 dark:border-border/80 overflow-hidden bg-white dark:bg-background/50 shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left min-w-[500px]">
                            <thead className="bg-zinc-50 dark:bg-muted/50 border-b border-zinc-200 dark:border-border/60">
                              <tr>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest text-zinc-500 dark:text-muted-foreground/80 text-[10px]">PARAMETER</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest text-zinc-500 dark:text-muted-foreground/80 text-[10px]">TYPE</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest text-zinc-500 dark:text-muted-foreground/80 text-[10px]">REQUIRED</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest text-zinc-500 dark:text-muted-foreground/80 text-[10px]">DESCRIPTION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-border/40 font-medium">
                              <tr className="hover:bg-zinc-50/50 dark:hover:bg-primary/[0.01] transition-colors">
                                <td className="px-4 py-4 font-mono text-primary/80 text-[12px] bg-zinc-50/30 dark:bg-transparent">recipient</td>
                                <td className="px-4 py-4 text-muted-foreground italic font-mono text-[12px]">string</td>
                                <td className="px-4 py-4"><span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20">REQUIRED</span></td>
                                <td className="px-4 py-4 text-muted-foreground text-[12px] leading-relaxed">Phone number with country code (e.g. 88017xxxxxxxx)</td>
                              </tr>
                              <tr className="hover:bg-zinc-50/50 dark:hover:bg-primary/[0.01] transition-colors">
                                <td className="px-4 py-4 font-mono text-primary/80 text-[12px] bg-zinc-50/30 dark:bg-transparent">content</td>
                                <td className="px-4 py-4 text-muted-foreground italic font-mono text-[12px]">string</td>
                                <td className="px-4 py-4"><span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20">REQUIRED</span></td>
                                <td className="px-4 py-4 text-muted-foreground text-[12px] leading-relaxed">Message text content</td>
                              </tr>
                              <tr className="hover:bg-zinc-50/50 dark:hover:bg-primary/[0.01] transition-colors">
                                <td className="px-4 py-4 font-mono text-primary/80 text-[12px] bg-zinc-50/30 dark:bg-transparent">instance_id</td>
                                <td className="px-4 py-4 text-muted-foreground italic font-mono text-[12px]">string</td>
                                <td className="px-4 py-4"><span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20">REQUIRED</span></td>
                                <td className="px-4 py-4 text-muted-foreground text-[12px] leading-relaxed">Device instance ID</td>
                              </tr>
                              <tr className="hover:bg-zinc-50/50 dark:hover:bg-primary/[0.01] transition-colors">
                                <td className="px-4 py-4 font-mono text-primary/80 text-[12px] bg-zinc-50/30 dark:bg-transparent">media_url</td>
                                <td className="px-4 py-4 text-muted-foreground italic font-mono text-[12px]">string</td>
                                <td className="px-4 py-4"><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Optional</span></td>
                                <td className="px-4 py-4 text-muted-foreground text-[12px] leading-relaxed opacity-70">URL to media file (image, video, document)</td>
                              </tr>
                              <tr className="hover:bg-zinc-50/50 dark:hover:bg-primary/[0.01] transition-colors">
                                <td className="px-4 py-4 font-mono text-primary/80 text-[12px] bg-zinc-50/30 dark:bg-transparent">message_type</td>
                                <td className="px-4 py-4 text-muted-foreground italic font-mono text-[12px]">string</td>
                                <td className="px-4 py-4"><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Optional</span></td>
                                <td className="px-4 py-4 text-muted-foreground text-[12px] leading-relaxed opacity-70">"text" or "media"</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <EndpointTabs endpoint="send-message" tabs={['cURL', 'Request Body', 'Response']} />

                      <div className="flex flex-col gap-4">
                        {activeTabs['send-message'] === 'cURL' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">BASH</span>
                              <button 
                                onClick={() => copyToClipboard(`curl -X POST '${baseUrl}/api/send-message' \\\n  -H 'API-Key: YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"recipient":"88017xxxxxxxx","content":"Hello!","instance_id":"YOUR_INSTANCE_ID"}'`, 'Code')}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto max-h-[500px]">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
                                <span className="text-zinc-500">curl</span> <span className="text-indigo-400">-X POST</span> <span className="text-emerald-400">'{baseUrl}/api/send-message'</span> \<br />
                                &nbsp;&nbsp;<span className="text-indigo-400">-H</span> <span className="text-emerald-400">'API-Key: YOUR_API_KEY'</span> \<br />
                                &nbsp;&nbsp;<span className="text-indigo-400">-H</span> <span className="text-emerald-400">'Content-Type: application/json'</span> \<br />
                                &nbsp;&nbsp;<span className="text-indigo-400">-d</span> <span className="text-indigo-300">'{`{"recipient":"88017xxxxxxxx","content":"Hello!","instance_id":"YOUR_INSTANCE_ID"}`}'</span>
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['send-message'] === 'Request Body' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">JSON</span>
                              <button 
                                onClick={() => copyToClipboard(`{\n  "recipient": "88017xxxxxxxx",\n  "content": "Hello from the API!",\n  "instance_id": "YOUR_INSTANCE_ID"\n}`, 'Code')}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto max-h-[500px]">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "recipient": "88017xxxxxxxx",
  "content": "Hello from the API!",
  "instance_id": "YOUR_INSTANCE_ID"
}`}
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['send-message'] === 'Response' && (
                          <div className="space-y-4">
                            {/* 200 Success */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — Success</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": true,\n  "message": "Message sent successfully.",\n  "data": {\n    "message_id": "MSG_abc123"\n  }\n}`, 'Success Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-emerald-400">"Message sent successfully."</span>{`,
  "`}<span className="text-emerald-400">data</span>{`": {
    "`}<span className="text-emerald-400">message_id</span>{`": `}<span className="text-emerald-400">"MSG_abc123"</span>{`
  }
}`}
                                </pre>
                              </div>
                            </div>

                            {/* 422 Error */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">422 — Device Disconnected</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": false,\n  "message": "Device is not connected. Current status: disconnected"\n}`, 'Error Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-rose-400">false</span>{`,
  "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-rose-400">"Device is not connected. Current status: disconnected"</span>{`
}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GET /devices */}
              <div className={`rounded-xl border overflow-hidden transition-all ${expandedEndpoint === 'devices' ? 'border-primary/30 bg-white dark:bg-zinc-950 shadow-sm' : 'border-border bg-card/20 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${expandedEndpoint === 'devices' ? 'border-b border-border/60 bg-muted/5' : ''}`}
                  onClick={() => setExpandedEndpoint(expandedEndpoint === 'devices' ? null : 'devices')}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase tracking-widest dark:bg-emerald-500/10 dark:border-emerald-500/20">GET</span>
                    <code className="text-[13px] font-mono font-bold text-foreground">/devices</code>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— List all connected devices</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEndpoint === 'devices' ? 'rotate-180 text-primary' : ''}`} />
                </div>
                {expandedEndpoint === 'devices' && (
                  <div className="p-4 sm:p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">List Devices</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Retrieve all your connected WhatsApp devices with their current status.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <EndpointTabs endpoint="devices" tabs={['cURL', 'Response']} />

                      <div className="flex flex-col gap-4">
                        {activeTabs['devices'] === 'cURL' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">BASH</span>
                              <button 
                                onClick={() => copyToClipboard(`curl '${baseUrl}/api/devices' \\\n  -H 'API-Key: YOUR_API_KEY'`, 'Code')}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
                                <span className="text-zinc-500">curl</span> <span className="text-emerald-400">'{baseUrl}/api/devices'</span> \<br />
                                &nbsp;&nbsp;<span className="text-indigo-400">-H</span> <span className="text-emerald-400">'API-Key: YOUR_API_KEY'</span>
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['devices'] === 'Response' && (
                          <div className="space-y-4">
                            {/* 200 Success */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — Success</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": true,\n  "data": [\n    {\n      "instance_id": "wa_abc123",\n      "name": "My Phone",\n      "phone_number": "88017xxxxxxxxx",\n      "status": "connected",\n      "connection_type": "qr"\n    }\n  ]\n}`, 'Success Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">data</span>{`": [
    {
      "`}<span className="text-emerald-400">instance_id</span>{`": `}<span className="text-emerald-400">"wa_abc123"</span>{`,
      "`}<span className="text-emerald-400">name</span>{`": `}<span className="text-emerald-400">"My Phone"</span>{`,
      "`}<span className="text-emerald-400">phone_number</span>{`": `}<span className="text-emerald-400">"88017xxxxxxxxx"</span>{`,
      "`}<span className="text-emerald-400">status</span>{`": `}<span className="text-emerald-400">"connected"</span>{`,
      "`}<span className="text-emerald-400">connection_type</span>{`": `}<span className="text-emerald-400">"qr"</span>{`
    }
  ]
}`}
                                </pre>
                              </div>
                            </div>

                            {/* 401 Unauthorized */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">401 — Unauthorized</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": false,\n  "message": "Unauthorized. Invalid API key."\n}`, 'Error Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-rose-400">false</span>{`,
  "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-rose-400">"Unauthorized. Invalid API key."</span>{`
}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GET /device-status/{instance_id} */}
              <div className={`rounded-xl border overflow-hidden transition-all ${expandedEndpoint === 'device-status' ? 'border-primary/30 bg-white dark:bg-zinc-950 shadow-sm' : 'border-border bg-card/20 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${expandedEndpoint === 'device-status' ? 'border-b border-border/60 bg-muted/5' : ''}`}
                  onClick={() => setExpandedEndpoint(expandedEndpoint === 'device-status' ? null : 'device-status')}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase tracking-widest dark:bg-emerald-500/10 dark:border-emerald-500/20">GET</span>
                    <code className="text-[13px] font-mono font-bold text-foreground">/device-status/{'{instance_id}'}</code>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— Check connection</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEndpoint === 'device-status' ? 'rotate-180 text-primary' : ''}`} />
                </div>
                {expandedEndpoint === 'device-status' && (
                  <div className="p-4 sm:p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Check Connection Status</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Query the real-time connection status of a specific device.
                        </p>
                      </div>

                      {/* Parameters Table */}
                      <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm bg-muted/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left min-w-[500px]">
                            <thead className="bg-muted/30 border-b border-border/60">
                              <tr>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Parameter</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Required</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 font-medium">
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">instance_id</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wider">Required</span></td>
                                <td className="px-4 py-4 text-muted-foreground leading-relaxed">Device instance ID (URL parameter)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <EndpointTabs endpoint="device-status" tabs={['cURL', 'Response']} />

                      <div className="flex flex-col gap-4">
                        {activeTabs['device-status'] === 'cURL' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">BASH</span>
                              <button 
                                onClick={() => copyToClipboard(`curl '${baseUrl}/api/device-status/YOUR_INSTANCE_ID' \\\n  -H 'API-Key: YOUR_API_KEY'`, 'Code')}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
                                <span className="text-zinc-500">curl</span> <span className="text-emerald-400">'{baseUrl}/api/device-status/YOUR_INSTANCE_ID'</span> \<br />
                                &nbsp;&nbsp;<span className="text-indigo-400">-H</span> <span className="text-emerald-400">'API-Key: YOUR_API_KEY'</span>
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['device-status'] === 'Response' && (
                          <div className="space-y-4">
                            {/* 200 Success */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — Connected</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": true,\n  "data": {\n    "instance_id": "wa_abc123",\n    "name": "My Phone",\n    "status": "connected",\n    "connection_type": "qr"\n  }\n}`, 'Success Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">data</span>{`": {
    "`}<span className="text-emerald-400">instance_id</span>{`": `}<span className="text-emerald-400">"wa_abc123"</span>{`,
    "`}<span className="text-emerald-400">name</span>{`": `}<span className="text-emerald-400">"My Phone"</span>{`,
    "`}<span className="text-emerald-400">status</span>{`": `}<span className="text-emerald-400">"connected"</span>{`,
    "`}<span className="text-emerald-400">connection_type</span>{`": `}<span className="text-emerald-400">"qr"</span>{`
  }
}`}
                                </pre>
                              </div>
                            </div>

                            {/* 404 Not Found */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">404 — Not Found</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": false,\n  "message": "Device not found or does not belong to your account."\n}`, 'Error Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-rose-400">false</span>{`,
  "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-rose-400">"Device not found or does not belong to your account."</span>{`
}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GET /message-status/{message_id} */}
              <div className={`rounded-xl border overflow-hidden transition-all ${expandedEndpoint === 'message-status' ? 'border-primary/30 bg-white dark:bg-zinc-950 shadow-sm' : 'border-border bg-card/20 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${expandedEndpoint === 'message-status' ? 'border-b border-border/60 bg-muted/5' : ''}`}
                  onClick={() => setExpandedEndpoint(expandedEndpoint === 'message-status' ? null : 'message-status')}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase tracking-widest dark:bg-emerald-500/10 dark:border-emerald-500/20">GET</span>
                    <code className="text-[13px] font-mono font-bold text-foreground">/message-status/{'{message_id}'}</code>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— Delivery status</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEndpoint === 'message-status' ? 'rotate-180 text-primary' : ''}`} />
                </div>
                {expandedEndpoint === 'message-status' && (
                  <div className="p-4 sm:p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Message Delivery Status</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Get delivery timestamps for sent, delivered, and read events.
                        </p>
                      </div>

                      {/* Parameters Table */}
                      <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm bg-muted/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left min-w-[500px]">
                            <thead className="bg-muted/30 border-b border-border/60">
                              <tr>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Parameter</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Required</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 font-medium">
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">message_id</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wider">Required</span></td>
                                <td className="px-4 py-4 text-muted-foreground leading-relaxed">Message ID returned from send-message</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <EndpointTabs endpoint="message-status" tabs={['cURL', 'Response']} />

                      <div className="flex flex-col gap-4">
                        {activeTabs['message-status'] === 'cURL' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">BASH</span>
                              <button 
                                onClick={() => copyToClipboard(`curl '${baseUrl}/api/message-status/MSG_abc123' \\\n  -H 'API-Key: YOUR_API_KEY'`, 'Code')}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
                                <span className="text-zinc-500">curl</span> <span className="text-emerald-400">'{baseUrl}/api/message-status/MSG_abc123'</span> \<br />
                                &nbsp;&nbsp;<span className="text-indigo-400">-H</span> <span className="text-emerald-400">'API-Key: YOUR_API_KEY'</span>
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['message-status'] === 'Response' && (
                          <div className="space-y-4">
                            {/* 200 Success */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — Success</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": true,\n  "status": "delivered",\n  "delivered_at": "2026-02-25T00:00:05Z",\n  "read_at": null\n}`, 'Success Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">status</span>{`": `}<span className="text-emerald-400">"delivered"</span>{`,
  "`}<span className="text-emerald-400">delivered_at</span>{`": `}<span className="text-emerald-400">"2026-02-25T00:00:05Z"</span>{`,
  "`}<span className="text-emerald-400">read_at</span>{`": `}<span className="text-amber-400">null</span>{`
}`}
                                </pre>
                              </div>
                            </div>

                            {/* 404 Not Found */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">404 — Not Found</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": false,\n  "message": "Message not found."\n}`, 'Error Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-rose-400">false</span>{`,
  "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-rose-400">"Message not found."</span>{`
}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GET /check-whatsapp/{instance_id}/{phone} */}
              <div className={`rounded-xl border overflow-hidden transition-all ${expandedEndpoint === 'check-whatsapp' ? 'border-primary/30 bg-white dark:bg-zinc-950 shadow-sm' : 'border-border bg-card/20 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${expandedEndpoint === 'check-whatsapp' ? 'border-b border-border/60 bg-muted/5' : ''}`}
                  onClick={() => setExpandedEndpoint(expandedEndpoint === 'check-whatsapp' ? null : 'check-whatsapp')}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase tracking-widest dark:bg-emerald-500/10 dark:border-emerald-500/20">GET</span>
                    <code className="text-[13px] font-mono font-bold text-foreground">/check-whatsapp/{'{instance_id}'}/{'{phone}'}</code>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— Number lookup</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEndpoint === 'check-whatsapp' ? 'rotate-180 text-primary' : ''}`} />
                </div>
                {expandedEndpoint === 'check-whatsapp' && (
                  <div className="p-4 sm:p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Check WhatsApp Number</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Verify if a phone number is registered on WhatsApp. QR-based connections only.
                        </p>
                      </div>

                      {/* Parameters Table */}
                      <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm bg-muted/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left min-w-[500px]">
                            <thead className="bg-muted/30 border-b border-border/60">
                              <tr>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Parameter</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Required</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 font-medium">
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">instance_id</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wider">Required</span></td>
                                <td className="px-4 py-4 text-muted-foreground leading-relaxed">Device instance ID</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">phone</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wider">Required</span></td>
                                <td className="px-4 py-4 text-muted-foreground leading-relaxed">Phone number to check (digits only, e.g. 88017xxxxxxxxx)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <EndpointTabs endpoint="check-whatsapp" tabs={['cURL', 'Response']} />

                      <div className="flex flex-col gap-4">
                        {activeTabs['check-whatsapp'] === 'cURL' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">BASH</span>
                              <button 
                                onClick={() => copyToClipboard(`curl '${baseUrl}/api/check-whatsapp/YOUR_INSTANCE_ID/88017xxxxxxxxx' \\\n  -H 'API-Key: YOUR_API_KEY'`, 'Code')}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
                                <span className="text-zinc-500">curl</span> <span className="text-emerald-400">'{baseUrl}/api/check-whatsapp/YOUR_INSTANCE_ID/88017xxxxxxxxx'</span> \<br />
                                &nbsp;&nbsp;<span className="text-indigo-400">-H</span> <span className="text-emerald-400">'API-Key: YOUR_API_KEY'</span>
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['check-whatsapp'] === 'Response' && (
                          <div className="space-y-4">
                            {/* 200 success */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — Found</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "exists": true,\n  "jid": "88017xxxxxxxxx@s.whatsapp.net"\n}`, 'Success Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">exists</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">jid</span>{`": `}<span className="text-emerald-400">"88017xxxxxxxxx@s.whatsapp.net"</span>{`
}`}
                                </pre>
                              </div>
                            </div>

                            {/* 422 Offline */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">422 — Device Offline</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": false,\n  "message": "Device is not connected."\n}`, 'Error Response')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-rose-400">false</span>{`,
  "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-rose-400">"Device is not connected."</span>{`
}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* POST /send-transactional */}
              <div className={`rounded-xl border overflow-hidden transition-all ${expandedEndpoint === 'send-transactional' ? 'border-primary/30 bg-white dark:bg-zinc-950 shadow-sm' : 'border-border bg-card/20 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${expandedEndpoint === 'send-transactional' ? 'border-b border-border/60 bg-muted/5' : ''}`}
                  onClick={() => setExpandedEndpoint(expandedEndpoint === 'send-transactional' ? null : 'send-transactional')}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-blue-100 text-blue-600 border border-blue-200 uppercase tracking-widest dark:bg-blue-500/10 dark:border-blue-500/20">POST</span>
                    <code className="text-[13px] font-mono font-bold text-foreground">/send-transactional</code>
                    <span className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-[8px] font-bold text-emerald-600 uppercase tracking-widest dark:bg-emerald-500/10 dark:border-emerald-500/20">SMS FAILOVER</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEndpoint === 'send-transactional' ? 'rotate-180 text-primary' : ''}`} />
                </div>
                {expandedEndpoint === 'send-transactional' && (
                  <div className="p-4 sm:p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-foreground tracking-tight">Send Transactional Message</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Send a message with automatic SMS failover. Tries WhatsApp first — if the device is disconnected, the number isn't on WhatsApp, or sending fails, it automatically falls over to SMS via your configured gateway.
                        </p>
                      </div>

                      {/* Parameters Table */}
                      <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm bg-muted/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left min-w-[600px]">
                            <thead className="bg-muted/30 border-b border-border/60">
                              <tr>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Parameter</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Required</th>
                                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 font-medium">
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">to</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wider">Required</span></td>
                                <td className="px-4 py-4 text-muted-foreground">Recipient phone number with country code</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">device_id</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Optional</span></td>
                                <td className="px-4 py-4 text-muted-foreground">WhatsApp device instance ID (UUID). If omitted, uses first connected device.</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">whatsapp.message</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wider">Required</span></td>
                                <td className="px-4 py-4 text-muted-foreground">WhatsApp message content</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">whatsapp.media_url</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Optional</span></td>
                                <td className="px-4 py-4 text-muted-foreground">Media URL for WhatsApp</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">sms.message</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-amber-600 dark:text-amber-500 font-bold uppercase text-[9px] tracking-wider">Required</span></td>
                                <td className="px-4 py-4 text-muted-foreground">SMS fallback content</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">failover_mode</code></td>
                                <td className="px-4 py-4 text-muted-foreground">string</td>
                                <td className="px-4 py-4"><span className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Optional</span></td>
                                <td className="px-4 py-4 text-muted-foreground">"auto" (default) or "manual"</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-4"><code className="font-mono text-primary text-[11px] bg-primary/5 px-2 py-1 rounded-md">sms_gateway_id</code></td>
                                <td className="px-4 py-4 text-muted-foreground">integer</td>
                                <td className="px-4 py-4"><span className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Optional</span></td>
                                <td className="px-4 py-4 text-muted-foreground">Specific SMS gateway ID or null for default</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <EndpointTabs endpoint="send-transactional" tabs={['cURL', 'Request Body', 'Response']} />

                      <div className="flex flex-col gap-4">
                        {activeTabs['send-transactional'] === 'cURL' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">BASH</span>
                              <button 
                                onClick={() => copyToClipboard(`curl -X POST '${baseUrl}/api/send-transactional' \\\n  -H 'API-Key: YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"to":"88017xxxxxxxxx","device_id":"YOUR_INSTANCE_ID","whatsapp":{"message":"OTP: 1234"},"sms":{"message":"OTP: 1234"},"failover_mode":"auto"}'`, 'Code')}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700 uppercase tracking-widest"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300 whitespace-pre">
{`curl -X POST '${baseUrl}/api/send-transactional' \\
  -H 'API-Key: YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"to":"88017xxxxxxxxx","device_id":"YOUR_INSTANCE_ID","whatsapp":{"message":"OTP: 1234"},"sms":{"message":"OTP: 1234"},"failover_mode":"auto"}'`}
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['send-transactional'] === 'Request Body' && (
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg relative group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-zinc-800">
                              <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest">JSON</span>
                              <button 
                                onClick={() => copyToClipboard(`{\n  "to": "88017xxxxxxxxx",\n  "device_id": "YOUR_INSTANCE_ID",\n  "whatsapp": {\n    "message": "Your OTP is 1234. Valid for 5 min."\n  },\n  "sms": {\n    "message": "Your OTP is 1234. Expires in 5 min."\n  },\n  "failover_mode": "auto",\n  "sms_gateway_id": null\n}`, 'Request Body')}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                              >
                                <Copy className="w-2.5 h-2.5" /> Copy
                              </button>
                            </div>
                            <div className="p-4 sm:p-6 overflow-x-auto">
                              <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">to</span>{`": `}<span className="text-emerald-400">"88017xxxxxxxxx"</span>{`,
  "`}<span className="text-emerald-400">device_id</span>{`": `}<span className="text-emerald-400">"YOUR_INSTANCE_ID"</span>{`,
  "`}<span className="text-emerald-400">whatsapp</span>{`": {
    "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-emerald-400">"Your OTP is 1234. Valid for 5 min."</span>{`
  },
  "`}<span className="text-emerald-400">sms</span>{`": {
    "`}<span className="text-emerald-400">message</span>{`": `}<span className="text-emerald-400">"Your OTP is 1234. Expires in 5 min."</span>{`
  },
  "`}<span className="text-emerald-400">failover_mode</span>{`": `}<span className="text-emerald-400">"auto"</span>{`,
  "`}<span className="text-emerald-400">sms_gateway_id</span>{`": `}<span className="text-amber-400">null</span>{`
}`}
                              </pre>
                            </div>
                          </div>
                        )}

                        {activeTabs['send-transactional'] === 'Response' && (
                          <div className="space-y-4">
                            {/* WhatsApp Delivered */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — WhatsApp Delivered</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": true,\n  "channel": "whatsapp",\n  "message_id": "MSG_abc123",\n  "failover": false,\n  "transactional_log_id": 42\n}`, 'WhatsApp Delivered')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">channel</span>{`": `}<span className="text-emerald-400">"whatsapp"</span>{`,
  "`}<span className="text-emerald-400">message_id</span>{`": `}<span className="text-emerald-400">"MSG_abc123"</span>{`,
  "`}<span className="text-emerald-400">failover</span>{`": `}<span className="text-amber-400">false</span>{`,
  "`}<span className="text-emerald-400">transactional_log_id</span>{`": `}<span className="text-amber-400">42</span>{`
}`}
                                </pre>
                              </div>
                            </div>

                            {/* SMS Failover (auto) */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — SMS Failover (auto)</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": true,\n  "channel": "sms",\n  "message_id": "sms_xyz789",\n  "failover": true,\n  "failover_reason": "Number not on WhatsApp",\n  "sms_gateway": "My Twilio",\n  "transactional_log_id": 43\n}`, 'SMS Failover Auto')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">channel</span>{`": `}<span className="text-emerald-400">"sms"</span>{`,
  "`}<span className="text-emerald-400">message_id</span>{`": `}<span className="text-emerald-400">"sms_xyz789"</span>{`,
  "`}<span className="text-emerald-400">failover</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">failover_reason</span>{`": `}<span className="text-emerald-400">"Number not on WhatsApp"</span>{`,
  "`}<span className="text-emerald-400">sms_gateway</span>{`": `}<span className="text-emerald-400">"My Twilio"</span>{`,
  "`}<span className="text-emerald-400">transactional_log_id</span>{`": `}<span className="text-amber-400">43</span>{`
}`}
                                </pre>
                              </div>
                            </div>

                            {/* Manual Failover */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">200 — Manual Failover</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": false,\n  "channel": "none",\n  "failover_required": true,\n  "failover_reason": "Device disconnected",\n  "recipient": "88017xxxxxxxxx",\n  "transactional_log_id": 44\n}`, 'Manual Failover')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-rose-400">false</span>{`,
  "`}<span className="text-emerald-400">channel</span>{`": `}<span className="text-emerald-400">"none"</span>{`,
  "`}<span className="text-emerald-400">failover_required</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">failover_reason</span>{`": `}<span className="text-emerald-400">"Device disconnected"</span>{`,
  "`}<span className="text-emerald-400">recipient</span>{`": `}<span className="text-emerald-400">"88017xxxxxxxxx"</span>{`,
  "`}<span className="text-emerald-400">transactional_log_id</span>{`": `}<span className="text-amber-400">44</span>{`
}`}
                                </pre>
                              </div>
                            </div>

                            {/* No Gateway */}
                            <div className="space-y-0 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">422 — No Gateway</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(`{\n  "success": false,\n  "channel": "none",\n  "failover_required": true,\n  "failover_reason": "Number not on WhatsApp",\n  "sms_error": "No SMS gateway configured",\n  "transactional_log_id": 45\n}`, 'No Gateway')}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy
                                </button>
                              </div>
                              <div className="bg-[#0d1117] p-4 sm:p-5">
                                <pre className="text-[12px] font-mono leading-relaxed text-zinc-300">
{`{
  "`}<span className="text-emerald-400">success</span>{`": `}<span className="text-rose-400">false</span>{`,
  "`}<span className="text-emerald-400">channel</span>{`": `}<span className="text-emerald-400">"none"</span>{`,
  "`}<span className="text-emerald-400">failover_required</span>{`": `}<span className="text-amber-400">true</span>{`,
  "`}<span className="text-emerald-400">failover_reason</span>{`": `}<span className="text-emerald-400">"Number not on WhatsApp"</span>{`,
  "`}<span className="text-emerald-400">sms_error</span>{`": `}<span className="text-emerald-400">"No SMS gateway configured"</span>{`,
  "`}<span className="text-emerald-400">transactional_log_id</span>{`": `}<span className="text-amber-400">45</span>{`
}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* SDKs & Tools Section */}
          <section id="sdks" className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CodeXml className="w-4 h-4 text-primary/70" /> SDKs & Tools
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Implementation-ready helper classes. Zero external dependencies.
              </p>
            </div>
            
            <div className="space-y-6">
                <EndpointTabs endpoint="sdks" tabs={['PHP', 'Laravel', 'Postman']} />

                {activeTabs['sdks'] === 'PHP' && (
                  <div className="space-y-0 shadow-sm border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-border">
                      <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest leading-none">PHP class / lib-curl / zero-deps</span>
                      <button 
                        onClick={() => copyToClipboard(`<?php\nclass WaCloud\n{\n    private string $apiKey;\n    private string $baseUrl;\n\n    public function __construct(string $apiKey, string $baseUrl = '${baseUrl}/api')\n    {\n        $this->apiKey = $apiKey;\n        $this->baseUrl = rtrim($baseUrl, '/');\n    }\n\n    private function request(string $method, string $endpoint, array $data = []): array\n    {\n        $ch = curl_init($this->baseUrl . $endpoint);\n        curl_setopt_array($ch, [\n            CURLOPT_RETURNTRANSFER => true,\n            CURLOPT_TIMEOUT => 30,\n            CURLOPT_HTTPHEADER => [\n                'API-Key: ' . $this->apiKey,\n                'Content-Type: application/json',\n                'Accept: application/json',\n            ],\n        ]);\n        if ($method === 'POST') {\n            curl_setopt($ch, CURLOPT_POST, true);\n            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));\n        }\n        $result = json_decode(curl_exec($ch), true) ?? [];\n        $result['_http_code'] = curl_getinfo($ch, CURLINFO_HTTP_CODE);\n        curl_close($ch);\n        return $result;\n    }\n\n    public function sendMessage(string $instanceId, string $to, string $content, ?string $mediaUrl = null): array\n    {\n        return $this->request('POST', '/send-message', array_filter([\n            'instance_id' => $instanceId, 'recipient' => $to,\n            'content' => $content, 'media_url' => $mediaUrl,\n        ]));\n    }\n\n    public function getDevices(): array { return $this->request('GET', '/devices'); }\n    public function getDeviceStatus(string $id): array { return $this->request('GET', '/device-status/' . $id); }\n    public function getMessageStatus(string $id): array { return $this->request('GET', '/message-status/' . $id); }\n    public function checkWhatsApp(string $id, string $phone): array\n    {\n        return $this->request('GET', '/check-whatsapp/' . $id . '/' . $phone);\n    }\n\n    public function sendTransactional(string $deviceId, string $to, string $waMsg, string $smsMsg, string $mode = 'auto', ?int $gwId = null): array\n    {\n        return $this->request('POST', '/send-transactional', array_filter([\n            'to' => $to, 'device_id' => $deviceId,\n            'whatsapp' => ['message' => $waMsg], 'sms' => ['message' => $smsMsg],\n            'failover_mode' => $mode, 'sms_gateway_id' => $gwId,\n        ]));\n    }\n}`, 'PHP Helper')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest border border-border"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copy Class
                      </button>
                    </div>
                    <div className="bg-[#0d1117] p-4 sm:p-6">
                      <pre className="text-[12px] font-mono leading-relaxed overflow-x-auto text-zinc-400 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
{`<?php
class `}<span className="text-amber-400">WaCloud</span>{`
{
    private string $apiKey;
    private string $baseUrl;

    public function `}<span className="text-blue-400">__construct</span>{`(string $apiKey, string $baseUrl = '${baseUrl}/api')
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    private function `}<span className="text-blue-400">request</span>{`(string $method, string $endpoint, array $data = []): array
    {
        $ch = curl_init($this->baseUrl . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'API-Key: ' . $this->apiKey,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
        ]);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        $result = json_decode(curl_exec($ch), true) ?? [];
        $result['_http_code'] = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $result;
    }

    public function `}<span className="text-blue-400">sendMessage</span>{`(string $instanceId, string $to, string $content, ?string $mediaUrl = null): array
    {
        return $this->request('POST', '/send-message', array_filter([
            'instance_id' => $instanceId, 'recipient' => $to,
            'content' => $content, 'media_url' => $mediaUrl,
        ]));
    }

    public function `}<span className="text-blue-400">getDevices</span>{`(): array { return $this->request('GET', '/devices'); }
    public function `}<span className="text-blue-400">getDeviceStatus</span>{`(string $id): array { return $this->request('GET', '/device-status/' . $id); }
    public function `}<span className="text-blue-400">getMessageStatus</span>{`(string $id): array { return $this->request('GET', '/message-status/' . $id); }

    public function `}<span className="text-blue-400">checkWhatsApp</span>{`(string $id, string $phone): array
    {
        return $this->request('GET', '/check-whatsapp/' . $id . '/' . $phone);
    }

    public function `}<span className="text-blue-400">sendTransactional</span>{`(string $deviceId, string $to, string $waMsg, string $smsMsg, string $mode = 'auto', ?int $gwId = null): array
    {
        return $this->request('POST', '/send-transactional', array_filter([
            'to' => $to, 'device_id' => $deviceId,
            'whatsapp' => ['message' => $waMsg], 'sms' => ['message' => $smsMsg],
            'failover_mode' => $mode, 'sms_gateway_id' => $gwId,
        ]));
    }
}`}
                      </pre>
                    </div>
                  </div>
                )}

                {activeTabs['sdks'] === 'Laravel' && (
                  <div className="space-y-0 shadow-sm border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-border">
                      <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-widest leading-none">Laravel Service / Http Facade</span>
                      <button 
                        onClick={() => copyToClipboard(`<?php\nnamespace App\\Services;\n\nuse Illuminate\\Support\\Facades\\Http;\n\nclass WaCloudService\n{\n    protected function client()\n    {\n        return Http::withHeaders([\n            'API-Key' => config('services.wacloud.api_key'),\n            'Accept'  => 'application/json',\n        ])->baseUrl(config('services.wacloud.base_url', '${baseUrl}/api'))->timeout(30);\n    }\n\n    public function sendMessage(string $instanceId, string $to, string $content, ?string $mediaUrl = null): array\n    {\n        return $this->client()->post('/send-message', array_filter([\n            'instance_id' => $instanceId, 'recipient' => $to,\n            'content' => $content, 'media_url' => $mediaUrl,\n        ]))->json();\n    }\n\n    public function sendTransactional(string $deviceId, string $to, string $waMsg, string $smsMsg): array\n    {\n        return $this->client()->post('/send-transactional', [\n            'to' => $to, 'device_id' => $deviceId,\n            'whatsapp' => ['message' => $waMsg],\n            'sms' => ['message' => $smsMsg],\n            'failover_mode' => 'auto',\n        ])->json();\n    }\n\n    public function getDevices(): array { return $this->client()->get('/devices')->json(); }\n    public function getDeviceStatus(string $id): array { return $this->client()->get("/device-status/{$id}")->json(); }\n    public function checkWhatsApp(string $id, string $phone): array { return $this->client()->get("/check-whatsapp/{$id}/{$phone}")->json(); }\n}`, 'Laravel Service')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest border border-border"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copy Service
                      </button>
                    </div>
                    <div className="bg-[#0d1117] p-4 sm:p-6">
                      <pre className="text-[12px] font-mono leading-relaxed overflow-x-auto text-zinc-400 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
{`<?php
namespace App\\Services;

use Illuminate\\Support\\Facades\\Http;

class `}<span className="text-amber-400">WaCloudService</span>{`
{
    protected function `}<span className="text-blue-400">client</span>{`()
    {
        return Http::withHeaders([
            'API-Key' => config('services.wacloud.api_key'),
            'Accept'  => 'application/json',
        ])->baseUrl(config('services.wacloud.base_url', '${baseUrl}/api'))->timeout(30);
    }

    public function `}<span className="text-blue-400">sendMessage</span>{`(string $instanceId, string $to, string $content, ?string $mediaUrl = null): array
    {
        return $this->client()->post('/send-message', array_filter([
            'instance_id' => $instanceId, 'recipient' => $to,
            'content' => $content, 'media_url' => $mediaUrl,
        ]))->json();
    }

    public function `}<span className="text-blue-400">sendTransactional</span>{`(string $deviceId, string $to, string $waMsg, string $smsMsg): array
    {
        return $this->client()->post('/send-transactional', [
            'to' => $to, 'device_id' => $deviceId,
            'whatsapp' => ['message' => $waMsg],
            'sms' => ['message' => $smsMsg],
            'failover_mode' => 'auto',
        ])->json();
    }

    public function `}<span className="text-blue-400">getDevices</span>{`(): array { return $this->client()->get('/devices')->json(); }
    public function `}<span className="text-blue-400">getDeviceStatus</span>{`(string $id): array { return $this->client()->get("/device-status/{$id}")->json(); }
    public function `}<span className="text-blue-400">checkWhatsApp</span>{`(string $id, string $phone): array { return $this->client()->get("/check-whatsapp/{$id}/{$phone}")->json(); }
}`}
                      </pre>
                    </div>
                  </div>
                )}

                {activeTabs['sdks'] === 'Postman' && (
                  <div className="flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed border-border rounded-2xl bg-white dark:bg-zinc-900/50 shadow-sm animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-6 ring-4 ring-orange-500/5 shadow-inner">
                      <Download className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Postman Collection</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-8 text-center max-w-sm leading-relaxed">
                      Pre-configured with your API key and all endpoints for rapid testing and development.
                    </p>
                    <a 
                      href="/WA_Cloud_API.postman_collection.json" 
                      download="WA_Cloud_API.postman_collection.json"
                      className="flex items-center gap-2.5 px-8 py-3.5 bg-[#005a41] hover:bg-[#004a35] text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 group"
                    >
                      <Download className="w-4 h-4 group-hover:animate-bounce" />
                      Download .json
                    </a>
                  </div>
                )}
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

            {/* Rate Limits & Errors Section */}
            <section id="errors" className="pt-4 pb-16 space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <TriangleAlert className="w-5 h-5 text-muted-foreground opacity-70" /> Error Codes
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Standard HTTP status codes returned by the API.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-950">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[500px]">
                      <thead className="bg-zinc-50 dark:bg-muted/30 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-muted-foreground/80 w-32">CODE</th>
                          <th className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-muted-foreground/80">DESCRIPTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                        {[
                          { code: '401', desc: 'Unauthorized — Invalid or missing API key' },
                          { code: '403', desc: 'Forbidden — Subscription not active or limit reached' },
                          { code: '404', desc: 'Not Found — Device, message, or resource not found' },
                          { code: '422', desc: 'Validation Error — Invalid parameters or device disconnected' },
                          { code: '429', desc: 'Rate Limited — Too many requests (60/min, 1K/hr, 10K/day)' },
                          { code: '500', desc: 'Server Error — Internal failure' },
                          { code: '502', desc: 'Bad Gateway — Upstream WhatsApp server unavailable' },
                        ].map((err) => (
                          <tr key={err.code} border-b="none" className="hover:bg-zinc-50 dark:hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-2.5 font-bold text-zinc-900 dark:text-zinc-100 text-[13px]">{err.code}</td>
                            <td className="px-5 py-2.5 text-zinc-500 dark:text-zinc-400 text-[13px] leading-relaxed">{err.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 p-5 flex items-start gap-4 shadow-sm">
                <TriangleAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="text-zinc-900 dark:text-zinc-200 font-bold">Rate Limits:</span> 60 requests/min, 1,000/hour, 10,000/day per API key. Exceeding limits returns <code className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded font-mono text-[11px]">429</code> with a <code className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded font-mono text-[11px]">Retry-After</code> header.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
}
