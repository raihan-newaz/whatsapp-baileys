'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { MessageCircle, Loader2, CheckCircle, ArrowRight, Mail, Key, Copy, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLocalhost(
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1'
      );
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const data = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (data.success) {
        setSuccess(true);
        if (data.token) {
          setResetToken(data.token);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset link.');
    } finally {
      setLoading(false);
    }
  }

  const resetLink = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/reset-password?token=${resetToken}`
    : `http://localhost:3000/auth/reset-password?token=${resetToken}`;

  function copyToClipboard() {
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      
      {/* Left Panel: Emerald Marketing Screen (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-black p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-black/10 rounded-full blur-[120px]" />

        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 z-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 overflow-hidden flex items-center justify-center shadow-2xl">
            <img src="/logo.png" alt="WaCloud Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-extrabold text-2xl tracking-tighter text-black">
            wacloud<span className="text-white opacity-90">.app</span>
          </span>
        </Link>

        {/* Hero marketing message */}
        <div className="space-y-6 z-10 my-auto">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-black">
            Secure Account Recovery
          </h2>
          <p className="text-black/85 text-base font-semibold max-w-md">
            Lost your credentials? Don&apos;t worry. Input your registered email address and we will instantly generate a secure reset link to recover your access.
          </p>
        </div>

        {/* Footer info */}
        <div className="text-xs font-bold text-black/60 z-10">
          © {new Date().getFullYear()} wacloud.app. All rights reserved. Secure Cloud Application.
        </div>
      </div>

      {/* Right Panel: Pure Dark Form Container */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 relative">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Brand Header */}
          <div className="flex items-center gap-2.5 md:hidden mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 overflow-hidden flex items-center justify-center shadow-lg">
              <img src="/logo.png" alt="WaCloud Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter text-white">wacloud.app</span>
          </div>

          {/* Header */}
          <div className="space-y-2.5">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Recover Password</h1>
            <p className="text-zinc-500 text-sm font-semibold">Enter your email address to generate a secure reset link.</p>
          </div>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-red-500/10 border border-red-500/25 px-5 py-4 rounded-2xl flex items-start gap-4">
              <Key className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-red-400 font-bold text-sm">Recovery Disabled</h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Password recovery is currently disabled. Please contact your system administrator to reset or retrieve your account credentials.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/auth/login"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 px-4 rounded-2xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 group"
              >
                Return to Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
