'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, QrCode, Plus, Trash2, Settings, Battery, Signal, ArrowLeft, RefreshCw, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface AndroidDevice {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  battery_level: number | null;
  default_sim: number;
  sms_delay_seconds: number;
  sync_mode: string;
  last_active_at: string | null;
}

export default function AndroidDevicesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [devices, setDevices] = useState<AndroidDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrDeviceId, setQrDeviceId] = useState('');
  const [showSettings, setShowSettings] = useState<AndroidDevice | null>(null);
  const [settingsForm, setSettingsForm] = useState({ name: '', default_sim: 1, sms_delay_seconds: 0, sync_mode: 'all' });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchDevices(data.user.id);
      }
    });
  }, []);

  const fetchDevices = async (uId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/android/devices/${uId}`);
      if (res.success) {
        setDevices(res.devices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await apiFetch('/api/android/generate-token', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      if (res.success) {
        let baseUrl = window.location.origin;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
           baseUrl = `http://192.168.0.104:${window.location.port || 3000}`;
        }
        // Construct the QR Payload (JSON containing backend URL and Token)
        const payload = JSON.stringify({
           url: baseUrl,
           token: res.token
        });
        setQrToken(payload);
        setQrDeviceId(res.deviceId);
        setShowQR(true);
        fetchDevices(userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect and remove this device?')) return;
    try {
      const res = await apiFetch(`/api/android/devices/${id}`, { method: 'DELETE' });
      if (res.success && userId) fetchDevices(userId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this device session? You will need to scan a QR code to connect again.')) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/android/devices/${id}/logout`, { method: 'POST' });
      if (res.success && userId) fetchDevices(userId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/android/devices/${id}/regenerate-token`, { method: 'POST' });
      if (res.success) {
        let baseUrl = window.location.origin;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
           baseUrl = `http://192.168.0.104:${window.location.port || 3000}`;
        }
        const payload = JSON.stringify({
           url: baseUrl,
           token: res.token
        });
        setQrToken(payload);
        setQrDeviceId(res.deviceId);
        setShowQR(true);
        if (userId) fetchDevices(userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = (device: AndroidDevice) => {
    setSettingsForm({ name: device.name, default_sim: device.default_sim, sms_delay_seconds: device.sms_delay_seconds, sync_mode: device.sync_mode || 'all' });
    setShowSettings(device);
  };

  const handleUpdateSettings = async () => {
    if (!showSettings || !userId) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/android/devices/${showSettings.id}`, {
        method: 'PATCH',
        body: JSON.stringify(settingsForm)
      });
      if (res.success) {
        setShowSettings(null);
        fetchDevices(userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <a href="/sms-gateways" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-2 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Gateways
          </a>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-[#005a41]" /> Android Devices
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Connect your physical Android phones to use them as SMS gateways.
          </p>
        </div>
        <button
          onClick={handleGenerateQR}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#005a41] hover:bg-[#004a35] text-white rounded-lg font-semibold transition-all shadow-sm active:scale-95 text-sm disabled:opacity-50"
        >
          <QrCode className="w-4 h-4" />
          Connect New Device
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
           <h3 className="text-sm font-bold text-amber-900 dark:text-amber-500">Android App Required & Network Info</h3>
           <p className="text-xs text-amber-700 mt-1">To connect your phone, you must install the WaCloud SMS Gateway APK on your Android device and scan the QR code generated here. Make sure the app is excluded from battery optimization so it runs in the background continuously.</p>
           {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
              <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                Warning: You are accessing this site via localhost. Your phone will not be able to connect to localhost over Wi-Fi. Please access this dashboard using your computer's local IP address (e.g., http://192.168.1.15:3000) so the QR code contains an IP address your phone can reach.
              </div>
           )}
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map(device => (
          <div key={device.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">{device.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${device.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${device.status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        {device.status === 'connected' ? 'Connected' : 'Disconnected'}
                     </span>
                     <span className="text-xs text-zinc-500 font-mono">ID: {device.id.slice(-6)}</span>
                  </div>
               </div>
            </div>

            <div className="space-y-3 mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-4">
               <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Battery className="w-4 h-4"/> Battery</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{device.battery_level !== null ? `${device.battery_level}%` : 'N/A'}</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Signal className="w-4 h-4"/> Default SIM</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">SIM {device.default_sim}</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">SMS Delay</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{device.sms_delay_seconds} sec</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">Sync Mode</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{device.sync_mode === 'all' ? 'All SMS' : 'Replies Only'}</span>
               </div>
            </div>

            <div className="flex gap-2 mt-6">
               <button onClick={() => handleOpenSettings(device)} className="flex-1 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Settings className="w-4 h-4" /> Settings
               </button>
               {device.status === 'connected' ? (
                  <button onClick={() => handleLogout(device.id)} title="Disconnect Phone" className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               ) : (
                  <button onClick={() => handleReconnect(device.id)} title="Reconnect Phone" className="px-3 py-2 bg-[#005a41]/10 hover:bg-[#005a41]/20 text-[#005a41] rounded-xl transition-colors">
                     <QrCode className="w-4 h-4" />
                  </button>
               )}
               <button onClick={() => handleDelete(device.id)} title="Delete Device" className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && !loading && (
         <div className="py-20 text-center">
            <Smartphone className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-700">No Android Devices Connected</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6">Connect your first phone to use it as an SMS gateway.</p>
            <button onClick={handleGenerateQR} className="px-6 py-2.5 bg-[#005a41] text-white font-bold rounded-xl">Connect Phone</button>
         </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-2 text-zinc-900">Scan to Connect</h2>
            <p className="text-sm text-zinc-500 mb-6">Open the WaCloud SMS App on your Android phone and scan this QR code.</p>
            
            <div className="bg-white p-4 rounded-xl inline-block border-2 border-dashed border-zinc-200 mb-6">
               <QRCodeSVG value={qrToken} size={200} />
            </div>

            <button onClick={() => { setShowQR(false); if (userId) fetchDevices(userId); }} className="w-full px-4 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors">
               Done Scanning
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[24px] p-8 max-w-md w-full">
               <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-zinc-900">Device Settings</h2>
                  <button onClick={() => setShowSettings(null)}><X className="w-5 h-5 text-zinc-400" /></button>
               </div>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-sm font-bold text-zinc-700">Device Name</label>
                     <input type="text" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="w-full mt-1 h-11 px-4 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#005a41]/20 text-zinc-900 bg-white dark:text-zinc-900 dark:bg-white" />
                  </div>
                  <div>
                     <label className="text-sm font-bold text-zinc-700">Default SIM</label>
                     <select value={settingsForm.default_sim} onChange={e => setSettingsForm({...settingsForm, default_sim: Number(e.target.value)})} className="w-full mt-1 h-11 px-4 rounded-xl border border-zinc-200 focus:outline-none text-zinc-900 bg-white dark:text-zinc-900 dark:bg-white">
                        <option value={1} className="text-zinc-900 bg-white">SIM 1</option>
                        <option value={2} className="text-zinc-900 bg-white">SIM 2</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-sm font-bold text-zinc-700">SMS Delay (Seconds)</label>
                     <p className="text-xs text-zinc-500 mb-2">Wait before sending each SMS to avoid carrier spam blocks.</p>
                     <input type="number" min={0} value={settingsForm.sms_delay_seconds} onChange={e => setSettingsForm({...settingsForm, sms_delay_seconds: Number(e.target.value)})} className="w-full h-11 px-4 rounded-xl border border-zinc-200 focus:outline-none text-zinc-900 bg-white dark:text-zinc-900 dark:bg-white" />
                  </div>
                  <div>
                     <label className="text-sm font-bold text-zinc-700">Sync Mode</label>
                     <p className="text-xs text-zinc-500 mb-2">Choose which incoming SMS to sync to the website.</p>
                     <select value={settingsForm.sync_mode} onChange={e => setSettingsForm({...settingsForm, sync_mode: e.target.value})} className="w-full mt-1 h-11 px-4 rounded-xl border border-zinc-200 focus:outline-none text-zinc-900 bg-white dark:text-zinc-900 dark:bg-white">
                        <option value="all" className="text-zinc-900 bg-white">Sync All Incoming SMS</option>
                        <option value="replies" className="text-zinc-900 bg-white">Only Sync Replies</option>
                     </select>
                  </div>
               </div>

               <div className="mt-8 flex gap-3">
                  <button onClick={() => setShowSettings(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl">Cancel</button>
                  <button onClick={handleUpdateSettings} disabled={loading} className="flex-1 py-3 bg-[#005a41] text-white font-bold rounded-xl">{loading ? 'Saving...' : 'Save'}</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
