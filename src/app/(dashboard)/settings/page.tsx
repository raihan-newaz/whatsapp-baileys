'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { 
  Settings, Loader2, Check, KeyRound, Eye, EyeOff, 
  User, Bell, Shield, Sliders, Camera, Save, Globe, Clock, Calendar, ChevronDown
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

type TabType = 'profile' | 'notifications' | 'security' | 'preferences';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Pacific/Honolulu', label: '(GMT-10:00) Honolulu' },
  { value: 'America/Anchorage', label: '(GMT-09:00) Anchorage' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time' },
  { value: 'America/Denver', label: '(GMT-07:00) Mountain Time' },
  { value: 'America/Chicago', label: '(GMT-06:00) Central Time' },
  { value: 'America/New_York', label: '(GMT-05:00) Eastern Time' },
  { value: 'America/Caracas', label: '(GMT-04:30) Caracas' },
  { value: 'America/Halifax', label: '(GMT-04:00) Atlantic Time' },
  { value: 'America/St_Johns', label: '(GMT-03:30) Newfoundland' },
  { value: 'America/Argentina/Buenos_Aires', label: '(GMT-03:00) Buenos Aires' },
  { value: 'America/Sao_Paulo', label: '(GMT-03:00) Sao Paulo' },
  { value: 'Atlantic/South_Georgia', label: '(GMT-02:00) Mid-Atlantic' },
  { value: 'Atlantic/Azores', label: '(GMT-01:00) Azores' },
  { value: 'Europe/London', label: '(GMT+00:00) London, Dublin' },
  { value: 'Europe/Paris', label: '(GMT+01:00) Paris, Berlin, Rome' },
  { value: 'Africa/Cairo', label: '(GMT+02:00) Cairo, Jerusalem' },
  { value: 'Europe/Moscow', label: '(GMT+03:00) Moscow, Baghdad' },
  { value: 'Asia/Tehran', label: '(GMT+03:30) Tehran' },
  { value: 'Asia/Dubai', label: '(GMT+04:00) Dubai, Baku' },
  { value: 'Asia/Kabul', label: '(GMT+04:30) Kabul' },
  { value: 'Asia/Karachi', label: '(GMT+05:00) Karachi, Tashkent' },
  { value: 'Asia/Kolkata', label: '(GMT+05:30) Kolkata, Mumbai' },
  { value: 'Asia/Kathmandu', label: '(GMT+05:45) Kathmandu' },
  { value: 'Asia/Dhaka', label: '(GMT+06:00) Dhaka, Almaty' },
  { value: 'Asia/Rangoon', label: '(GMT+06:30) Yangon' },
  { value: 'Asia/Bangkok', label: '(GMT+07:00) Bangkok, Jakarta' },
  { value: 'Asia/Shanghai', label: '(GMT+08:00) Beijing, Singapore' },
  { value: 'Asia/Tokyo', label: '(GMT+09:00) Tokyo, Seoul' },
  { value: 'Australia/Adelaide', label: '(GMT+09:30) Adelaide' },
  { value: 'Australia/Sydney', label: '(GMT+10:00) Sydney, Melbourne' },
  { value: 'Asia/Magadan', label: '(GMT+11:00) Magadan' },
  { value: 'Pacific/Auckland', label: '(GMT+12:00) Auckland, Fiji' }
];

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Arabic', label: 'Arabic' }
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' }
];

