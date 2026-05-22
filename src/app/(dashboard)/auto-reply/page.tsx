'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { 
  Plus, Search, RefreshCcw, 
  MessageSquare, Smartphone, 
  CheckCircle2, XCircle, Trash2, 
  Edit2, MoreHorizontal, Filter,
  ChevronLeft, ChevronRight, X,
  Clock, AlertCircle, CheckCircle,
  ChevronDown, Sparkles, FolderOpen, Image as ImageIcon,
  Video, FileText as FileDoc
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { CustomSelect } from '@/components/ui/CustomSelect';

const MATCH_TYPES = [
  { value: 'exact', label: 'Exact Match' },
  { value: 'contains', label: 'Contains Keyword' }
];

const REPLY_TYPES = [
  { value: 'text', label: 'Text Message' },
  { value: 'media', label: 'Media Message' },
  { value: 'template', label: 'Template' }
];

const STATUS_FILTER = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export default function AutoReplyPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterDevice, setFilterDevice] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const toast = useToast();

  const fetchRules = async (userId: string) => {
    setRefreshing(true);
    try {
      const query = new URLSearchParams({
        search,
        session_id: filterDevice,
        status: filterStatus
      }).toString();
      
      const data = await apiFetch(`/api/auto-reply/${userId}?${query}`);
      setRules(data || []);
    } catch (err: any) {
      toast.error('Failed to load rules: ' + err.message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchSessions = async (userId: string) => {
    try {
      const data = await apiFetch(`/api/whatsapp/sessions/${userId}`);
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchTemplates = async (userId: string) => {
    try {
      const data = await apiFetch(`/api/templates/${userId}`);
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      fetchSessions(data.user.id);
      fetchTemplates(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchRules(user.id);
    }
  }, [user, search, filterDevice, filterStatus]);

  async function loadGallery() {
    if (!user) return;
    setGalleryLoading(true);
    try {
      const data = await apiFetch(`/api/media/${user.id}`);
      setGalleryMedia(data || []);
    } catch { }
    setGalleryLoading(false);
  }

  function openGallery() { 
    setShowGallery(true); 
    loadGallery(); 
  }

  function pickMedia(item: any) {
    setFormData(p => ({ 
      ...p, 
      media_url: item.url || item.file_url,
      reply_type: 'media'
    }));
    setShowGallery(false);
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await apiFetch(`/api/auto-reply/${id}`, { method: 'DELETE' });
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success('Rule deleted successfully');
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const toggleStatus = async (rule: any) => {
    try {
      const newStatus = rule.is_active ? 0 : 1;
      await apiFetch(`/api/auto-reply/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: newStatus })
      });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: newStatus } : r));
      toast.success(`Rule ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      toast.error('Failed to toggle status: ' + err.message);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    session_id: '',
    name: '',
    trigger_type: 'contains',
    trigger_value: '',
    reply_type: 'text',
    reply_text: '',
    template_id: '',
    media_url: '',
    use_openai: false,
    openai_api_key: '',
    openai_model: 'gpt-3.5-turbo',
    openai_base_url: '',
    openai_system_prompt: '',
    openai_temperature: 0.7,
    openai_max_tokens: '',
    openai_continuous_chat: false,
    use_gemini: false,
    gemini_api_key: '',
    gemini_model: 'gemini-2.5-flash',
    gemini_system_prompt: '',
    reply_delay: 0,
    priority: 0,
    case_sensitive: false,
    is_active: true
  });

  const [submitting, setSubmitting] = useState(false);
  const [showGlobalAiModal, setShowGlobalAiModal] = useState(false);
  const [editingGlobalAi, setEditingGlobalAi] = useState<any>(null);
  const [globalAiData, setGlobalAiData] = useState({
    ai_enabled: false,
    ai_provider: 'google',
    ai_api_key: '',
    ai_prompt: '',
    ai_model: 'gemini-2.5-flash',
    ai_reply_delay: 0
  });
  const [savingGlobalAi, setSavingGlobalAi] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    try {
      const endpoint = editingRule ? `/api/auto-reply/${editingRule.id}` : '/api/auto-reply';
      const method = editingRule ? 'PUT' : 'POST';
      
      await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...formData,
          userId: user.id
        })
      });
      
      toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
      setShowAddModal(false);
      setEditingRule(null);
      fetchRules(user.id);
      
      // Reset form
      setFormData({
        session_id: '',
        name: '',
        trigger_type: 'contains',
        trigger_value: '',
        reply_type: 'text',
        reply_text: '',
        template_id: '',
        media_url: '',
        use_openai: false,
        openai_api_key: '',
        openai_model: 'gpt-3.5-turbo',
        openai_base_url: '',
        openai_system_prompt: '',
        openai_temperature: 0.7,
        openai_max_tokens: '',
        openai_continuous_chat: false,
        use_gemini: false,
        gemini_api_key: '',
        gemini_model: 'gemini-2.5-flash',
        gemini_system_prompt: '',
        reply_delay: 0,
        priority: 0,
        case_sensitive: false,
        is_active: true
      });
    } catch (err: any) {
      toast.error('Failed to save rule: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      session_id: rule.session_id || '',
      name: rule.name || '',
      trigger_type: rule.trigger_type || 'contains',
      trigger_value: rule.trigger_value || rule.keywords || '',
      reply_type: rule.reply_type || 'text',
      reply_text: rule.reply_text || '',
      template_id: rule.template_id || '',
      media_url: rule.media_url || '',
      use_openai: !!rule.use_openai,
      openai_api_key: rule.openai_api_key || '',
      openai_model: rule.openai_model || 'gpt-3.5-turbo',
      openai_base_url: rule.openai_base_url || '',
      openai_system_prompt: rule.openai_system_prompt || '',
      openai_temperature: rule.openai_temperature || 0.7,
      openai_max_tokens: rule.openai_max_tokens || '',
      openai_continuous_chat: !!rule.openai_continuous_chat,
      use_gemini: !!rule.use_gemini,
      gemini_api_key: rule.gemini_api_key || '',
      gemini_model: rule.gemini_model || 'gemini-1.5-flash',
      gemini_system_prompt: rule.gemini_system_prompt || '',
      reply_delay: rule.reply_delay || 0,
      priority: rule.priority || 0,
      case_sensitive: !!rule.case_sensitive,
      is_active: !!rule.is_active
    });
    setShowAddModal(true);
  };
  const handleOpenGlobalAi = (session: any) => {
    setEditingGlobalAi(session);
    setGlobalAiData({
      ai_enabled: !!session.ai_enabled,
      ai_provider: session.ai_provider || 'google',
      ai_api_key: session.ai_api_key || '',
      ai_prompt: session.ai_prompt || '',
      ai_model: session.ai_model || 'gemini-1.5-flash',
      ai_reply_delay: session.ai_reply_delay || 0
    });
    setShowGlobalAiModal(true);
  };

  const handleSaveGlobalAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGlobalAi || !user) return;
    setSavingGlobalAi(true);
    try {
      await apiFetch('/api/whatsapp/ai-settings', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: user.id,
          instance_id: editingGlobalAi.id,
          ...globalAiData
        })
      });
      
      setSessions(prev => prev.map(s => s.id === editingGlobalAi.id ? { ...s, ...globalAiData } : s));
      toast.success('Global AI settings updated');
      setShowGlobalAiModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingGlobalAi(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Auto-Reply Rules</h1>
          <p className="text-muted-foreground">Automatically respond to incoming messages based on keywords</p>
        </div>
        <button 
          onClick={() => {
            setEditingRule(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-10 px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rules..."
              autoComplete="off"
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10"
            />
          </div>
        </div>
        
        <CustomSelect
          value={filterDevice}
          onChange={setFilterDevice}
          options={[
            { value: 'all', label: 'All Devices' },
            ...sessions.map(s => ({ value: s.id, label: s.session_name || s.name, icon: <Smartphone className="w-4 h-4" /> }))
          ]}
          className="w-[200px]"
          triggerClassName=""
        />
        
        <CustomSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={STATUS_FILTER}
          className="w-[150px]"
          triggerClassName=""
        />
      </div>

      {/* Global AI Assistant Section (Always visible) */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Global AI Assistant</h2>
              <p className="text-sm text-muted-foreground">AI acts as a fallback responder for any message that doesn't match specific rules.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between group hover:border-primary/40 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[100px]">{session.session_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${session.ai_enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground'}`}>
                          {session.ai_enabled ? 'Active' : 'Off'}
                      </span>
                    </div>
                </div>
                <button 
                  onClick={() => handleOpenGlobalAi(session)}
                  className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-all opacity-0 group-hover:opacity-100"
                  title="Configure AI Assistant"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-lg shadow-sm">
          <RefreshCcw className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-medium">Fetching your rules...</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No auto-reply rules</h3>
            <p className="text-muted-foreground text-center mb-4">Create your first auto-reply rule to automatically respond to incoming messages</p>
            <button 
              onClick={() => {
                setEditingRule(null);
                setShowAddModal(true);
              }}
              className="btn-primary h-10 px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rules.map((rule) => (
            <div 
              key={rule.id}
              className="bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rule.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'}`}>
                  <RefreshCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base tracking-tight">{rule.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-bold uppercase tracking-wider">
                      {rule.trigger_type || rule.match_type}
                    </span>
                    <p className="text-xs text-muted-foreground font-medium">
                      Keywords: <span className="text-foreground">{rule.trigger_value || rule.keywords}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="hidden md:block text-right">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter mb-1">Reply Type</p>
                  <span className="text-sm font-semibold text-foreground bg-secondary/50 px-2.5 py-1 rounded-lg">
                    {rule.reply_type === 'text' ? '📝 Text' : rule.reply_type === 'media' ? '🖼️ Media' : '📄 Template'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleStatus(rule)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] uppercase tracking-wider
                      ${rule.is_active 
                        ? 'bg-emerald-50/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10' 
                        : 'bg-orange-50/10 border-orange-500/20 text-orange-600 hover:bg-orange-500/10'}`}
                  >
                    {rule.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </button>
                  
                  <div className="h-8 w-px bg-border/60 mx-1" />
                  
                  <button 
                    onClick={() => handleEdit(rule)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setShowAddModal(false)}></div>
          <div role="dialog" className="relative z-50 grid w-full max-w-2xl max-h-[90vh] overflow-y-auto gap-4 border bg-background p-6 shadow-lg sm:rounded-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left pr-8">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {editingRule ? 'Edit Auto-Reply Rule' : 'Create Auto-Reply Rule'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editingRule ? 'Update your auto-reply rule configuration' : 'Create a new auto-reply rule to automatically respond to messages'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="device_id">Device *</label>
                  <CustomSelect
                    value={formData.session_id}
                    onChange={(val) => setFormData({ ...formData, session_id: val })}
                    options={sessions.map(s => ({ value: s.id, label: s.session_name || s.name, icon: <Smartphone className="w-4 h-4" /> }))}
                    placeholder="Select device"
                    triggerClassName=""
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="name">Rule Name *</label>
                  <input 
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    id="rule_name_inp" 
                    name="rule_name_inp"
                    placeholder="e.g., Welcome Message" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoComplete="one-time-code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="trigger_type">Trigger Type *</label>
                  <CustomSelect
                    value={formData.trigger_type}
                    onChange={(val) => setFormData({ ...formData, trigger_type: val })}
                    options={[
                      { value: 'exact_match', label: 'Exact Match' },
                      { value: 'contains', label: 'Contains' },
                      { value: 'starts_with', label: 'Starts With' },
                      { value: 'ends_with', label: 'Ends With' },
                      { value: 'regex', label: 'Regex' }
                    ]}
                    triggerClassName=""
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="trigger_value">Trigger Value *</label>
                  <input 
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    id="rule_trigger_val" 
                    name="rule_trigger_val"
                    placeholder={(formData.use_openai || formData.use_gemini) ? "e.g., Hello, Hi, Help, or * for all messages" : "e.g., Hello, Hi, Help"} 
                    required 
                    value={formData.trigger_value}
                    onChange={(e) => setFormData({ ...formData, trigger_value: e.target.value })}
                    autoComplete="one-time-code"
                  />
                  {(formData.use_openai || formData.use_gemini) && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      Use <strong className="text-foreground">*</strong> (asterisk) as a wildcard to match all messages for AI-powered responses
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="message_type">Message Type *</label>
                  <CustomSelect
                    value={formData.reply_type}
                    onChange={(val) => setFormData({ ...formData, reply_type: val })}
                    options={[
                      { value: 'text', label: 'Text Message' },
                      { value: 'media', label: 'Media Message' },
                      { value: 'template', label: 'Template' }
                    ]}
                    triggerClassName=""
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="reply_delay">Reply Delay (Seconds)</label>
                  <input 
                    type="number"
                    min="0"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    id="reply_delay" 
                    placeholder="0" 
                    value={formData.reply_delay}
                    onChange={(e) => setFormData({ ...formData, reply_delay: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {formData.reply_type === 'template' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="template_id">Message Template *</label>
                  <CustomSelect
                    value={formData.template_id}
                    onChange={(val) => setFormData({ ...formData, template_id: val })}
                    options={templates.map(t => ({ value: t.id, label: t.name }))}
                    placeholder="Select a template"
                    triggerClassName=""
                  />
                </div>
              )}

              {formData.reply_type === 'media' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="media_url">Media URL *</label>
                  <div className="flex gap-2">
                    <input 
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      id="media_url" 
                      placeholder="https://example.com/image.jpg" 
                      value={formData.media_url}
                      onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                      autoComplete="off"
                    />
                    <button 
                      type="button"
                      onClick={openGallery}
                      className="h-10 px-3 bg-secondary border border-border rounded-xl text-foreground hover:bg-secondary/80 transition flex items-center gap-2 shrink-0"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Gallery
                    </button>
                  </div>
                  {formData.media_url && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-border bg-secondary/30 aspect-video max-h-40 flex items-center justify-center">
                      <img 
                        src={formData.media_url} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const icon = document.createElement('div');
                            icon.innerHTML = 'Invalid Image URL';
                            icon.className = 'text-xs text-muted-foreground';
                            parent.appendChild(icon);
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, media_url: '' }))}
                        className="absolute top-2 right-2 bg-background/90 border border-border p-1 rounded-lg hover:bg-secondary transition shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="reply_message">
                  {formData.reply_type === 'media' ? 'Caption (Optional)' : 'Reply Message *'}
                </label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  id="reply_message" 
                  disabled={formData.use_openai || formData.use_gemini}
                  placeholder={(formData.use_openai || formData.use_gemini) ? "Message will be generated by AI" : (formData.reply_type === 'media' ? "Optional caption for the media..." : "Enter the auto-reply message...")} 
                  rows={3}
                  value={formData.reply_text}
                  onChange={(e) => setFormData({ ...formData, reply_text: e.target.value })}
                  required={!formData.use_openai && !formData.use_gemini && formData.reply_type === 'text'}
                />
              </div>

              {/* AI Section with more visible borders */}
              <div className="space-y-4 p-4 border-2 rounded-lg bg-blue-50/20 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                      <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-bold cursor-pointer" htmlFor="use_openai">Use OpenAI for Responses</label>
                        <span className="inline-flex items-center rounded-full border border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-900 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">AI Powered</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Generate AI-powered responses using OpenAI-compatible API</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    role="switch" 
                    aria-checked={formData.use_openai} 
                    onClick={() => setFormData({ ...formData, use_openai: !formData.use_openai })}
                    className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formData.use_openai ? 'bg-primary' : 'bg-input'}`}
                  >
                    <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.use_openai ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                {formData.use_openai && (
                  <div className="space-y-4 pt-4 border-t border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="openai_api_key">API Key *</label>
                        <input 
                          type="password" 
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                          id="openai_api_key" 
                          placeholder="sk-..." 
                          required={formData.use_openai}
                          value={formData.openai_api_key}
                          onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="openai_model">Model</label>
                        <CustomSelect
                          value={formData.openai_model}
                          onChange={(val) => setFormData({ ...formData, openai_model: val })}
                          options={[
                            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Default)' },
                            { value: 'gpt-4o', label: 'GPT-4o (Omni)' },
                            { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
                          ]}
                          triggerClassName=""
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none" htmlFor="openai_base_url">Base URL (Optional)</label>
                      <input 
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                        id="openai_base_url" 
                        placeholder="https://api.openai.com/v1 (default)" 
                        value={formData.openai_base_url}
                        onChange={(e) => setFormData({ ...formData, openai_base_url: e.target.value })}
                        autoComplete="off"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">Leave empty for OpenAI, or use your OpenAI-compatible API endpoint</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none" htmlFor="openai_system_prompt">System Prompt (Optional)</label>
                      <textarea 
                        className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                        id="openai_system_prompt" 
                        placeholder="You are a helpful assistant.." 
                        rows={3}
                        value={formData.openai_system_prompt}
                        onChange={(e) => setFormData({ ...formData, openai_system_prompt: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Gemini AI Section with forest green borders */}
              <div className="space-y-4 p-4 border-2 rounded-lg bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                      <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-bold cursor-pointer" htmlFor="use_gemini">Use Gemini for Responses</label>
                        <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Google AI</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Generate AI-powered responses using Google Gemini API</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    role="switch" 
                    aria-checked={formData.use_gemini} 
                    onClick={() => setFormData({ ...formData, use_gemini: !formData.use_gemini, use_openai: false })}
                    className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formData.use_gemini ? 'bg-primary' : 'bg-input'}`}
                  >
                    <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.use_gemini ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>

                {formData.use_gemini && (
                  <div className="space-y-4 pt-4 border-t border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="gemini_api_key">Gemini API Key *</label>
                        <input 
                          type="password" 
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                          id="gemini_api_key" 
                          placeholder="Enter your Google AI API key" 
                          required={formData.use_gemini}
                          value={formData.gemini_api_key}
                          onChange={(e) => setFormData({ ...formData, gemini_api_key: e.target.value })}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="gemini_model">Gemini Model</label>
                        <CustomSelect
                          value={formData.gemini_model}
                          onChange={(val) => setFormData({ ...formData, gemini_model: val })}
                          options={[
                            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default)' },
                            { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
                            { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
                            { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
                            { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
                            { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                            { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
                          ]}
                          triggerClassName=""
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none" htmlFor="gemini_system_prompt">System Prompt (Optional)</label>
                      <textarea 
                        className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                        id="gemini_system_prompt" 
                        placeholder="You are a helpful assistant.." 
                        rows={3}
                        value={formData.gemini_system_prompt}
                        onChange={(e) => setFormData({ ...formData, gemini_system_prompt: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="openai_temperature">Temperature</label>
                        <input 
                          type="number" 
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                          id="openai_temperature" 
                          min="0" 
                          max="2" 
                          step="0.1" 
                          value={formData.openai_temperature}
                          onChange={(e) => setFormData({ ...formData, openai_temperature: parseFloat(e.target.value) })}
                          autoComplete="off"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">0.0 - 2.0 (default: 0.7)</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="openai_max_tokens">Max Tokens (Optional)</label>
                        <input 
                          type="number" 
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                          id="openai_max_tokens" 
                          min="1" 
                          max="4000" 
                          placeholder="Leave empty for default"
                          value={formData.openai_max_tokens}
                          onChange={(e) => setFormData({ ...formData, openai_max_tokens: e.target.value })}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        <span className="font-bold">Note:</span> When OpenAI is enabled, the <span className="font-bold">"Reply Message"</span> field above will be used as a fallback if AI generation fails.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex-1 pr-4">
                        <label className="text-sm font-bold cursor-pointer" htmlFor="openai_continuous_chat">Continuous AI Chat</label>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">AI will continue responding to all messages until a human sends a message. This creates a natural conversation flow.</p>
                      </div>
                      <button 
                        type="button" 
                        role="switch" 
                        aria-checked={formData.openai_continuous_chat} 
                        onClick={() => setFormData({ ...formData, openai_continuous_chat: !formData.openai_continuous_chat })}
                        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formData.openai_continuous_chat ? 'bg-primary' : 'bg-input'}`}
                      >
                        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.openai_continuous_chat ? 'translate-x-5' : 'translate-x-0'}`}></span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="priority">Priority (0-100)</label>
                  <input 
                    type="number" 
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-[#085E4D] focus:border-2 focus:ring-2 focus:ring-[#085E4D]/10 transition-all" 
                    id="priority" 
                    min="0" 
                    max="100" 
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Higher priority rules are checked first</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none mb-2 block">Case Sensitive</label>
                  <div className="flex items-center space-x-3 h-10">
                    <button 
                      type="button" 
                      role="switch" 
                      aria-checked={formData.case_sensitive} 
                      onClick={() => setFormData({ ...formData, case_sensitive: !formData.case_sensitive })}
                      className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formData.case_sensitive ? 'bg-primary' : 'bg-input'}`}
                      id="case_sensitive"
                    >
                      <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.case_sensitive ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                    <label className="text-sm cursor-pointer select-none" htmlFor="case_sensitive">Match case exactly</label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 py-2">
                <button 
                  type="button" 
                  role="switch" 
                  aria-checked={formData.is_active} 
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formData.is_active ? 'bg-[#007b7b]' : 'bg-input'}`}
                  id="is_active"
                >
                  <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.is_active ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
                <label className="text-sm font-bold cursor-pointer select-none" htmlFor="is_active">Active</label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 mt-2 sm:mt-0"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-10 px-4 py-2 disabled:opacity-50"
                >
                  {submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : null}
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>

            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      )}

      {/* Global AI Assistant Modal */}
      {/* Gallery Picker Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Select from Media Gallery</h2>
              <button 
                type="button"
                onClick={() => setShowGallery(false)} 
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {galleryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCcw className="animate-spin w-8 h-8 text-primary" />
                </div>
              ) : galleryMedia.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No media files found. Upload files in Media Gallery first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galleryMedia.map((item: any) => (
                    <button 
                      key={item.id} 
                      type="button"
                      onClick={() => pickMedia(item)} 
                      className="aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-primary transition group relative bg-secondary"
                    >
                      {(item.type || item.media_type) === 'image' ? (
                        <img 
                          src={item.url || item.file_url} 
                          alt={item.filename} 
                          className="w-full h-full object-cover group-hover:scale-105 transition" 
                        />
                      ) : (item.type || item.media_type) === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileDoc className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition flex items-center justify-center">
                        <div className="bg-primary text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-background/80 backdrop-blur-sm border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] font-medium truncate">{item.filename}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border bg-secondary/10 text-center">
              <p className="text-xs text-muted-foreground">
                Showing all files from your media library.
              </p>
            </div>
          </div>
        </div>
      )}

      {showGlobalAiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setShowGlobalAiModal(false)}></div>
          <div role="dialog" className="relative z-50 grid w-full max-w-xl max-h-[90vh] overflow-y-auto gap-4 border bg-background p-6 shadow-lg sm:rounded-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left pr-8">
              <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Global AI Assistant: {editingGlobalAi?.session_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure the AI that responds when no specific rules match a message.
              </p>
            </div>

            <form onSubmit={handleSaveGlobalAi} className="space-y-4">
              <div className="flex items-center space-x-3 py-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <button 
                  type="button" 
                  role="switch" 
                  aria-checked={globalAiData.ai_enabled} 
                  onClick={() => setGlobalAiData({ ...globalAiData, ai_enabled: !globalAiData.ai_enabled })}
                  className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${globalAiData.ai_enabled ? 'bg-primary' : 'bg-input'}`}
                >
                  <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${globalAiData.ai_enabled ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
                <div className="flex flex-col">
                  <label className="text-sm font-bold cursor-pointer select-none">Enable AI Assistant</label>
                  <p className="text-[11px] text-muted-foreground">When enabled, AI will act as a fallback responder.</p>
                </div>
              </div>

              {globalAiData.ai_enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">AI Provider</label>
                      <CustomSelect
                        value={globalAiData.ai_provider}
                        onChange={(val) => setGlobalAiData({ ...globalAiData, ai_provider: val })}
                        options={[
                          { value: 'google', label: 'Google AI (Gemini)' },
                          { value: 'openai', label: 'OpenAI (GPT)' }
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">AI Model</label>
                      <CustomSelect
                        value={globalAiData.ai_model}
                        onChange={(val) => setGlobalAiData({ ...globalAiData, ai_model: val })}
                        options={globalAiData.ai_provider === 'google' ? [
                          { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default)' },
                          { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
                          { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
                          { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
                          { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
                          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
                        ] : [
                          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                          { value: 'gpt-4o', label: 'GPT-4o' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">API Key</label>
                      <input 
                        type="password"
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus:border-primary transition-all"
                        placeholder="Enter your API Key"
                        value={globalAiData.ai_api_key}
                        onChange={(e) => setGlobalAiData({ ...globalAiData, ai_api_key: e.target.value })}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reply Delay (Seconds)</label>
                      <input 
                        type="number"
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus:border-primary transition-all"
                        placeholder="0"
                        min="0"
                        value={globalAiData.ai_reply_delay}
                        onChange={(e) => setGlobalAiData({ ...globalAiData, ai_reply_delay: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instructions (System Prompt)</label>
                    <textarea 
                      className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus:border-primary transition-all"
                      placeholder="e.g., You are a helpful sales assistant for our bakery..."
                      value={globalAiData.ai_prompt}
                      onChange={(e) => setGlobalAiData({ ...globalAiData, ai_prompt: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowGlobalAiModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingGlobalAi}
                  className="btn-primary"
                >
                  {savingGlobalAi ? <RefreshCcw className="w-4 h-4 animate-spin" /> : null}
                  Save Settings
                </button>
              </div>
            </form>

            <button 
              onClick={() => setShowGlobalAiModal(false)}
              className="absolute right-4 top-4 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
