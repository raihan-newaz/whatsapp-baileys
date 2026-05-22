'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Users, Send, Search, Loader2, CheckCircle2, AlertCircle, MessageSquare, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function GroupMessagingPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [user, setUser] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadSessions(data.user.id);
        loadTemplates(data.user.id);
      }
    });
  }, []);

  async function loadTemplates(uid: string) {
    try {
      const data = await apiFetch(`/api/templates/${uid}`);
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }

  async function loadSessions(uid: string) {
    try {
      const data = await apiFetch(`/api/whatsapp/sessions/${uid}`);
      const connected = data.filter((s: any) => s.status === 'connected');
      setSessions(connected || []);
      if (connected && connected.length > 0) {
        setSelectedSession(connected[0].session_name);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }

  async function fetchGroups() {
    if (!user || !selectedSession) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/whatsapp/groups?userId=${user.id}&sessionName=${selectedSession}`);
      if (res.error) throw new Error(res.error);
      setGroups(res.groups || []);
      toast.success(`Fetched ${res.groups?.length || 0} groups`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  function toggleGroup(id: string) {
    setSelectedGroupIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSend() {
    if (!user || !selectedSession) return toast.warning('Connect a session first');
    if (selectedGroupIds.length === 0) return toast.warning('Select at least one group');
    if (!message.trim()) return toast.warning('Enter a message');

    setSending(true);
    try {
      const res = await apiFetch('/api/whatsapp/groups/send', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          sessionName: selectedSession,
          groupIds: selectedGroupIds,
          message: message
        })
      });

      if (res.success) {
        const failed = res.results.filter((r: any) => !r.success);
        if (failed.length > 0) {
          toast.warning(`Sent to ${res.results.length - failed.length} groups. ${failed.length} failed.`);
        } else {
          toast.success(`Successfully sent to all ${res.results.length} groups!`);
        }
        setMessage('');
        setSelectedGroupIds([]);
      } else {
        throw new Error(res.error || 'Failed to send');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setSending(false);
  }

  return (
    <div className="p-4 md:p-8 min-h-screen pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" /> Group Messaging
          </h1>
          <p className="text-muted-foreground mt-1">Send mass broadcasts to your WhatsApp groups</p>
        </div>
        
        <div className="flex items-center gap-4">
        <div className="w-64">
          <CustomSelect
            value={selectedSession}
            onChange={(val) => setSelectedSession(val)}
            options={sessions.map(s => ({
              value: s.session_name,
              label: `${s.session_name} (Connected)`
            }))}
            placeholder={sessions.length === 0 ? "No Active Session" : "Select Session"}
            icon={<Smartphone className="w-4 h-4 text-primary" />}
          />
        </div>
          <button 
            disabled={loading || !selectedSession}
            onClick={fetchGroups}
            className="btn-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-1.5" /> : <Users className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />}
            Fetch Groups
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Group Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border bg-secondary/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your groups..."
                  className="w-full bg-background border border-input rounded-xl pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-sm"
                />
              </div>
              <div className="flex items-center justify-between mt-4 px-1">
                <span className="text-xs text-muted-foreground">
                  {selectedGroupIds.length} groups selected
                </span>
                <button 
                  onClick={() => setSelectedGroupIds(selectedGroupIds.length === filteredGroups.length ? [] : filteredGroups.map(g => g.id))}
                  className="text-xs text-primary hover:text-primary/80 transition"
                >
                  {selectedGroupIds.length === filteredGroups.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                  <div className="p-4 bg-secondary/30 rounded-full">
                    <Users className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm">No groups loaded. Click "Fetch Groups" to start.</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No matching groups found.</p>
              ) : filteredGroups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => toggleGroup(group.id)}
                  className={`
                    flex items-center justify-between p-4 rounded-xl border cursor-pointer transition
                    ${selectedGroupIds.includes(group.id) 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'bg-secondary/30 border-border hover:border-input'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-semibold overflow-hidden border border-primary/20">
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-foreground">{group.name}</h4>
                        <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-md border border-border">
                          {group.participants_count || 0} members
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{group.id}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center transition
                    ${selectedGroupIds.includes(group.id) ? 'bg-primary border-primary' : 'border-input'}
                  `}>
                    {selectedGroupIds.includes(group.id) && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Message Composer */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Your Message
                </label>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {showTemplates ? 'Show Editor' : 'Use Template'} {showTemplates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showTemplates ? (
                <div className="grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 max-h-[250px] overflow-y-auto pr-1">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setMessage(t.content); setShowTemplates(false); }}
                      className="p-3 bg-background border border-border rounded-xl hover:border-primary/30 transition-all text-left shadow-sm group"
                    >
                      <p className="text-xs font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{t.content}</p>
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-xs italic">No templates found</p>
                  )}
                </div>
              ) : (
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you want to announce to these groups?"
                  className="w-full bg-background border border-input rounded-xl p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition min-h-[200px] text-sm resize-none"
                />
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                Avoid sending spammy content to prevent number banning.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-2 border-t border-border">
                <span className="text-muted-foreground">Targeting:</span>
                <span className="text-foreground font-medium">{selectedGroupIds.length} groups</span>
              </div>
              <button 
                disabled={sending || selectedGroupIds.length === 0 || !message.trim()}
                onClick={handleSend}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition disabled:opacity-50 shadow-lg shadow-green-600/10"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Broadcast
              </button>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" /> Pro Tip
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Group broadcasting is more effective than individual messaging for community building. 
              Ensure your session is connected and active before sending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
