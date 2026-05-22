'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, MessageSquare, Phone, Info, X, ChevronDown, 
  Settings, Smartphone, LayoutDashboard, Search, Bell, Menu,
  MoreHorizontal, Copy, Check, Power, Send, Trash2, Edit2, Play, Pause, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase';

const PROVIDERS = ['GreenWeb', 'eSMS (Diana Host)', 'BulkSMSBD', 'Alpha SMS'];

const PROVIDER_CONFIGS: Record<string, any[]> = {
  'GreenWeb': [
    { key: 'token', label: 'API Token', type: 'password', placeholder: 'Enter GreenWeb API Token', note: 'Get it from your GreenWeb panel' }
  ],
  'eSMS (Diana Host)': [
    { key: 'token', label: 'API Key (Bearer Token)', type: 'password', placeholder: 'Enter Bearer Token', note: 'Your eSMS API Token' },
    { key: 'senderId', label: 'Sender ID', type: 'text', placeholder: 'Enter Sender ID', note: 'Approved Sender ID' }
  ],
  'BulkSMSBD': [
    { key: 'token', label: 'API Key', type: 'password', placeholder: 'Enter BulkSMSBD API Key', note: 'Get it from BulkSMSBD panel' },
    { key: 'senderId', label: 'Sender ID', type: 'text', placeholder: 'Enter Sender ID', note: 'Approved Sender ID' }
  ],
  'Alpha SMS': [
    { key: 'token', label: 'API Key', type: 'password', placeholder: 'Enter Alpha SMS API Key', note: 'Get it from Alpha SMS panel' }
  ]
};

interface Gateway {
  id: string;
  name: string;
  provider: string;
  subProvider?: string;
  status: 'active' | 'inactive';
  isDefault?: boolean;
  config?: Record<string, string>;
}

