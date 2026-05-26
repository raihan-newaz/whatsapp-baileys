'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Users, Download, Loader2, Save, Play, CheckCircle, Search, Smartphone, Plus, X, ArrowRight, Filter, Database, RefreshCcw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function ExtractorPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState('');
  const [extracting, setExtracting] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null); // { groupName: '', members: [] }
  const [targetContactGroup, setTargetContactGroup] = useState('');
  const [contactGroups, setContactGroups] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupLoadError, setGroupLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      
      try {
        const s = await apiFetch(`/api/whatsapp/sessions/${data.user.id}`);
        const connected = s.filter((sess: any) => sess.status === 'connected' && (!sess.device_type || sess.device_type === 'whatsapp'));
        setSessions(connected || []);
        if (connected && connected.length > 0) {
          setActiveSession(connected[0].session_name);
          loadGroups(data.user.id, connected[0].session_name);
        } else {
          setLoading(false);
        }

        const cg = await apiFetch(`/api/groups/${data.user.id}`);
        setContactGroups(cg || []);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setLoading(false);
      }
    });
  }, []);

  async function loadGroups(uid: string, sessionName: string, isRetry = false) {
    setLoading(true);
    setGroupLoadError(null);
    try {
      const { groups: g } = await apiFetch(`/api/whatsapp/groups?userId=${uid}&sessionName=${sessionName}`);
      setGroups(g || []);
    } catch (err: any) {
      const isInitializing = err.message?.toLowerCase().includes('initializing');
      if (isInitializing) {
        console.warn('[Extractor] Session still initializing, will auto-retry...');
        setGroupLoadError('initializing');
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadGroups(uid, sessionName, true);
        }, 5000);
      } else {
        setGroupLoadError(err.message);
      }
    }
    setLoading(false);
  }

  async function handleExtract(groupId: string) {
    setExtracting(groupId);
    try {
      const { data } = await apiFetch(`/api/whatsapp/groups/${groupId}/extract`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, sessionName: activeSession })
      });
      setExtractedData(data);
    } catch (err: any) {
      toast.error(err.message);
    }
    setExtracting(null);
  }

  async function handleDownloadCSV() {
    if (!extractedData) return;
    const { utils, writeFile } = await import('xlsx');
    const exportData = extractedData.members.map((m: any) => ({
      Phone: m.phone,
      Name: m.name || `Lead - ${m.phone}`,
      WhatsAppID: m.wid,
      IsAdmin: m.isAdmin ? 'Yes' : 'No',
      ExtractedFrom: extractedData.groupName,
      ExtractionDate: new Date().toLocaleString()
    }));
    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Group Members");
    writeFile(wb, `${extractedData.groupName}_Leads.xlsx`);
  }

  async function handleSaveToContacts() {
    if (!extractedData || !targetContactGroup) return toast.warning('Select a Contact Group first.');
    setSaving(true);
    try {
      const contactsToSave = extractedData.members.map((m: any) => ({
        name: m.name ? m.name : `Lead - ${m.phone}`,
        phone: m.phone,
        tags: ['Group Lead', extractedData.groupName],
        group_id: targetContactGroup
      }));
      await apiFetch('/api/contacts/bulk', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, contacts: contactsToSave })
      });
      toast.success(`Success! Saved ${contactsToSave.length} leads to contacts.`);
      setExtractedData(null);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || !user) return;
    setCreatingGroup(true);
    try {
      const data = await apiFetch('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, name: newGroupName.trim() })
      });
      setContactGroups(prev => [...prev, data]);
      setTargetContactGroup(data.id);
      setIsCreatingGroup(false);
      setNewGroupName('');
      toast.success('Group created successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreatingGroup(false);
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-semibold text-foreground tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> WhatsApp Group Extractor
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Extract and export participants from your WhatsApp groups as leads.</p>
        </div>
        {sessions.length > 0 && (
          <div className="flex items-center gap-3">
             <div className="w-64">
                <CustomSelect
                  label="Active Account"
                  value={activeSession}
                  onChange={(val) => { setActiveSession(val); loadGroups(user.id, val); }}
                  options={sessions.map(s => ({
                    value: s.session_name,
                    label: `${s.session_name === 'default' ? 'Primary' : s.session_name} (+${s.phone_number})`
                  }))}
                  icon={<Smartphone className="w-4 h-4 text-emerald-600" />}
                />
             </div>
             <button 
                onClick={async () => {
                  await loadGroups(user.id, activeSession);
                  toast.success('Group list refreshed');
                }}
                className="btn-icon"
                title="Refresh Groups"
             >
                <RefreshCcw className={`w-4 h-4 md:w-5 md:h-5 ${loading && 'animate-spin'}`} />
             </button>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
           <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-6">
              <Smartphone className="w-10 h-10 text-orange-500" />
           </div>
           <h2 className="text-xl font-medium text-orange-600 dark:text-orange-500 mb-2">No Active Sessions</h2>
           <p className="text-orange-600/70 dark:text-orange-400 max-w-sm mb-8 font-medium italic">Please connect at least one WhatsApp account to start extracting group members.</p>
           <a href="/dashboard/whatsapp" className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-2xl text-sm shadow-xl shadow-orange-600/20 transition-all">
             Connect Account
           </a>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary" />
                <Users className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium text-lg">Loading Groups...</p>
                {groupLoadError === 'initializing' && (
                   <p className="text-muted-foreground text-sm italic mt-1 animate-pulse">Session is initializing, please wait a moment.</p>
                )}
              </div>
            </div>
          ) : groupLoadError && groupLoadError !== 'initializing' ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center max-w-sm">
                <p className="text-destructive font-medium text-lg">Failed to load groups</p>
                <p className="text-destructive/80 text-sm mt-1">{groupLoadError}</p>
              </div>
              <button 
                onClick={() => loadGroups(user.id, activeSession)}
                className="px-8 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl text-sm shadow-xl transition-all hover:-translate-y-0.5"
              >
                Try Again
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
                 <Filter className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No groups found</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic">Make sure you have joined some WhatsApp groups with this session.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border">
                    <th className="px-8 py-5 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">Group Name</th>
                    <th className="px-8 py-5 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">Audience Size</th>
                    <th className="px-8 py-5 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">Ref ID</th>
                    <th className="px-8 py-5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groups.map((g, i) => (
                    <tr key={g.id} className="group hover:bg-primary/5 transition-all duration-300">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shadow-sm">
                               {g.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-foreground group-hover:text-primary">{g.name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full text-[11px] font-medium text-muted-foreground">
                            <Users className="w-3 h-3" /> {g.participants_count} Members
                         </span>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-xs font-mono text-muted-foreground">{g.id.slice(0, 15)}...</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleExtract(g.id)}
                          disabled={extracting === g.id}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all shadow-lg shadow-primary/20 text-xs font-medium disabled:opacity-50 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
                        >
                          {extracting === g.id ? (
                             <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</>
                          ) : (
                             <><Plus className="w-4 h-4" /> Extract Leads</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Extraction Results Modal */}
      {extractedData && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card rounded-xl p-10 w-full max-w-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] relative border border-border animate-in zoom-in slide-in-from-bottom-5 duration-500">
            <button 
               onClick={() => setExtractedData(null)}
               className="absolute top-8 right-8 p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
            >
               <X className="w-6 h-6" />
            </button>

            <div className="w-20 h-20 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-primary/5">
              <CheckCircle className="w-10 h-10" />
            </div>
            
            <h2 className="text-3xl font-semibold text-center text-foreground mb-2 tracking-tight">Leads Extracted!</h2>
            <p className="text-center text-muted-foreground mb-10 font-medium">
               Found <strong className="text-foreground font-semibold">{extractedData.members.length}</strong> active participants in 
               <br/><span className="text-primary font-semibold italic">"{extractedData.groupName}"</span>
            </p>
            
            <div className="space-y-4">
                <div className="bg-secondary/30 rounded-3xl p-6 border border-border">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block mb-4">Direct Save</label>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1">
                          <CustomSelect
                            value={targetContactGroup}
                            onChange={(val) => {
                              if (val === 'new') {
                                setIsCreatingGroup(true);
                                setTargetContactGroup('');
                              } else {
                                setTargetContactGroup(val);
                                setIsCreatingGroup(false);
                              }
                            }}
                            options={[
                              { value: '', label: 'Select Target Group...' },
                              ...contactGroups.map(cg => ({ value: cg.id, label: cg.name })),
                              { value: 'new', label: '+ Create New Group', icon: <Plus className="w-3 h-3 text-primary" /> }
                            ]}
                            placeholder="Select Target Group..."
                          />
                        </div>
                        <button onClick={handleSaveToContacts} disabled={saving || !targetContactGroup} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl text-xs shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Save to CRM
                        </button>
                    </div>
                    
                    {isCreatingGroup && (
                        <div className="flex gap-2 p-3 bg-background border border-border rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
                            <input 
                                type="text" 
                                placeholder="Group Name..." 
                                value={newGroupName} 
                                onChange={e => setNewGroupName(e.target.value)}
                                className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2 text-foreground text-sm focus:outline-none focus:border-ring"
                                autoFocus
                            />
                            <button 
                                onClick={handleCreateGroup} 
                                disabled={!newGroupName.trim() || creatingGroup}
                                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-5 py-2 rounded-xl text-xs shadow-lg transition-all disabled:opacity-50"
                            >
                                {creatingGroup ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Create'}
                            </button>
                        </div>
                    )}
                </div>
              </div>

              <button 
                onClick={handleDownloadCSV} 
                className="w-full bg-secondary/50 hover:bg-primary/5 border border-border hover:border-primary/20 text-muted-foreground hover:text-primary flex items-center justify-between px-8 py-5 rounded-3xl transition-all group"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-background shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-border">
                      <Download className="w-5 h-5 text-primary" />
                   </div>
                   <div className="text-left">
                     <p className="text-sm font-semibold text-foreground">Export as Excel</p>
                     <p className="text-[10px] font-semibold text-muted-foreground">Download raw data for manual use.</p>
                   </div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
