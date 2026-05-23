'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { MessageCircle, Loader2, CheckCircle, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your typing.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });

      if (data.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Mobile Brand Header */}
      <div className="flex items-center gap-2.5 md:hidden mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
          <MessageCircle className="w-6 h-6 text-black" fill="black" />
        </div>
        <span className="font-extrabold text-xl tracking-tighter text-white">wacloud.app</span>
      </div>

      {/* Header */}
      <div className="space-y-2.5">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Reset Password</h1>
        <p className="text-zinc-500 text-sm font-semibold">Define a secure new password for your account.</p>
      </div>

      {!token ? (
        <div className="bg-red-500/10 border border-red-500/25 px-5 py-4 rounded-2xl space-y-4">
          <p className="text-red-500 text-xs font-bold leading-relaxed">
            Error: The password reset token is missing from the URL. Please verify the link or request a new recovery link.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-extrabold"
          >
            Request recovery link <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : success ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-emerald-500/10 border border-emerald-500/25 px-5 py-4 rounded-2xl flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-emerald-400 font-bold text-sm">Password Reset Successful</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Your password has been successfully updated in our local database. You can now use your new credentials to sign in.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/auth/login"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 px-4 rounded-2xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 group animate-bounce"
            >
              Sign In to Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 rounded-2xl pl-12 pr-12 py-3.5 text-white text-sm font-medium placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner focus:ring-1 focus:ring-emerald-500/50"
                placeholder="New Password (min 6 chars)"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 rounded-2xl pl-12 pr-12 py-3.5 text-white text-sm font-medium placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner focus:ring-1 focus:ring-emerald-500/50"
                placeholder="Confirm New Password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 px-4 py-3 rounded-2xl text-xs font-bold text-red-500 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 px-4 rounded-2xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Update Password
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          <p className="text-center text-zinc-500 text-sm font-semibold pt-2">
            Remembered your credentials?{' '}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">Sign In</Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      
      {/* Left Panel: Emerald Marketing Screen (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-black p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-black/10 rounded-full blur-[120px]" />

        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 z-10">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shadow-2xl">
            <MessageCircle className="w-7 h-7 text-emerald-500" fill="currentColor" />
          </div>
          <span className="font-extrabold text-2xl tracking-tighter text-black">
            wacloud<span className="text-white opacity-90">.app</span>
          </span>
        </Link>

        {/* Hero marketing message */}
        <div className="space-y-6 z-10 my-auto">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-black">
            Complete Your Recovery
          </h2>
          <p className="text-black/85 text-base font-semibold max-w-md">
            Input a strong, secure new password below to secure your credentials. Once updated, your credentials will immediately be updated globally.
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
        
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-semibold uppercase tracking-wider">Loading Recovery Details...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
