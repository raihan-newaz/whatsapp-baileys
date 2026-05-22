'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { ShieldAlert, Pause, Play, Trash2, Search, Loader2, User, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const STATUS_COLOR: Record<string, string> = {
  running: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      
      try {
        const p = await apiFetch(`/api/profiles/${data.user.id}`);
        if (p?.role !== 'admin') { router.push('/dashboard'); return; }
        fetchCampaigns();
      } catch (err) {
        console.error('Admin check failed:', err);
        router.push('/dashboard');
      }
    });
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/campaigns');
      setCampaigns(data.campaigns || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleForcePause(id: string) {
    if (!confirm('Are you sure you want to forcibly pause this user campaign?')) return;
    setActionLoading(`pause-${id}`);
    try {
      await apiFetch(`/api/admin/campaigns/${id}/pause`, { method: 'PATCH' });
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'paused' } : c));
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  }

  const filtered = campaigns.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-yellow-400" /> Campaign Monitor
          </h1>
          <p className="text-zinc-400 mt-1">Oversee, track, and forcefully pause active sending queues across the entire platform.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by user email or campaign..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-80 bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No campaigns found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/20">
                  <th className="text-left py-4 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Campaign</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">User Account</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Metrics</th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 border-t border-zinc-800">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-4 px-5">
                      <p className="font-semibold text-white">{c.name}</p>
                      <span className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                          <User className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-300">{c.profiles?.email}</p>
                          <p className="text-xs text-zinc-500">Session: {c.whatsapp_sessions?.session_name || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                       <p className="text-sm text-zinc-300">Sent: <span className="text-white font-medium">{c.total_sent || 0}</span></p>
                       <p className={`text-xs ${c.total_failed > 0 ? 'text-red-400' : 'text-zinc-500'}`}>Failed: {c.total_failed || 0}</p>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`text-xs px-2.5 py-1 rounded-full border border-opacity-50 capitalize font-medium ${STATUS_COLOR[c.status] || STATUS_COLOR.draft}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {c.status === 'running' ? (
                        <button 
                          onClick={() => handleForcePause(c.id)}
                          disabled={actionLoading === `pause-${c.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === `pause-${c.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                          Force Pause
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">No action needed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
