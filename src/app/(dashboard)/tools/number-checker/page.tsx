'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RotateCcw, 
  Zap, 
  Plus, 
  Smartphone,
  Info,
  X,
  Loader2,
  ChevronRight,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { io } from 'socket.io-client';
import { CustomSelect } from '@/components/ui/CustomSelect';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function NumberCheckerPage() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    processingJobs: 0,
    pendingJobs: 0,
    totalValid: 0,
    totalInvalid: 0
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  
  // Modal State
  const [selectedSession, setSelectedSession] = useState('');
  const [jobName, setJobName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [checkingQuick, setCheckingQuick] = useState(false);
  const [quickResult, setQuickResult] = useState<{ isValid: boolean, profilePicUrl: string | null } | null>(null);
  
  const toast = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadData(data.user.id);
        
        // Socket connection
        const socket = io(BACKEND_URL);
        socket.emit('join', data.user.id);
        
        socket.on('checker:progress', (data: any) => {
          setJobs(prev => prev.map(j => j.id === data.jobId ? { 
            ...j, 
            completed_count: data.completed, 
            valid_count: data.valid, 
            invalid_count: data.invalid,
            status: 'processing'
          } : j));
          refreshStats(data.user.id);
        });
        
        socket.on('checker:completed', (data: any) => {
          setJobs(prev => prev.map(j => j.id === data.jobId ? { 
            ...j, 
            status: 'completed',
            valid_count: data.valid,
            invalid_count: data.invalid
          } : j));
          refreshStats(data.user.id);
          toast.success('Verification job completed!');
        });

        return () => socket.disconnect();
      }
    });
  }, []);

  async function loadData(uid: string) {
    setLoading(true);
    try {
      const [jobsData, statsData, sessionsData] = await Promise.all([
        apiFetch(`/api/checker/jobs/${uid}`),
        apiFetch(`/api/checker/stats/${uid}`),
        apiFetch(`/api/whatsapp/sessions/${uid}`)
      ]);
      setJobs(jobsData || []);
      setStats(statsData || {
        totalJobs: 0,
        completedJobs: 0,
        processingJobs: 0,
        pendingJobs: 0,
        totalValid: 0,
        totalInvalid: 0
      });
      setSessions(sessionsData?.filter((s: any) => s.status === 'connected') || []);
      
      // Select first active session by default
      if (sessionsData?.length > 0) {
        const active = sessionsData.find((s: any) => s.status === 'connected');
        if (active) setSelectedSession(active.id);
      }
    } catch (e: any) {
      toast.error('Failed to load data: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshStats(uid: string) {
    try {
      const statsData = await apiFetch(`/api/checker/stats/${uid}`);
      setStats(statsData);
    } catch (e) {}
  }

  const handleOpenModal = () => {
    setJobName(''); // Clear manual name to show placeholder
    setShowModal(true);
  };

  const handleOpenQuickModal = () => {
    setQuickResult(null);
    setQuickPhone('');
    setShowQuickModal(true);
  };

  const handleQuickCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !quickPhone) return;
    if (!selectedSession) {
      toast.error('Please select a connected device');
      return;
    }

    setCheckingQuick(true);
    setQuickResult(null);
    try {
      const res = await apiFetch('/api/checker/quick', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          sessionId: selectedSession,
          phone: quickPhone
        })
      });
      setQuickResult({ isValid: res.isValid, profilePicUrl: res.profilePicUrl });
      if (res.isValid) {
        toast.success('Number is registered on WhatsApp');
      } else {
        toast.error('Number is NOT registered on WhatsApp');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCheckingQuick(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedSession) {
      toast.error('Please select a connected device');
      return;
    }
    
    // Parse phones
    const phones = phoneInput
      .split(/[\n,;]/)
      .map(p => p.trim())
      .filter(p => p.length >= 5);
      
    if (phones.length === 0) {
      toast.error('Please enter at least one phone number');
      return;
    }

    setCreating(true);
    try {
      await apiFetch('/api/checker/jobs', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          sessionId: selectedSession,
          name: jobName,
          phones
        })
      });
      
      toast.success('Verification job started');
      setShowModal(false);
      setPhoneInput('');
      loadData(user.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!user) return;
    try {
      await apiFetch(`/api/checker/jobs/${id}?userId=${user.id}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(j => j.id !== id));
      refreshStats(user.id);
      toast.success('Job deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-10 pb-24 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="font-semibold text-foreground tracking-tight">WhatsApp Number Checker</h1>
          <p className="text-muted-foreground font-medium text-sm">Verify if phone numbers have WhatsApp accounts</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              if (user) {
                await loadData(user.id);
                toast.success('Verification jobs refreshed');
              }
            }}
            className="btn-icon"
            title="Refresh"
          >
            <RotateCcw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={handleOpenQuickModal}
            className="btn-secondary"
          >
            <Zap className="w-4 h-4 md:w-5 md:h-5 text-orange-400 mr-2" />
            Quick Check
          </button>
          
          <button 
            onClick={handleOpenModal}
            className="btn-primary !bg-[#085E4D] hover:!bg-[#0a7560]"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            New Verification
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Jobs', value: stats.totalJobs, icon: FileText, color: 'text-[#085E4D] bg-[#085E4D]/5', border: 'border-[#085E4D]/10' },
          { label: 'Completed', value: stats.completedJobs, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
          { label: 'Processing', value: stats.processingJobs, icon: RotateCcw, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20' },
          { label: 'Pending', value: stats.pendingJobs, icon: Clock, color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-500/20' },
          { label: 'Valid Numbers', value: stats.totalValid, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-500/20' },
          { label: 'Invalid Numbers', value: stats.totalInvalid, icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400', border: 'border-red-100 dark:border-red-500/20' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${stat.color} ${stat.border}`}>
               <stat.icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <p className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1">{stat.value || 0}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Jobs Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Verification Jobs</h2>
            <p className="text-muted-foreground font-medium text-sm">View and manage your WhatsApp number verification jobs</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-card border border-border rounded-[2rem] p-16 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-border">
               <FileText className="w-12 h-12 text-muted-foreground opacity-40" />
            </div>
            
            <h3 className="text-xl font-semibold text-foreground mb-2">No verification jobs yet</h3>
            <p className="text-muted-foreground font-medium text-sm mb-10 max-w-sm">
              Create a new job to start verifying phone numbers
            </p>

            <button 
              onClick={handleOpenModal}
              className="flex items-center gap-3 px-8 py-3.5 bg-[#085E4D] hover:bg-[#0a7560] text-white rounded-2xl transition-all shadow-xl shadow-emerald-900/10 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" /> 
              Create Your First Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job, idx) => (
              <div 
                key={job.id} 
                className="bg-card border border-border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Progress Bar background */}
                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/10 w-full" />
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(job.completed_count / job.total_count) * 100}%` }}
                />

                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground leading-tight group-hover:text-emerald-600 transition-colors uppercase text-xs tracking-wider">{job.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium">{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${
                      job.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      job.status === 'processing' ? 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' :
                      'bg-orange-50 text-orange-600 border border-orange-100'
                    }`}>
                      {job.status}
                    </span>
                    <button 
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 bg-secondary/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6">
                  <div className="bg-secondary/30 rounded-xl p-3 border border-border/50">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mb-1">Total</p>
                    <p className="text-base font-bold text-foreground">{job.total_count}</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl p-3 border border-emerald-100/50 dark:border-emerald-500/20">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase opacity-60 mb-1">Valid</p>
                    <p className="text-base font-bold text-emerald-600">{job.valid_count}</p>
                  </div>
                  <div className="bg-red-50/50 dark:bg-red-500/5 rounded-xl p-3 border border-red-100/50 dark:border-red-500/20">
                    <p className="text-[9px] font-bold text-red-500 uppercase opacity-60 mb-1">Invalid</p>
                    <p className="text-base font-bold text-red-500">{job.invalid_count}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                    <RotateCcw className={`w-3 h-3 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                    Progress: {job.completed_count} / {job.total_count}
                  </div>
                  <button className="text-emerald-500 hover:text-emerald-600 uppercase tracking-widest flex items-center gap-1 transition-all">
                    Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Job Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2.5rem] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-[#085E4D]/10 rounded-2xl flex items-center justify-center border border-[#085E4D]/20 flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-[#085E4D]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Create Verification Job</h3>
                  <p className="text-muted-foreground text-sm mt-0.5">Upload a list of phone numbers to verify which ones have WhatsApp</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="flex-1 overflow-y-auto p-8 pt-4 space-y-6">
              {/* Select Device */}
              <div className="space-y-2">
                <CustomSelect
                  label="Select Device"
                  value={selectedSession}
                  onChange={setSelectedSession}
                  options={sessions.map(s => ({
                    value: s.id,
                    label: `${s.device_info?.pushname || s.session_name} (${s.phone_number})`,
                    icon: <Smartphone className="w-4 h-4" />
                  }))}
                  placeholder="Choose a connected device"
                />
                {sessions.length === 0 && (
                  <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No connected devices found. Please connect an account first.
                  </p>
                )}
              </div>

              {/* Job Name */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground ml-1">Job Name (Optional)</label>
                <input 
                  type="text" 
                  value={jobName}
                  onChange={e => setJobName(e.target.value)}
                  placeholder={`WhatsApp Check - ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}`}
                  className="w-full bg-secondary outline-none border-2 border-transparent rounded-2xl px-5 py-4 text-foreground font-medium focus:border-[#085E4D]/30 focus:bg-background transition"
                />
                <p className="text-[10px] text-muted-foreground/60 font-medium ml-1">Leave empty for auto-generated name</p>
              </div>

              {/* Phone Numbers Area */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground ml-1">Phone Numbers</label>
                <div className="relative">
                   <textarea 
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    rows={8}
                    className="w-full bg-secondary outline-none border-2 border-transparent rounded-[1.5rem] px-6 py-6 text-foreground font-mono text-xs font-medium focus:border-[#085E4D]/30 focus:bg-background transition resize-none leading-relaxed"
                    placeholder="Paste your phone numbers here...&#10;&#10;Supported formats:&#10;1234567890&#10;1234567890, 0987654321&#10;1122334455; 5544332211"
                  />
                </div>
                <div className="bg-emerald-50/80 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-2xl text-[11px] text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
                   Supports comma, semicolon, or newline separated numbers. Include country code for best results.
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-8 border-t border-border flex gap-4 bg-secondary/10">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-4 rounded-2xl border-2 border-border text-foreground hover:bg-secondary transition active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateJob}
                disabled={creating || sessions.length === 0}
                className="flex-[1.5] flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-[#085E4D] hover:bg-[#0a7560] text-white transition shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Create & Start'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Number Check Modal */}
      {showQuickModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Quick Number Check</h3>
                  <p className="text-muted-foreground text-sm mt-0.5">Instantly verify if a single phone number has WhatsApp</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuickModal(false)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCheck} className="p-8 pt-4 space-y-6">
              {/* Select Device */}
              <div className="space-y-2">
                <CustomSelect
                  label="Select Device"
                  value={selectedSession}
                  onChange={setSelectedSession}
                  options={sessions.map(s => ({
                    value: s.id,
                    label: `${s.device_info?.pushname || s.session_name} (${s.phone_number})`,
                    icon: <Smartphone className="w-4 h-4" />
                  }))}
                  placeholder="Choose a connected device"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground ml-1">Phone Number</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={quickPhone}
                    onChange={e => setQuickPhone(e.target.value)}
                    placeholder="e.g, 1234567890"
                    required
                    className="w-full bg-secondary outline-none border-2 border-transparent rounded-2xl px-5 py-4 text-foreground font-medium focus:border-[#085E4D]/30 focus:bg-background transition"
                  />
                  <Smartphone className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-medium ml-1">Include country code for accurate results</p>
              </div>

              {/* Result display */}
              {quickResult !== null && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
                  quickResult.isValid 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                    : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                }`}>
                  {quickResult.isValid ? (
                    quickResult.profilePicUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-emerald-500/20 shadow-sm">
                        <img src={quickResult.profilePicUrl} alt="Match" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                    )
                  ) : (
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/20 shrink-0">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold">{quickResult.isValid ? 'Found on WhatsApp' : 'Not on WhatsApp'}</p>
                    <p className="text-[10px] opacity-80 font-medium">{quickPhone} {quickResult.isValid ? 'is a registered WhatsApp account.' : 'does not seem to be on WhatsApp.'}</p>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-8 border-t border-border flex gap-4 bg-secondary/10">
              <button 
                type="button"
                onClick={() => setShowQuickModal(false)}
                className="flex-1 px-4 py-4 rounded-2xl border-2 border-border text-foreground hover:bg-secondary transition active:scale-95"
              >
                Close
              </button>
              <button 
                onClick={handleQuickCheck}
                disabled={checkingQuick || !quickPhone || sessions.length === 0}
                className="flex-[1.5] flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-[#085E4D] hover:bg-[#0a7560] text-white transition shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
              >
                {checkingQuick ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                  <>
                    <Zap className="w-4 h-4" />
                    Check Number
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Meta Info */}
      <div className="flex items-center justify-center gap-2 py-4 text-[11px] text-muted-foreground font-medium opacity-60">
        <span>©2026 Wa Cloud</span>
        <span>•</span>
        <span>Powered by Globyn</span>
        <span>•</span>
        <span>Made in Bangladesh</span>
      </div>
    </div>
  );
}
