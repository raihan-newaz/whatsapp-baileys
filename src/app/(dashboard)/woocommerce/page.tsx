'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Webhook, Plus, Copy, Check, RefreshCcw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function WooCommercePage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', trigger_event: 'order.created', template_id: '', session_id: '', secret_token: '' });
  const [copied, setCopied] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const toast = useToast();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      await loadData(data.user.id);
    });
  }, []);

  async function loadData(uid: string) {
    try {
      const [w, t, s, p] = await Promise.all([
        apiFetch(`/api/webhooks/${uid}`),
        apiFetch(`/api/templates/${uid}`),
        apiFetch(`/api/whatsapp/sessions/${uid}`),
        apiFetch(`/api/profiles/${uid}`),
      ]);
      setWebhooks(w || []); 
      setTemplates(t || []); 
      setSessions(s || []); 
      setProfile(p);
    } catch (err) {
      console.error('Failed to load woocommerce data:', err);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      const result = await apiFetch('/api/webhooks', { method: 'POST', body: JSON.stringify({ userId: user.id, ...form }) });
      setWebhooks(prev => [result, ...prev]);
      setShowAdd(false);
      toast.success('WooCommerce webhook created');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function copyUrl(token: string) {
    const url = `${BACKEND_URL}/api/webhooks/woocommerce/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
  }

  const isLocked = profile && profile.role !== 'admin' && (profile.plan === 'free' || !profile.plan);

  return (
    <div className="p-4 md:p-8 relative pb-24 min-h-screen">
      {isLocked && (
        <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl m-4 border border-border">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Webhook className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Pro Feature</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              WooCommerce integration allows you to automatically send WhatsApp messages for new orders, shipping updates, and more. Upgrade to the Pro or Enterprise plan to unlock this feature.
            </p>
            <a href="/dashboard/billing" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition shadow-sm">
              Upgrade Plan
            </a>
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between mb-8 ${isLocked ? 'opacity-20 pointer-events-none' : ''}`}>
        <div><h1 className="font-semibold text-foreground flex items-center gap-2"><Webhook className="w-6 h-6 text-orange-400 dark:text-orange-500" /> WooCommerce Integration</h1>
          <p className="text-muted-foreground mt-1">Auto-send WhatsApp messages on WooCommerce events</p></div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (user) {
                await loadData(user.id);
                toast.success('WooCommerce data refreshed');
              }
            }}
            className="btn-icon"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={() => setShowAdd(true)} disabled={isLocked} className="btn-primary !bg-orange-500 hover:!bg-orange-600 dark:!bg-orange-600 dark:hover:!bg-orange-500">
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" /> New Webhook
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95">
            <h2 className="text-lg font-semibold text-foreground mb-5">Create Webhook</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {[['Name', 'name', 'text', 'Order Confirmation']].map(([label, key, type, ph]) => (
                <div key={key}><label className="text-sm font-medium text-foreground mb-1 block">{label}</label>
                  <input type={type} required value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground placeholder-muted-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" /></div>
              ))}
              <div className="w-full">
                <CustomSelect
                  label="Trigger Event"
                  value={form.trigger_event}
                  onChange={(val) => setForm(p => ({ ...p, trigger_event: val }))}
                  options={[
                    { value: 'order.created', label: 'order.created' },
                    { value: 'order.completed', label: 'order.completed' },
                    { value: 'order.shipped', label: 'order.shipped' }
                  ]}
                />
              </div>
              <div className="w-full">
                <CustomSelect
                  label="Message Template"
                  value={form.template_id}
                  onChange={(val) => setForm(p => ({ ...p, template_id: val }))}
                  options={[
                    { value: '', label: 'Select...' },
                    ...templates.map(t => ({ value: t.id, label: t.name }))
                  ]}
                  placeholder="Select..."
                />
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Secret Key (Optional)</label>
                <input type="text" value={form.secret_token} onChange={e => setForm(p => ({ ...p, secret_token: e.target.value }))} placeholder="Custom secret token or leave blank" className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground placeholder-muted-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
                <p className="text-[10px] text-muted-foreground mt-1 italic">If you provide a secret here, you must also set it in WooCommerce "Secret" field.</p>
              </div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground border border-border transition rounded-xl py-2.5">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-500 transition shadow-sm text-white rounded-xl py-2.5">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Instructions Block */}
      {!isLocked && (
        <div className="bg-card border border-border shadow-sm rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">How to Connect WooCommerce</h2>
          <ol className="list-decimal list-inside space-y-3 text-sm text-foreground">
            <li>Click <strong>New Webhook</strong> to generate a unique URL for your chosen event.</li>
            <li>Copy the generated Webhook URL from the list below.</li>
            <li>Go to your WordPress Admin Dashboard ➔ <strong>WooCommerce</strong> ➔ <strong>Settings</strong>.</li>
            <li>Click the <strong>Advanced</strong> tab, then click <strong>Webhooks</strong>.</li>
            <li>Click <strong>Add webhook</strong> and fill out the details:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-muted-foreground">
                <li><strong>Status:</strong> Active</li>
                <li><strong>Topic:</strong> Choose the matching event (e.g., Order Created)</li>
                <li><strong>Delivery URL:</strong> Paste the unique Webhook URL you copied</li>
                <li><strong>Secret:</strong> Paste the <strong>Secret Key</strong> from the list below (if you provided one)</li>
              </ul>
            </li>
            <li className="text-orange-600 dark:text-orange-400 font-medium">Note: If your WordPress is live and your backend is on localhost, you MUST use a tool like Ngrok to make your local URL public.</li>
            <li>Click <strong>Save Webhook</strong>. Your WhatsApp integration is now live!</li>
          </ol>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border shadow-sm rounded-2xl">No webhooks yet.</div>
        ) : webhooks.map(w => (
          <div key={w.id} className="bg-card border border-border shadow-sm rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div><h3 className="font-semibold text-foreground">{w.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{w.trigger_event} · {w.received_count} received</p></div>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${w.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' : 'bg-secondary text-muted-foreground border-border'}`}>{w.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-4 py-2.5 border border-border/50">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase w-16">URL</div>
                <code className="text-xs text-orange-600 dark:text-orange-400 flex-1 truncate">{BACKEND_URL}/api/webhooks/woocommerce/{w.secret_token}</code>
                <button onClick={() => copyUrl(`${BACKEND_URL}/api/webhooks/woocommerce/${w.secret_token}`)} className="text-muted-foreground hover:text-foreground transition flex-shrink-0">
                  {copied === `${BACKEND_URL}/api/webhooks/woocommerce/${w.secret_token}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-secondary/30 rounded-xl px-4 py-2.5 border border-border/50">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase w-16">Secret</div>
                <code className="text-xs text-foreground flex-1 truncate">{w.secret_token}</code>
                <button onClick={() => { navigator.clipboard.writeText(w.secret_token); setCopied(w.secret_token); setTimeout(() => setCopied(''), 2000); }} className="text-muted-foreground hover:text-foreground transition flex-shrink-0">
                  {copied === w.secret_token ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