// Helper Components (Defined Outside to prevent Focus Loss bugs)
const TabButton = ({ id, label, icon: Icon, activeTab, onClick }: { id: TabType, label: string, icon: any, activeTab: TabType, onClick: (id: TabType) => void }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all rounded-sm whitespace-nowrap
      ${activeTab === id 
        ? 'bg-background text-foreground shadow-sm' 
        : 'text-muted-foreground hover:text-foreground'}`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const SectionHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <div className="flex flex-col space-y-1.5 p-6 border-b border-border/40">
    <h3 className="text-xl font-semibold leading-none tracking-tight">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

const InputField = ({ label, id, type = "text", value, onChange, disabled, helpText, rightElement }: any) => (
  <div className="space-y-2 flex-1">
    <label htmlFor={id} className="text-sm font-medium text-foreground block">{label}</label>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
    {helpText && <p className="text-[11px] text-muted-foreground mt-1">{helpText}</p>}
  </div>
);

const Switch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
      ${checked ? 'bg-primary' : 'bg-muted'}`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
        ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // States for each section
  const [saving, setSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedNotifications, setSavedNotifications] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);

  // Password state
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    campaigns: true,
    messages: true,
    weekly: false
  });

  // Preferences state
  const [prefs, setPrefs] = useState({
    language: 'English',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY'
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      try {
        const p = await apiFetch(`/api/profiles/${data.user.id}`);
        setProfile(p);
        
        if (p.notification_settings) {
          setNotifications(prev => ({ ...prev, ...p.notification_settings }));
        }
        if (p.app_preferences) {
          setPrefs(prev => ({ ...prev, ...p.app_preferences }));
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function handleSave(dataType: 'profile' | 'notifications' | 'preferences', data: any) {
    if (!user) return;
    setSaving(true);
    try {
      const body: any = {};
      if (dataType === 'profile') {
        body.full_name = data.full_name;
        body.avatar_url = data.avatar_url;
      } else if (dataType === 'notifications') {
        body.notification_settings = data;
      } else if (dataType === 'preferences') {
        body.app_preferences = data;
        body.timezone = data.timezone; // Sync root level timezone too
      }

      await apiFetch(`/api/profiles/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      
      if (dataType === 'profile') {
        setSavedProfile(true);
        setTimeout(() => setSavedProfile(false), 2000);
      } else if (dataType === 'notifications') {
        setSavedNotifications(true);
        setTimeout(() => setSavedNotifications(false), 2000);
      } else if (dataType === 'preferences') {
        setSavedPrefs(true);
        setTimeout(() => setSavedPrefs(false), 2000);
      }
    } catch (err) {
      console.error(`Failed to save ${dataType}:`, err);
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    setPwSaving(false);
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwMsg(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-screen">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Tabs list */}
      <div className="inline-flex h-10 items-center justify-center rounded-md p-1 text-muted-foreground bg-muted/50 w-fit">
        <TabButton id="profile" label="Profile" icon={User} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="notifications" label="Notifications" icon={Bell} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="security" label="Security" icon={Shield} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="preferences" label="Preferences" icon={Sliders} activeTab={activeTab} onClick={setActiveTab} />
      </div>

      <div className="mt-2 outline-none">
        {activeTab === 'profile' && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <SectionHeader title="Profile Information" subtitle="Update your personal information and contact details" />
            
            <div className="p-6 space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      const url = prompt('Enter image URL:');
                      if (url) setProfile((p: any) => ({ ...p, avatar_url: url }));
                    }}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Avatar
                  </button>
                  <p className="text-xs text-muted-foreground">Recommended: Square image, max 2MB</p>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave('profile', profile); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    label="Full Name" 
                    id="full_name"
                    value={profile?.full_name || ''} 
                    onChange={(e: any) => setProfile((p: any) => ({ ...p, full_name: e.target.value }))}
                  />
                  <InputField 
                    label="Email Address" 
                    id="email"
                    value={user?.email || ''} 
                    disabled 
                    helpText="Email is managed through account authentication"
                  />
                  <InputField 
                    label="Phone Number" 
                    id="phone"
                    value={profile?.phone || ''} 
                    disabled 
                    helpText="Phone number is managed at the customer level"
                  />
                  <InputField 
                    label="Company" 
                    id="company"
                    value={profile?.company || ''} 
                    disabled 
                    helpText="Company name is managed at the customer level"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all h-10 px-4 py-2 gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedProfile ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {savedProfile ? 'Changes Saved!' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <SectionHeader title="Notification Preferences" subtitle="Configure how you want to receive notifications" />
            <div className="p-6 space-y-6">
              <div className="space-y-1 divide-y divide-border">
                {[
                  { id: 'email', label: 'Email Notifications', sub: 'Receive notifications via email', val: notifications.email },
                  { id: 'push', label: 'Push Notifications', sub: 'Receive push notifications in browser', val: notifications.push },
                  { id: 'campaigns', label: 'Campaign Alerts', sub: 'Get notified when campaigns complete', val: notifications.campaigns },
                  { id: 'messages', label: 'Message Alerts', sub: 'Get notified for new messages', val: notifications.messages },
                  { id: 'weekly', label: 'Weekly Reports', sub: 'Receive weekly analytics reports', val: notifications.weekly },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-6 first:pt-0">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.sub}</p>
                    </div>
                    <Switch 
                      checked={item.val} 
                      onChange={() => setNotifications(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof notifications] }))} 
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => handleSave('notifications', notifications)}
                  disabled={saving}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all h-10 px-4 py-2 gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedNotifications ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedNotifications ? 'Preferences Saved!' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <SectionHeader title="Security Settings" subtitle="Keep your account secure by managing your password and access" />
            <div className="p-6 space-y-10">
              <div className="space-y-6 max-w-2xl">
                <h4 className="text-sm font-bold text-foreground">Change Password</h4>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="New Password" 
                      id="newPw"
                      type={showPw ? 'text' : 'password'}
                      value={pwForm.newPassword}
                      onChange={(e: any) => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                      rightElement={
                        <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-foreground">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <InputField 
                      label="Confirm New Password" 
                      id="confirmPw"
                      type={showConfirmPw ? 'text' : 'password'}
                      value={pwForm.confirmPassword}
                      onChange={(e: any) => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      rightElement={
                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="text-muted-foreground hover:text-foreground">
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </div>
                  {pwMsg && (
                    <div className={`p-4 rounded-lg text-sm font-medium border ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {pwMsg.text}
                    </div>
                  )}
                  <button type="submit" disabled={pwSaving} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
                    {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    Update Password
                  </button>
                </form>
              </div>

              <div className="pt-10 border-t border-border space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-medium text-foreground">Two-Factor Authentication</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">Add an extra layer of security to your account by requiring more than just a password to log in.</p>
                <button disabled className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium border border-input bg-background h-10 px-4 py-2 opacity-50 cursor-not-allowed">
                  Enable 2FA (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="rounded-lg border text-card-foreground shadow-sm bg-card border-border">
            <SectionHeader title="App Preferences" subtitle="Customize your application experience" />
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <CustomSelect
                    label="Language"
                    value={prefs.language}
                    onChange={(val) => setPrefs(p => ({ ...p, language: val }))}
                    options={LANGUAGES}
                    icon={<Globe className="w-4 h-4 text-primary/70" />}
                    className="w-full"
                    triggerClassName="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <CustomSelect
                    label="Timezone"
                    value={prefs.timezone}
                    onChange={(val) => setPrefs(p => ({ ...p, timezone: val }))}
                    options={TIMEZONES}
                    icon={<Clock className="w-4 h-4 text-primary/70" />}
                    className="w-full"
                    triggerClassName="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <CustomSelect
                    label="Date Format"
                    value={prefs.dateFormat}
                    onChange={(val) => setPrefs(p => ({ ...p, dateFormat: val }))}
                    options={DATE_FORMATS}
                    icon={<Calendar className="w-4 h-4 text-primary/70" />}
                    className="w-full"
                    triggerClassName="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => handleSave('preferences', prefs)}
                  disabled={saving}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-10 px-4 py-2 gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedPrefs ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedPrefs ? 'Preferences Saved!' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 text-center text-[10px] text-muted-foreground font-medium opacity-60">
        ©2026 Wa Cloud · Powered by Globyn · Made in Bangladesh
      </footer>
    </div>
  );
}
