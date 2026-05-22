'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Users, Upload, Plus, Trash2, Search, Download, ShieldCheck, ShieldAlert, AlertCircle, Loader2, Zap, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Smartphone, RotateCcw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { CustomSelect } from '@/components/ui/CustomSelect';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', tags: '', groupId: '' });
  const [groupForm, setGroupForm] = useState({ id: '', name: '' });
  const [groupSaving, setGroupSaving] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
  const [sessions, setSessions] = useState<any[]>([]);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      await loadData(data.user.id);
    });
  }, []);

  // Consolidate all loading logic into one effect
  useEffect(() => {
    if (!user) return;

    // Reset pagination when searching or filtering
    const timer = setTimeout(() => {
      // If search or filter changed, reset to page 1
      loadData(user.id);
    }, search ? 500 : 0); // Only debounce if searching

    return () => clearTimeout(timer);
  }, [user?.id, page, filterGroup, search]);

  // Separate effect to reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterGroup]);

  async function loadData(uid: string) {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search,
        group_id: filterGroup
      });

      const [res, g, s] = await Promise.all([
        apiFetch(`/api/contacts/${uid}?${query.toString()}`),
        apiFetch(`/api/groups/${uid}`),
        apiFetch(`/api/whatsapp/sessions/${uid}`),
      ]);
      
      setContacts(res.contacts || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setGroups(g || []);
      setSessions((s || []).filter((session: any) => session.status === 'connected'));
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
    }
    setLoading(false);
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    try {
      await apiFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id, 
          name: form.name, 
          phone: form.phone.replace(/[^0-9]/g, ''),
          email: form.email, 
          group_id: form.groupId || null,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        })
      });
      setShowAdd(false);
      setForm({ name: '', phone: '', email: '', tags: '', groupId: '' });
      await loadData(user.id);
      toast.success('Contact added successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function downloadSampleCSV() {
    const csvContent = "name,phone,email,tags\nJohn Doe,8801700000000,john@example.com,\"VIP,Retail\"\nJane Smith,8801800000000,jane@example.com,Wholesale";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_contacts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async function handleExportContacts() {
    if (contacts.length === 0) return toast.warning('No contacts to export.');
    const { utils, writeFile } = await import('xlsx');
    
    const exportData = contacts.map(c => ({
      Name: c.name,
      Phone: c.phone,
      Email: c.email || '',
      Tags: c.tags ? (typeof c.tags === 'string' ? JSON.parse(c.tags).join(', ') : c.tags.join(', ')) : '',
      Group: groups.find(g => g.id === c.group_id)?.name || ''
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Contacts");
    writeFile(wb, "Exported_Contacts.xlsx");
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const { read, utils } = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = read(buf);
    const rows: any[] = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    try {
      await apiFetch('/api/contacts/bulk', { method: 'POST', body: JSON.stringify({ userId: user.id, contacts: rows }) });
      await loadData(user.id);
      toast.success(`Successfully imported ${rows.length} contacts.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return;
    await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' });
    setContacts(prev => prev.filter(c => c.id !== id));
    toast.success('Contact deleted');
  }

  async function handleSaveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !groupForm.name.trim()) return;
    setGroupSaving(true);
    try {
      if (groupForm.id) {
        await apiFetch(`/api/groups/${groupForm.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: groupForm.name.trim() })
        });
      } else {
        await apiFetch('/api/groups', {
          method: 'POST',
          body: JSON.stringify({ user_id: user.id, name: groupForm.name.trim() })
        });
        toast.success(`Group "${groupForm.name}" created`);
      }
      setGroupForm({ id: '', name: '' });
      await loadData(user.id);
    } catch (err: any) {
      toast.error(err.message);
    }
    setGroupSaving(false);
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm('Delete this group? All contacts within it will remain but lose their group assignment.')) return;
    try {
      await apiFetch(`/api/groups/${id}`, { method: 'DELETE' });
      await loadData(user.id);
      toast.success('Group deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeleteGroupContacts(groupId: string, groupName: string) {
    const count = contacts.filter(c => c.group_id === groupId).length;
    if (!confirm(`Delete ALL ${count} contacts from "${groupName}"? This cannot be undone!`)) return;
    try {
      await apiFetch(`/api/contacts/group/${groupId}?userId=${user.id}`, { method: 'DELETE' });
      await loadData(user.id);
      toast.success(`Deleted all contacts in "${groupName}"`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleValidate(id: string) {
    if (!user || sessions.length === 0) return toast.warning('Connect a WhatsApp session first');
    setValidatingId(id);
    try {
      const res = await apiFetch(`/api/contacts/${id}/validate`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, sessionName: sessions[0].session_name })
      });
      if (res.success) {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, is_wa_valid: res.isValid, last_validated_at: new Date().toISOString() } : c));
        toast.success(res.isValid ? 'Number is on WhatsApp' : 'Number not registered on WhatsApp');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setValidatingId(null);
  }

  async function handleBulkValidate() {
    if (!user || sessions.length === 0) return toast.warning('Connect a WhatsApp session first');
    
    // Process ALL unvalidated contacts in the current filter, not just 50
    // We fetch them in batches from the current filtered set or we can fetch them all from the backend
    // For simplicity, we'll validate what's currently loaded/filtered or ask the user if they want to validate the ENTIRE database
    
    // Let's get all unvalidated contact IDs for the current user and filter
    const query = new URLSearchParams({
      group_id: filterGroup,
      search: search,
      limit: '999999' // Fetch all to get IDs for validation
    });

    setValidatingId('bulk');
    try {
      const allRes = await apiFetch(`/api/contacts/${user.id}?${query.toString()}`);
      const toValidate = (allRes.contacts || []).filter((c: any) => c.is_wa_valid === null || c.is_wa_valid === undefined);
      
      if (toValidate.length === 0) {
        setValidatingId(null);
        return toast.info('All currently filtered contacts are already validated.');
      }

      setValidationProgress({ current: 0, total: toValidate.length });
      toast.info(`Starting validation for ${toValidate.length} contacts...`);

      const batchSize = 50;
      for (let i = 0; i < toValidate.length; i += batchSize) {
        const batch = toValidate.slice(i, i + batchSize);
        const batchIds = batch.map((c: any) => c.id);
        
        const res = await apiFetch('/api/contacts/bulk-validate', {
          method: 'POST',
          body: JSON.stringify({ 
            userId: user.id, 
            contactIds: batchIds,
            sessionName: sessions[0].session_name 
          })
        });

        if (res.success) {
          const resultsMap = new Map(res.results.map((r: any) => [r.id, r.isValid]));
          setContacts(prev => prev.map(c => resultsMap.has(c.id) ? { ...c, is_wa_valid: resultsMap.get(c.id), last_validated_at: new Date().toISOString() } : c));
          setValidationProgress(p => ({ ...p, current: Math.min(i + batchSize, toValidate.length) }));
        }
      }
      
      toast.success('Validation complete!');
    } catch (err: any) {
      toast.error(err.message);
    }
    setValidatingId(null);
    setValidationProgress({ current: 0, total: 0 });
  }

  const filtered = contacts;

  return (
    <div className="p-4 md:p-8 min-h-screen pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold text-foreground flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Contacts</h1>
          <p className="text-muted-foreground mt-1">{total} contacts total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button 
            onClick={async () => {
              if (user) {
                await loadData(user.id);
                toast.success('Contacts data refreshed');
              }
            }}
            className="btn-icon"
            title="Refresh"
          >
            <RotateCcw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleBulkValidate} 
            disabled={validatingId !== null || contacts.length === 0}
            className="btn-secondary text-primary min-w-[180px]"
          >
            {validatingId === 'bulk' ? (
              <>
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-2"/>
                <span>{validationProgress.total > 0 ? `${validationProgress.current}/${validationProgress.total}` : 'Checking...'}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                <span>Validate</span>
              </>
            )}
          </button>
          <button onClick={handleExportContacts} className="btn-secondary">
            <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" /> 
            <span className="whitespace-nowrap">Export</span>
          </button>
          <button onClick={downloadSampleCSV} className="btn-secondary border-dashed">
            <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" /> 
            <span className="whitespace-nowrap">Sample</span>
          </button>
          <input type="file" ref={fileRef} accept=".xlsx,.csv" className="hidden" onChange={handleImportCSV} />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary">
            <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" /> 
            <span className="whitespace-nowrap">Import</span>
          </button>
          <button onClick={() => setShowGroupsModal(true)} className="btn-secondary bg-primary/5 text-primary border-primary/20 hover:bg-primary/10">
            <Users className="w-4 h-4 md:w-5 md:h-5 mr-2" /> 
            <span className="whitespace-nowrap">Groups</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" /> 
            <span className="whitespace-nowrap">Add Contact</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." className="input-standard pl-10" />
        </div>
        <CustomSelect
          value={filterGroup} 
          onChange={setFilterGroup}
          options={[
            { value: 'all', label: 'All Groups' },
            { value: 'ungrouped', label: 'Ungrouped' },
            ...groups.map(g => ({ value: g.id, label: g.name }))
          ]}
          className="min-w-[200px]"
        />
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95">
            <h2 className="text-lg font-semibold text-foreground mb-5">Add Contact</h2>
            <form onSubmit={handleAddContact} className="space-y-4">
              {[['Name', 'name', 'text', 'John Doe'], ['Phone', 'phone', 'tel', '+8801XXXXXXXX'], ['Email', 'email', 'email', 'john@email.com'], ['Tags (comma separated)', 'tags', 'text', 'VIP, Retail']].map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-foreground mb-1 block">{label}</label>
                  <input type={type} required={key === 'name' || key === 'phone'} placeholder={placeholder}
                    value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="input-standard focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <CustomSelect
                  label="Group (Optional)"
                  value={form.groupId}
                  onChange={(val) => setForm(p => ({ ...p, groupId: val }))}
                  options={[
                    { value: '', label: 'No Group' },
                    ...groups.map(g => ({ value: g.id, label: g.name }))
                  ]}
                  placeholder="Select Group"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Management Modal */}
      {showGroupsModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95">
            <h2 className="text-lg font-semibold text-foreground mb-5">Manage Contact Groups</h2>
            
            <form onSubmit={handleSaveGroup} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="New group name..." 
                value={groupForm.name}
                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <button disabled={groupSaving} type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-50">
                {groupForm.id ? 'Save Edit' : 'Create'}
              </button>
              {groupForm.id && (
                <button type="button" onClick={() => setGroupForm({ id: '', name: '' })} className="bg-secondary text-muted-foreground px-3 rounded-xl border border-border text-sm hover:text-foreground">✕</button>
              )}
            </form>

            <div className="max-h-[300px] overflow-y-auto space-y-2 mb-6">
              {groups.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No groups created yet.</p>
              ) : groups.map(g => {
                const memberCount = contacts.filter(c => c.group_id === g.id).length;
                return (
                  <div key={g.id} className="flex items-center justify-between bg-secondary/50 border border-border p-3 rounded-xl">
                    <div>
                      <span className="text-foreground text-sm font-medium">{g.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{memberCount} contacts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setGroupForm({ id: g.id, name: g.name })} className="text-muted-foreground hover:text-primary text-xs font-medium px-2 py-1">Edit</button>
                      <button 
                        onClick={() => handleDeleteGroupContacts(g.id, g.name)} 
                        disabled={memberCount === 0}
                        title="Delete all contacts in this group"
                        className="text-muted-foreground hover:text-orange-500 text-xs font-medium px-2 py-1 disabled:opacity-30"
                      >
                        🗑 Members
                      </button>
                      <button onClick={() => handleDeleteGroup(g.id)} className="text-muted-foreground hover:text-destructive text-xs font-medium px-2 py-1">Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => { setShowGroupsModal(false); setGroupForm({ id: '', name: '' }); }} className="w-full bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-xl py-2.5 transition">
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mt-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead><tr className="border-b border-border bg-secondary/30">
              {['Name', 'Phone', 'WA Status', 'Activity', 'Tags', 'Group', ''].map(h => <th key={h} className="text-left px-5 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading contacts...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground italic">No contacts found for this filter.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/50 transition">
                  {/* ... row cells ... */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                        {c.profile_pic ? (
                          <img src={c.profile_pic} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-semibold text-sm">{c.name ? c.name.charAt(0).toUpperCase() : '?'}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{c.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-foreground font-mono text-xs">{c.phone}</td>
                  <td className="px-5 py-4">
                    {c.is_wa_valid === true || c.is_wa_valid === 1 ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 w-fit">
                        <ShieldCheck className="w-3 h-3" /> Valid
                      </div>
                    ) : c.is_wa_valid === false || c.is_wa_valid === 0 ? (
                      <div className="flex items-center gap-1.5 text-destructive text-[10px] font-semibold uppercase tracking-wider bg-destructive/10 px-2 py-1 rounded-lg border border-destructive/20 w-fit">
                        <ShieldAlert className="w-3 h-3" /> Invalid
                      </div>
                    ) : (
                      <button 
                        disabled={validatingId !== null}
                        onClick={() => handleValidate(c.id)}
                        className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider hover:text-primary transition group w-fit px-2 py-1"
                      >
                        {validatingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 group-hover:fill-current" />}
                        <span>Validate</span>
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs text-foreground font-medium">
                      {c.messages_sent_count || 0} msgs
                    </div>
                    {c.last_messaged_at && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Last: {new Date(c.last_messaged_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4"><div className="flex gap-1 flex-wrap">{(typeof c.tags === 'string' ? JSON.parse(c.tags) : (c.tags || [])).map((t: string) => <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-medium">{t}</span>)}</div></td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">{groups.find(g => g.id === c.group_id)?.name || '—'}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-6 bg-secondary/20 border-t border-border gap-4">
            <div className="text-xs text-muted-foreground order-2 md:order-1 font-medium">
              Showing <span className="text-foreground">{(page - 1) * 50 + 1}</span> to <span className="text-foreground">{Math.min(page * 50, total)}</span> of <span className="text-foreground">{total}</span> contacts
            </div>
            
            <div className="flex items-center gap-1.5 order-1 md:order-2">
              {/* First Page */}
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(1)}
                className="w-9 h-9 flex items-center justify-center bg-background border border-border text-foreground rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-background transition shadow-sm"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="w-9 h-9 flex items-center justify-center bg-background border border-border text-foreground rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-background transition shadow-sm"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Numbers */}
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let start = Math.max(1, page - 2);
                let end = Math.min(totalPages, start + maxVisible - 1);
                
                if (end - start < maxVisible - 1) {
                  start = Math.max(1, end - maxVisible + 1);
                }

                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition shadow-sm ${
                        page === i 
                          ? 'bg-primary text-primary-foreground border-transparent' 
                          : 'bg-background border border-border text-foreground hover:bg-secondary'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}

              {/* Next Page */}
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => p + 1)}
                className="w-9 h-9 flex items-center justify-center bg-background border border-border text-foreground rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-background transition shadow-sm"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(totalPages)}
                className="w-9 h-9 flex items-center justify-center bg-background border border-border text-foreground rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-background transition shadow-sm"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
