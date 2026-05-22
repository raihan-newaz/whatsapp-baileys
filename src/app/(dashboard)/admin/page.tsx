'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import {
  Shield, Plus, Trash2, Ban, CheckCircle, Edit3, X, Loader2,
  UserCheck, UserX, Users, Search, Crown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CustomSelect } from '@/components/ui/CustomSelect';


const ROLES = ['user', 'admin'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<string[]>(['free_trial', 'pro', 'enterprise', 'admin']);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState('');
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'user', plan: 'free_trial' });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      try {
        const p = await apiFetch(`/api/profiles/${data.user.id}`);
        if (p?.role !== 'admin') { router.push('/dashboard'); return; }
        fetchUsers();
        fetchPlans();
      } catch (err: any) {
        console.error('Failed to check admin status:', err);
        router.push('/dashboard');
      }
    });
  }, []);

  async function fetchPlans() {
    try {
      const data = await apiFetch('/api/admin/settings');
      if (data.settings?.billing_limits) {
        setPlans(Object.keys(data.settings.billing_limits));
      }
    } catch (e) {
      console.error('Failed to fetch plans:', e);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(data.users || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading('create');
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setShowAddModal(false);
      setForm({ email: '', password: '', full_name: '', role: 'user', plan: 'free_trial' });
      fetchUsers();
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading('edit');
    try {
      await apiFetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editUser.role, plan: editUser.plan, full_name: editUser.full_name }),
      });
      setEditUser(null);
      fetchUsers();
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  }

  async function handleBan(user: any) {
    setActionLoading(`ban-${user.id}`);
    try {
      if (user.banned) {
        await apiFetch(`/api/admin/users/${user.id}/unban`, { method: 'POST' });
      } else {
        await apiFetch(`/api/admin/users/${user.id}/ban`, { method: 'POST' });
      }
      fetchUsers();
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  }

  async function handleDelete(user: any) {
    setActionLoading(`del-${user.id}`);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchUsers();
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const planColor: any = { 
    free: 'bg-secondary text-muted-foreground', 
    free_trial: 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20 font-semibold',
    pro: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20', 
    enterprise: 'bg-purple-500/10 text-purple-600 dark:text-purple-500 border border-purple-500/20',
    admin: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20 font-semibold'
  };

  const getPlanStyle = (p: string) => planColor[p] || 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20';
  const roleColor: any = { admin: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20', user: 'bg-secondary text-muted-foreground' };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage all platform users, their roles, and subscription plans</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Add New User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4 group hover:border-primary/30 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-semibold text-foreground">{users.length}</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4 group hover:border-yellow-500/30 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Crown className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admins</p>
            <p className="text-2xl font-semibold text-foreground">{users.filter(u => u.role === 'admin').length}</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4 group hover:border-destructive/30 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Ban className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banned</p>
            <p className="text-2xl font-semibold text-foreground">{users.filter(u => u.banned).length}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-6 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-input rounded-xl pl-11 pr-4 py-2.5 text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Fetching users...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground font-medium">No users found matching your search.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/30 border-b border-border">
                  <th className="py-4 px-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">User</th>
                  <th className="py-4 px-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Role</th>
                  <th className="py-4 px-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Plan</th>
                  <th className="py-4 px-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Joined</th>
                  <th className="py-4 px-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="py-4 px-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(user => (
                  <tr key={user.id} className={`hover:bg-muted/50 transition-colors ${user.banned ? 'opacity-70 bg-secondary/50' : ''}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-semibold shadow-sm">
                          {(user.full_name || user.email)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.full_name || 'No Name Set'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-tight ${roleColor[user.role] || roleColor.user}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-tight ${getPlanStyle(user.plan)}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground font-medium">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-6">
                      {user.banned ? (
                        <span className="text-[10px] text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 uppercase tracking-tight">
                          <UserX className="w-3 h-3" /> Banned
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 uppercase tracking-tight">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditUser({ ...user })} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Edit Profile">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleBan(user)} disabled={actionLoading === `ban-${user.id}`} className="p-2 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-all" title={user.banned ? 'Unban User' : 'Ban User'}>
                          {actionLoading === `ban-${user.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : user.banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setDeleteConfirm(user)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Delete User">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in">
          <div className="bg-card border border-border shadow-xl rounded-2xl p-8 w-full max-w-lg animate-in zoom-in-95 group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Add New User</h3>
                  <p className="text-xs text-muted-foreground">Create a new platform user account</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {[
                { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'e.g. John Smith' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'name@example.com' },
                { label: 'Account Password', key: 'password', type: 'password', placeholder: 'Min. 8 characters' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required
                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-all placeholder:text-muted-foreground"
                  />
                </div>
              ))}
              
              <div className="grid grid-cols-2 gap-4">
                <CustomSelect
                  label="Account Role"
                  value={form.role}
                  onChange={(val) => setForm(p => ({ ...p, role: val }))}
                  options={ROLES.map(r => ({ value: r, label: r.toUpperCase() }))}
                />
                <CustomSelect
                  label="Subscription Plan"
                  value={form.plan}
                  onChange={(val) => setForm(p => ({ ...p, plan: val }))}
                  options={plans.map(p => ({ value: p, label: p.toUpperCase() }))}
                />
              </div>
              
              <div className="pt-4">
                <button type="submit" disabled={actionLoading === 'create'} className="btn-primary w-full">
                  {actionLoading === 'create' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  {actionLoading === 'create' ? 'Creating User...' : 'Add Account Perfectly'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border shadow-xl rounded-2xl p-8 w-full max-w-lg animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Update Account</h3>
                  <p className="text-xs text-muted-foreground">Modify user profile and permissions</p>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Account Email</label>
                <input value={editUser.email} disabled className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-muted-foreground text-sm cursor-not-allowed" />
                <p className="text-[10px] text-muted-foreground italic">Email cannot be changed for security reasons</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Full Name</label>
                <input 
                  value={editUser.full_name || ''} 
                  onChange={e => setEditUser((u: any) => ({ ...u, full_name: e.target.value }))} 
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-all" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CustomSelect
                  label="Role"
                  value={editUser.role}
                  onChange={(val) => setEditUser((u: any) => ({ ...u, role: val }))}
                  options={ROLES.map(r => ({ value: r, label: r.toUpperCase() }))}
                />
                <CustomSelect
                  label="Plan"
                  value={editUser.plan}
                  onChange={(val) => setEditUser((u: any) => ({ ...u, plan: val }))}
                  options={plans.map(p => ({ value: p, label: p.toUpperCase() }))}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={actionLoading === 'edit'} className="btn-primary flex-[2]">
                  {actionLoading === 'edit' ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-2" /> : <Edit3 className="w-4 h-4 md:w-5 md:h-5 mr-2" />}
                  Save All Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">Delete Account?</h3>
                <p className="text-sm text-muted-foreground mt-2 px-2">
                  This action is <strong className="text-destructive font-semibold uppercase tracking-tighter">permanent</strong>. All data associated with <span className="font-semibold text-foreground">{deleteConfirm.email}</span> will be lost forever.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button 
                onClick={() => handleDelete(deleteConfirm)} 
                disabled={actionLoading === `del-${deleteConfirm.id}`} 
                className="btn-primary !bg-destructive hover:!bg-destructive/90 flex-1"
              >
                {actionLoading === `del-${deleteConfirm.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-center text-zinc-400 text-xs py-8">
        Designed for Excellence · Handcrafted for WaCloud · ©2026
      </p>
    </div>
  );
}
