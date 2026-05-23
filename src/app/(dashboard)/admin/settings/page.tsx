'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Settings, Save, AlertTriangle, ShieldCheck, Zap, Loader2, Check, Plus, Trash2, Globe, Clock, Filter, Activity, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

const AccordionItem = ({ id, title, subtitle, icon: Icon, color, children, actions, isOpen, onToggle }: any) => {
  return (
    <div className={`bg-white dark:bg-zinc-950 border ${isOpen ? 'border-[#085E4D]/30 dark:border-[#085E4D]/50 ring-1 ring-[#085E4D]/5 dark:ring-[#085E4D]/20' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl overflow-hidden shadow-sm transition-all duration-300 mb-4`}>
      <div 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-6 cursor-pointer transition-colors ${isOpen ? 'bg-[#085E4D]/5 dark:bg-[#085E4D]/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
             <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-tight">{title}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {actions}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180 bg-[#085E4D]/10 dark:bg-[#085E4D]/20 text-[#085E4D] dark:text-[#085E4D]' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600'}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>
      
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="p-8 border-t border-zinc-100 dark:border-zinc-900">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<{ [key: string]: boolean }>({});
  const [successKeys, setSuccessKeys] = useState<{ [key: string]: boolean }>({});
  const [badWordsInput, setBadWordsInput] = useState('');
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      
      try {
        const p = await apiFetch(`/api/profiles/${data.user.id}`);
        if (p?.role !== 'admin') { router.push('/dashboard'); return; }
        fetchSettings();
      } catch (err) {
        console.error('Admin check failed:', err);
        router.push('/dashboard');
      }
    });
  }, []);

  const [openSection, setOpenSection] = useState<string | null>(null);

  async function fetchSettings() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/settings');
      setSettings(data.settings || {});
      if (data.settings?.anti_spam?.bad_words) {
        setBadWordsInput(data.settings.anti_spam.bad_words.join(', '));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleSave(key: string, customPayload?: any) {
    let payload = customPayload !== undefined ? customPayload : settings[key];
    
    // Auto-parse bad words string into array before saving
    if (key === 'anti_spam') {
      const wordsArray = badWordsInput.split(',').map(w => w.trim()).filter(w => w.length > 0);
      payload = { ...settings['anti_spam'], bad_words: wordsArray };
    }

    setSavingKeys(prev => ({ ...prev, [key]: true }));
    try {
      const { data: { user } } = await createClient().auth.getUser();
      await apiFetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value: payload, userId: user?.id })
      });
      setSuccessKeys(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setSuccessKeys(prev => ({ ...prev, [key]: false })), 2000);
      
      // Update local state if we merged stuff
      if (key === 'anti_spam') setSettings((prev: any) => ({ ...prev, anti_spam: payload }));
      
    } catch (e: any) {
      alert(e.message);
    }
    setSavingKeys(prev => ({ ...prev, [key]: false }));
  }

  function updateNestedState(key: string, subkey: string, value: any, subkey2?: string) {
    setSettings((prev: any) => {
      const updated = { ...prev };
      if (subkey2) {
        updated[key] = { ...updated[key], [subkey]: { ...updated[key]?.[subkey], [subkey2]: value } };
      } else {
        updated[key] = { ...updated[key], [subkey]: value };
      }
      return updated;
    });
  }


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#085E4D]" />
        <p className="text-zinc-500 font-medium">Fetching global settings...</p>
      </div>
    );
  }

  const billLimits = settings.billing_limits || {};
  const antiSpam = settings.anti_spam || {};
  const warmup = settings.warmup_rules || {};
  const campDef = settings.campaign_defaults || {};
  const emergencies = settings.emergency_controls || { global_pause: false, disable_sending: false };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#f8f9fa] dark:bg-zinc-950 min-h-screen font-sans pb-20">
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
         <h1 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#085E4D]" /> System Configuration
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-2xl font-medium">
          Manage your global platform settings, subscription limits, and emergency controls from a centralized dashboard.
        </p>
      </div>

      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Anti-Spam Section */}
        <AccordionItem
          id="anti_spam"
          title="Anti-Spam & Shield"
          subtitle="Banned words and identical message thresholds."
          icon={ShieldCheck}
          color="bg-emerald-600"
          isOpen={openSection === 'anti_spam'}
          onToggle={() => setOpenSection(openSection === 'anti_spam' ? null : 'anti_spam')}
          actions={<SaveButton saving={savingKeys['anti_spam']} success={successKeys['anti_spam']} onClick={() => handleSave('anti_spam')} />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
               <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">Restricted Words (Comma Separated)</label>
              <textarea
                value={badWordsInput}
                onChange={(e) => setBadWordsInput(e.target.value)}
                rows={4}
                className="w-full bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-[#085E4D]/10 focus:border-[#085E4D] outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                placeholder="casino, crypto, prize, winner..."
              />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-2">
                <AlertTriangle className="w-3 h-3" /> Blocked words prevent message delivery immediately.
              </p>
            </div>
            
            <div className="space-y-2">
               <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">Identical Message Threshold (Daily)</label>
              <div className="relative">
                <input
                  type="number"
                  value={antiSpam.max_identical_msgs ?? 200}
                  onChange={(e) => updateNestedState('anti_spam', 'max_identical_msgs', Number(e.target.value))}
                   className="w-full bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-12 py-3 text-zinc-900 dark:text-zinc-100 text-sm font-semibold focus:ring-2 focus:ring-[#085E4D]/10 focus:border-[#085E4D] outline-none transition-all"
                />
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-600" />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 font-medium">Max duplicate messages a user can send before auto-blocking.</p>
            </div>
          </div>
        </AccordionItem>

        {/* Subscription Plans Section */}
        <AccordionItem
          id="billing"
          title="Subscription Plans & Tiers"
          subtitle="Resource allocation and pricing for user levels."
          icon={Zap}
          color="bg-orange-500"
          isOpen={openSection === 'billing'}
          onToggle={() => setOpenSection(openSection === 'billing' ? null : 'billing')}
          actions={
            <div className="flex gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const name = prompt('New Plan Name:');
                  if (name) {
                    const id = name.toLowerCase().replace(/\s+/g, '_');
                    alert('Tip: Use "0" for Unlimited features.');
                    updateNestedState('billing_limits', id, { 
                      name: name, 
                      accounts: 1, 
                      daily_msgs: 100, 
                      group_extractions: 1, 
                      max_contacts: 500,
                      media_limit: 100,
                      media_limit_unit: 'MB',
                      validity_days: 30
                    });
                  }
                }}
                 className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-all border border-zinc-200 dark:border-zinc-800"
              >
                <Plus className="w-4 h-4" /> Add Plan
              </button>
              <SaveButton saving={savingKeys['billing_limits']} success={successKeys['billing_limits']} onClick={() => handleSave('billing_limits')} />
            </div>
          }
        >
          <div className="overflow-x-auto -mx-8">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                 <tr className="bg-[#f8f9fa] dark:bg-zinc-900 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-y border-zinc-100 dark:border-zinc-800">
                  <th className="px-8 py-4">Plan Identification</th>
                  <th className="px-6 py-4">Pricing</th>
                  <th className="px-6 py-4">Accounts</th>
                  <th className="px-6 py-4">Daily Msgs</th>
                   <th className="px-6 py-4">Extractions</th>
                  <th className="px-6 py-4">Contacts</th>
                  <th className="px-6 py-4">Storage</th>
                  <th className="px-6 py-4">Validity (Days)</th>
                  <th className="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                {Object.keys(billLimits).map(planId => (
                  <tr key={planId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <input 
                          type="text" 
                          value={billLimits[planId]?.name ?? planId} 
                          onChange={(e) => updateNestedState('billing_limits', planId, e.target.value, 'name')}                           className="w-full bg-transparent border-none p-0 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none" 
                        />
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-tighter uppercase">{planId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-[10px] font-medium">
                          <span className="text-zinc-400 dark:text-zinc-500 w-4">M:</span>
                          <input type="text" value={billLimits[planId]?.monthly_price ?? '$0'} onChange={(e) => updateNestedState('billing_limits', planId, e.target.value, 'monthly_price')} className="ml-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 w-16 outline-none focus:border-[#085E4D]" />
                        </div>
                        <div className="flex items-center text-[10px] font-medium">
                          <span className="text-zinc-400 dark:text-zinc-500 w-4">Y:</span>
                          <input type="text" value={billLimits[planId]?.yearly_price ?? '$0'} onChange={(e) => updateNestedState('billing_limits', planId, e.target.value, 'yearly_price')} className="ml-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 w-16 outline-none focus:border-[#085E4D]" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                         <input type="number" value={billLimits[planId]?.accounts ?? 0} onChange={(e) => updateNestedState('billing_limits', planId, Number(e.target.value), 'accounts')} className="w-14 bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-semibold outline-none focus:border-[#085E4D]" />
                         {billLimits[planId]?.accounts === 0 && <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded text-center">Unlimited</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                         <input type="number" value={billLimits[planId]?.daily_msgs ?? 0} onChange={(e) => updateNestedState('billing_limits', planId, Number(e.target.value), 'daily_msgs')} className="w-16 bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-semibold outline-none focus:border-[#085E4D]" />
                         {billLimits[planId]?.daily_msgs === 0 && <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded text-center">Unlimited</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                         <input type="number" value={billLimits[planId]?.group_extractions ?? 0} onChange={(e) => updateNestedState('billing_limits', planId, Number(e.target.value), 'group_extractions')} className="w-14 bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-semibold outline-none focus:border-[#085E4D]" />
                         {billLimits[planId]?.group_extractions === 0 && <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded text-center">Unlimited</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                         <input type="number" value={billLimits[planId]?.max_contacts ?? 0} onChange={(e) => updateNestedState('billing_limits', planId, Number(e.target.value), 'max_contacts')} className="w-20 bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-semibold outline-none focus:border-[#085E4D]" />
                         {billLimits[planId]?.max_contacts === 0 && <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded text-center">Unlimited</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5">
                         <input 
                           type="number" 
                           value={billLimits[planId]?.media_limit ?? 100} 
                           onChange={(e) => updateNestedState('billing_limits', planId, Number(e.target.value), 'media_limit')} 
                           className="w-16 bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-semibold outline-none focus:border-[#085E4D]" 
                         />
                         <select
                           value={billLimits[planId]?.media_limit_unit ?? 'MB'}
                           onChange={(e) => updateNestedState('billing_limits', planId, e.target.value, 'media_limit_unit')}
                           className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-1 py-1.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 outline-none cursor-pointer"
                         >
                           <option value="MB">MB</option>
                           <option value="GB">GB</option>
                         </select>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                         <input 
                           type="number" 
                           value={billLimits[planId]?.validity_days ?? (planId === 'free_trial' ? 3 : 30)} 
                           onChange={(e) => updateNestedState('billing_limits', planId, Number(e.target.value), 'validity_days')} 
                           className="w-16 bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-semibold outline-none focus:border-[#085E4D]" 
                         />
                         {(billLimits[planId]?.validity_days === 0 || planId === 'admin' || planId === 'enterprise') && (
                           <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded text-center">Lifetime</span>
                         )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {!['free_trial', 'pro', 'enterprise', 'admin'].includes(planId) ? (
                        <button 
                          onClick={() => {
                            if (confirm(`Delete the "${planId}" plan?`)) {
                              const updated = { ...billLimits }; delete updated[planId];
                              setSettings((prev: any) => ({ ...prev, billing_limits: updated }));
                            }
                          }}
                          className="p-2 text-zinc-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                         <span className="text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20 shadow-sm shadow-emerald-700/5">System</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccordionItem>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
          {/* Warmup Section */}
          <AccordionItem
            id="warmup"
            title="Account Warmup"
            subtitle="Daily threshold progression."
            icon={Activity}
            color="bg-blue-600"
            isOpen={openSection === 'warmup'}
            onToggle={() => setOpenSection(openSection === 'warmup' ? null : 'warmup')}
            actions={<SaveButton saving={savingKeys['warmup_rules']} success={successKeys['warmup_rules']} onClick={() => handleSave('warmup_rules')} />}
          >
            <div className="grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(day => (
                <div key={day} className="space-y-1.5">
                   <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider">Day {day} Limit</label>
                  <div className="relative">
                     <input type="number" value={warmup[`day${day}`] ?? 0} onChange={(e) => updateNestedState('warmup_rules', `day${day}`, Number(e.target.value))} className="w-full bg-[#f8f9fa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 text-sm font-semibold focus:border-[#085E4D] outline-none transition-all" />
                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                  </div>
                </div>
              ))}
            </div>
          </AccordionItem>

          {/* Campaign Defaults */}
          <AccordionItem
            id="campaign"
            title="Campaign Rules"
            subtitle="Safety intervals and delays."
            icon={Globe}
            color="bg-indigo-600"
            isOpen={openSection === 'campaign'}
            onToggle={() => setOpenSection(openSection === 'campaign' ? null : 'campaign')}
            actions={<SaveButton saving={savingKeys['campaign_defaults']} success={successKeys['campaign_defaults']} onClick={() => handleSave('campaign_defaults')} />}
          >
            <div className="space-y-4">
              {[
                { label: 'Base Interval (Seconds)', key: 'min_interval', val: campDef.min_interval ?? 20 },
                { label: 'Min Delay (Random)', key: 'min_delay', val: campDef.min_delay ?? 20 },
                { label: 'Max Delay (Random)', key: 'max_delay', val: campDef.max_delay ?? 60 },
              ].map(f => (
                <div key={f.key} className="flex items-center justify-between gap-4 p-3 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                   <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">{f.label}</label>
                   <input type="number" value={f.val} onChange={(e) => updateNestedState('campaign_defaults', f.key, Number(e.target.value))} className="w-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-semibold focus:border-[#085E4D] outline-none text-center shadow-sm" />
                </div>
              ))}
            </div>
          </AccordionItem>
        </div>

        {/* Emergency Kill Switches */}
        <AccordionItem
          id="emergency"
          title="Emergency Switches"
          subtitle="Halt platform operations globally."
          icon={AlertTriangle}
          color="bg-red-600"
          isOpen={openSection === 'emergency'}
          onToggle={() => setOpenSection(openSection === 'emergency' ? null : 'emergency')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-red-50 dark:border-red-500/10 rounded-xl group transition-all hover:border-red-200 dark:hover:border-red-500/30">
              <div className="max-w-[70%]">
                 <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm uppercase">Global Queue Pause</p>
                 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-semibold leading-tight">FREEZES ALL CAMPAIGN PROCESSING INSTANTLY.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={!!emergencies.global_pause} 
                  onChange={(e) => {
                    const val = e.target.checked;
                    const merged = { ...emergencies, global_pause: val };
                    updateNestedState('emergency_controls', 'global_pause', val);
                    handleSave('emergency_controls', merged);
                  }} 
                />
                <div className="w-14 h-7 bg-zinc-100 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-red-50 dark:border-red-500/10 rounded-xl group transition-all hover:border-red-200 dark:hover:border-red-500/30">
              <div className="max-w-[70%]">
                 <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm uppercase">Global Send Lock</p>
                 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-semibold leading-tight">STOPS ALL INDIVIDUAL MESSAGING ENTIRELY.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={!!emergencies.disable_sending} 
                  onChange={(e) => {
                    const val = e.target.checked;
                    const merged = { ...emergencies, disable_sending: val };
                    updateNestedState('emergency_controls', 'disable_sending', val);
                    handleSave('emergency_controls', merged);
                  }} 
                />
                <div className="w-14 h-7 bg-zinc-100 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
              </label>
            </div>
          </div>
        </AccordionItem>

      </div>
      
      <p className="text-center text-zinc-400 dark:text-zinc-600 text-[9px] font-semibold uppercase tracking-[0.3em] py-12 flex items-center justify-center gap-4">
        <span className="w-8 h-[1px] bg-zinc-200 dark:bg-zinc-800" />
        PLATFORM CORE ENGINE · v5.0.0 · HYPER-STABLE
        <span className="w-8 h-[1px] bg-zinc-200 dark:bg-zinc-800" />
      </p>
    </div>
  );
}

function SaveButton({ saving, success, onClick }: { saving: boolean, success: boolean, onClick: (e: any) => void }) {
  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick(e);
  };

  if (success) {
    return (
       <button disabled onClick={handleClick} className="flex items-center gap-2 px-6 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-[10px] uppercase tracking-widest animate-in zoom-in duration-300">
        <Check className="w-4 h-4" /> Updated
      </button>
    );
  }
  return (
     <button onClick={handleClick} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#085E4D] hover:bg-[#064a3d] text-white rounded-xl transition-all shadow-md shadow-[#085E4D]/20 active:scale-95 disabled:opacity-50">
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      Save
    </button>
  );
}
