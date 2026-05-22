'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Search, Grid, List, RefreshCcw, 
  Image as ImageIcon, Video, FileText, HardDrive, 
  MoreHorizontal, Trash2, ExternalLink, Download,
  Loader2, Filter, AlertCircle, CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function MediaGalleryPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ summary: { totalFiles: 0, totalSize: 0, limit: 104857600 } });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [user, setUser] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);

    try {
      const [mediaData, statsData] = await Promise.all([
        apiFetch(`/api/media/${user.id}`),
        apiFetch(`/api/media/${user.id}/stats`)
      ]);
      setMedia(mediaData || []);
      setStats(statsData || stats);
    } catch (err) {
      console.error('Failed to fetch media data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const limit = Number(stats.summary.limit);
    if (limit > 0 && Number(stats.summary.totalSize) + file.size > limit) {
      toast('Storage limit exceeded!', 'error');
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `broadcast/${user.id}/${fileName}`;
      
      // 1. Upload to Storage
      await supabase.storage.from('whatsapp-media').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
      
      // 2. Register in DB
      let type: 'image' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      await apiFetch('/api/media', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          name: file.name,
          url: publicUrl,
          type,
          size: file.size
        })
      });

      toast('File uploaded successfully', 'success');
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this file from the gallery?')) return;
    try {
      await apiFetch(`/api/media/${id}?userId=${user.id}`, { method: 'DELETE' });
      setMedia(prev => prev.filter(m => m.id !== id));
      toast('File removed', 'success');
      fetchData(); // Refresh stats
    } catch (err: any) {
      toast('Failed to delete', 'error');
    }
  }

  const filteredMedia = media.filter(m => {
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usagePercent = stats.summary.limit === 0 ? 0 : (stats.summary.totalSize / stats.summary.limit) * 100;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-foreground">Media Gallery</h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage your media files for WhatsApp messages</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              await fetchData();
              toast('Media gallery refreshed', 'success');
            }} 
            className="btn-icon"
            title="Refresh"
          >
            <RefreshCcw className={`w-4 h-4 md:w-5 md:h-5 ${loading && 'animate-spin'}`} />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-2" /> : <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />}
            Upload Files
          </button>
        </div>
      </div>

      {/* Storage Usage Section */}
      <section className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <HardDrive className="w-4 h-4 text-primary" />
            <span>Storage Usage</span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {formatSize(stats.summary.totalSize)} / {formatSize(stats.summary.limit)} ({ (stats.summary.limit - stats.summary.totalSize) / 1024 / 1024 > 0 ? ( (stats.summary.limit - stats.summary.totalSize) / 1024 / 1024 ).toFixed(2) : 0 } MB remaining)
          </span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Files', value: stats.summary.totalFiles, icon: FileText, color: 'border' },
          { label: 'Images', value: stats.details?.find((d:any) => d.type === 'image')?.count || 0, icon: ImageIcon, color: 'blue' },
          { label: 'Videos', value: stats.details?.find((d:any) => d.type === 'video')?.count || 0, icon: Video, color: 'purple' },
          { label: 'Total Size', value: formatSize(stats.summary.totalSize), icon: HardDrive, color: 'emerald' },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-${item.color === 'border' ? 'muted-foreground' : item.color + '-500'}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-lg font-semibold text-foreground leading-none mt-1">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search media..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-2.5 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-background p-1 rounded-xl border border-border">
            {['all', 'image', 'video', 'document'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg tracking-wider transition-all ${filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="h-6 w-px bg-border mx-1 hidden md:block" />
          
          <div className="flex bg-background p-1 rounded-xl border border-border">
            <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Content */}
      {filteredMedia.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl py-24 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-4">
             <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
             </div>
             <div>
                <p className="text-foreground font-semibold text-lg">No media files</p>
                <p className="text-muted-foreground font-medium text-sm">Upload images, videos, or documents to get started</p>
             </div>
             <button onClick={() => fileInputRef.current?.click()} className="mt-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl shadow-md hover:bg-primary/90 transition-all">
                Upload Files
             </button>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredMedia.map(m => (
            <div key={m.id} className="group bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="aspect-square bg-secondary/50 relative overflow-hidden flex items-center justify-center border-b border-border">
                {m.type === 'image' ? (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : m.type === 'video' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Video className="w-8 h-8 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Video</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">DOC</span>
                  </div>
                )}
                
                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <a href={m.url} target="_blank" rel="noreferrer" className="p-2 bg-card rounded-xl text-foreground hover:bg-primary hover:text-primary-foreground transition-all">
                      <ExternalLink className="w-4 h-4" />
                   </a>
                   <button onClick={() => handleDelete(m.id)} className="p-2 bg-card rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-semibold text-foreground truncate mb-1" title={m.name}>{m.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">{formatSize(m.size)}</span>
                  <span className="text-[9px] font-semibold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded-md">
                    {m.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/30 border-b border-border">
                  <th className="py-4 px-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Name</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Type</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Size</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Added On</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMedia.map(m => (
                  <tr key={m.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-border">
                           {m.type === 'image' ? <ImageIcon className="w-4 h-4 text-blue-500" /> : m.type === 'video' ? <Video className="w-4 h-4 text-purple-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate max-w-xs">{m.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6"><span className="text-[10px] font-semibold uppercase text-muted-foreground">{m.type}</span></td>
                    <td className="py-4 px-6"><span className="text-[10px] font-semibold text-foreground">{formatSize(m.size)}</span></td>
                    <td className="py-4 px-6 text-right font-semibold text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={m.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><ExternalLink className="w-4 h-4" /></a>
                          <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