export default function SmsGatewaysPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [gatewayName, setGatewayName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [editName, setEditName] = useState('');
  const [editFormData, setEditFormData] = useState<Record<string, string>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean; type?: 'success' | 'error' }>({ title: '', message: '', visible: false });
  const [showSendTestModal, setShowSendTestModal] = useState(false);
  const [testGateway, setTestGateway] = useState<Gateway | null>(null);
  const [testPhone, setTestPhone] = useState('+8801');
  const [testMessage, setTestMessage] = useState('Test SMS from WA Cloud');
  const menuRef = useRef<HTMLDivElement>(null);

  const [gateways, setGateways] = useState<Gateway[]>([]);

  const fetchGateways = async (uId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/sms/gateways/${uId}`);
      if (res.success) setGateways(res.gateways);
    } catch (err) {
      console.error('Failed to fetch gateways:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchGateways(data.user.id);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddGateway = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setGatewayName('');
    setSelectedProvider('');
    setShowProviderDropdown(false);
    setFormData({});
  };

  const handleEdit = (gateway: Gateway) => {
    setEditingGateway(gateway);
    setEditName(gateway.name);
    setEditFormData(gateway.config || {}); // Initialize with current config
    setShowEditModal(true);
    setActiveMenuId(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingGateway(null);
    setEditName('');
    setEditFormData({});
    setShowTokens({});
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied', 'Gateway ID copied to clipboard');
  };

  const showToast = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setToast({ title, message, visible: true, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  };

  const handleSave = async () => {
    if (!userId || !gatewayName || !selectedProvider) return;
    try {
      setLoading(true);
      const res = await apiFetch('/api/sms/gateways', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          name: gatewayName,
          provider: selectedProvider,
          config: formData,
          isDefault: gateways.length === 0
        })
      });
      if (res.success) {
        showToast('Success', 'Gateway created successfully');
        handleCloseModal();
        fetchGateways(userId);
      } else {
        showToast('Failed', res.error || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      console.error('Failed to save gateway:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingGateway) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/sms/gateways/${editingGateway.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          config: editFormData
        })
      });
      if (res.success) {
        showToast('Updated', 'Gateway updated successfully');
        handleCloseEditModal();
        if (userId) fetchGateways(userId);
      } else {
        showToast('Update Failed', res.error || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      console.error('Failed to update gateway:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gateway?')) return;
    try {
      const res = await apiFetch(`/api/sms/gateways/${id}`, { method: 'DELETE' });
      if (res.success && userId) fetchGateways(userId);
    } catch (err) {
      console.error('Failed to delete gateway:', err);
    }
  };

  const handleToggleStatus = async (gateway: Gateway) => {
    const newStatus = gateway.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await apiFetch(`/api/sms/gateways/${gateway.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success && userId) fetchGateways(userId);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!userId) return;
    try {
      const res = await apiFetch(`/api/sms/gateways/${id}/set-default`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      if (res.success) fetchGateways(userId);
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const res = await apiFetch(`/api/sms/gateways/${id}/test`, { method: 'POST' });
      if (res.success) {
        const balance = res.details?.balance || res.details?.[0]?.balance;
        const msg = balance ? `Connection successful. Balance: ${balance}` : 'Connection successful';
        showToast('Connection OK', msg);
      } else {
        showToast('Connection Failed', res.error || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showToast('Connection Failed', err.message, 'error');
    }
  };

  const handleOpenSendTest = (gateway: Gateway) => {
    setTestGateway(gateway);
    setShowSendTestModal(true);
  };

  const handleSendTestSMS = async () => {
    if (!testGateway || !testPhone) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/sms/gateways/${testGateway.id}/send-test`, {
        method: 'POST',
        body: JSON.stringify({ to: testPhone, message: testMessage })
      });
      if (res.success) {
        showToast('Success', 'Test SMS sent successfully');
        setShowSendTestModal(false);
      } else {
        showToast('Failed', res.error || 'Unknown error', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      console.error('Failed to send test SMS:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto pb-20">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            SMS Gateways
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Configure SMS providers for transactional message failover
          </p>
        </div>
        <button
          onClick={handleAddGateway}
          className="flex items-center gap-2 px-4 py-2 bg-[#005a41] hover:bg-[#004a35] text-white rounded-lg font-semibold transition-all shadow-sm active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Gateway
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400 transform rotate-12" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 leading-none">How Transactional Failover Works</h3>
          <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            Call <code className="bg-white/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[11px] text-zinc-800 dark:text-zinc-300">POST /api/v1/customer/send-transactional</code> with both WhatsApp and SMS content. The system tries WhatsApp first. If the device is disconnected, the number isn't on WhatsApp, or sending fails, it automatically sends via your configured SMS gateway.
          </p>
        </div>
      </div>

      {/* Gateway Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {gateways.map((gateway) => (
          <div key={gateway.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{gateway.name}</h3>
                  {gateway.isDefault && (
                    <span className="px-2 py-0.5 bg-transparent text-amber-500 border border-amber-400 text-[10px] font-bold rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <div className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  gateway.provider.includes('eSMS') 
                  ? 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/10'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                }`}>
                  {gateway.provider}
                </div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={(e) => toggleMenu(gateway.id, e)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                
                {activeMenuId === gateway.id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-10 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {[
                      { icon: Edit2, label: 'Edit', onClick: () => handleEdit(gateway) },
                      { icon: Power, label: 'Test Connection', onClick: () => handleTestConnection(gateway.id) },
                      { icon: Send, label: 'Send Test SMS', onClick: () => handleOpenSendTest(gateway) },
                      { icon: Check, label: 'Set as Default', onClick: () => handleSetDefault(gateway.id) },
                      { icon: gateway.status === 'active' ? Pause : Play, label: gateway.status === 'active' ? 'Deactivate' : 'Activate', onClick: () => handleToggleStatus(gateway) },
                      { icon: Trash2, label: 'Delete', color: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10', onClick: () => handleDelete(gateway.id) },
                    ].map((item, idx) => (
                      <button 
                        key={idx}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${item.color || 'text-zinc-600 dark:text-zinc-300'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.onClick) item.onClick();
                          setActiveMenuId(null);
                        }}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${gateway.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                <span className={`text-[12px] font-bold ${gateway.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {gateway.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex items-center gap-1 bg-zinc-50/50 dark:bg-zinc-900/50 px-2 py-1 rounded-lg border border-zinc-100/50 dark:border-zinc-800/50">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tight">ID: {gateway.id.length > 8 ? gateway.id.slice(-4) : gateway.id}</span>
                <button 
                  onClick={() => copyToClipboard(gateway.id)}
                  className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-[#005a41] transition-all"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Branding */}
      <div className="pt-20 pb-10 text-center border-t border-zinc-100 dark:border-zinc-900 mt-20">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 font-medium tracking-wide">
          ©2026 Wa Cloud · Powered by <a href="#" className="text-zinc-500 dark:text-zinc-500 underline underline-offset-2 hover:text-primary transition-colors">Globyn</a> · Made in Bangladesh
        </p>
      </div>

      {/* Add Gateway Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-[480px] rounded-[24px] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Add SMS Gateway</h2>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Configure a new SMS provider for failover messaging.</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Gateway Name</label>
                <input 
                  type="text"
                  placeholder="e.g. My Twilio"
                  value={gatewayName}
                  onChange={(e) => setGatewayName(e.target.value)}
                  autoComplete="off"
                  className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#005a41]/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Provider</label>
                <button
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-[#005a41]/30 bg-white dark:bg-zinc-900 flex items-center justify-between text-sm group focus:border-[#005a41] transition-all"
                >
                  <span className={`font-medium ${selectedProvider ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                    {selectedProvider || 'Select provider'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProviderDropdown && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-10 animate-in slide-in-from-top-2 duration-200 max-h-[280px] overflow-y-auto overflow-x-hidden">
                    {PROVIDERS.map((provider) => (
                      <button
                        key={provider}
                        onClick={() => {
                          setSelectedProvider(provider);
                          setShowProviderDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] transition-all
                          ${selectedProvider === provider 
                            ? 'bg-[005a41]/10 text-[#005a41] font-bold' 
                            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-medium'
                          }
                        `}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProvider && PROVIDER_CONFIGS[selectedProvider]?.map((field: any) => (
                <div key={field.key} className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">
                    {field.label} <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type={field.type === 'password' && !showTokens[field.key] ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      autoComplete="off"
                      className={`w-full h-12 px-4 ${field.type === 'password' ? 'pr-12' : ''} rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#005a41]/20 transition-all font-medium`}
                    />
                    {field.type === 'password' && (
                      <button 
                        type="button"
                        onClick={() => setShowTokens({ ...showTokens, [field.key]: !showTokens[field.key] })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showTokens[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {field.note && <p className="text-[11px] text-zinc-400 ml-1 font-medium">{field.note}</p>}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-8 pb-8 pt-4 flex items-center justify-end gap-3">
              <button 
                onClick={handleCloseModal}
                className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2.5 text-sm font-bold bg-[#005a41] hover:bg-[#004a35] text-white rounded-xl shadow-lg shadow-[#005a41]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={Boolean(
                  loading || 
                  !gatewayName || 
                  !selectedProvider || 
                  PROVIDER_CONFIGS[selectedProvider]?.some((f: any) => !formData[f.key])
                )}
                onClick={handleSave}
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Create Gateway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Gateway Modal */}
      {showEditModal && editingGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-[480px] rounded-[24px] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Edit Gateway</h2>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">View and update gateway settings and credentials.</p>
              </div>
              <button 
                onClick={handleCloseEditModal}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Gateway Name</label>
                <input 
                  type="text"
                  placeholder="e.g. My Twilio"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoComplete="off"
                  className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#005a41]/20 transition-all font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1 font-medium">Provider</label>
                <div className="w-full h-12 px-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  {editingGateway.provider}
                </div>
              </div>

              {editingGateway && PROVIDER_CONFIGS[editingGateway.provider]?.map((field: any) => (
                <div key={field.key} className="space-y-2 relative">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {field.label} <span className="text-red-500 font-bold">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input 
                      type={field.type === 'password' && !showTokens[field.key] ? 'password' : 'text'}
                      placeholder={field.type === 'password' ? '********************' : field.placeholder}
                      value={editFormData[field.key] || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, [field.key]: e.target.value })}
                      autoComplete="off"
                      className="w-full h-12 px-4 pr-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#005a41]/20 transition-all font-medium text-zinc-900 dark:text-zinc-100"
                    />
                    {field.type === 'password' && (
                      <button 
                        type="button"
                        onClick={() => setShowTokens({ ...showTokens, [field.key]: !showTokens[field.key] })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {showTokens[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-8 pb-8 pt-4 flex items-center justify-end gap-3">
              <button 
                onClick={handleCloseEditModal}
                className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2.5 text-sm font-bold bg-[#005a41] hover:bg-[#004a35] text-white rounded-xl shadow-lg shadow-[#005a41]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={Boolean(loading || !editName)}
                onClick={handleUpdate}
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Test SMS Modal */}
      {showSendTestModal && testGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-[440px] rounded-[24px] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 italic">Send Test SMS</h2>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Send a test message via {testGateway.name}</p>
              </div>
              <button 
                onClick={() => setShowSendTestModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 ml-1">Phone Number</label>
                <input 
                  type="text"
                  placeholder="+88017XXXXXXXX"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-zinc-100 dark:border-zinc-800 focus:border-[#005a41] bg-white dark:bg-zinc-900 text-sm focus:outline-none transition-all font-medium text-zinc-900 dark:text-zinc-100 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 ml-1">Message (optional)</label>
                <textarea 
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#005a41]/20 transition-all font-medium text-zinc-900 dark:text-zinc-100 resize-none shadow-inner"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 pb-8 pt-2 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowSendTestModal(false)}
                className="px-6 py-2.5 text-[13px] font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                className="px-8 py-2.5 text-[13px] font-bold bg-[#005a41]/80 hover:bg-[#005a41] text-white rounded-xl shadow-lg shadow-[#005a41]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={Boolean(loading || !testPhone)}
                onClick={handleSendTestSMS}
              >
                {loading ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-10 duration-500">
          <div className={`bg-white dark:bg-zinc-950 border ${toast.type === 'error' ? 'border-red-500 shadow-red-500/10' : 'border-zinc-100 dark:border-zinc-800 shadow-zinc-500/10'} rounded-2xl shadow-[0_20px_50px] p-6 min-w-[320px] flex flex-col gap-1`}>
            <div className="flex items-center gap-2">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              )}
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{toast.title}</h4>
            </div>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
