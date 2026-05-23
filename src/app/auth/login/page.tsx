'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { MessageCircle, Loader2, CheckCircle, ArrowRight, Chrome, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { 
      setError(error.message); 
      setLoading(false); 
      return; 
    }
    router.push('/dashboard');
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithGoogle();
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      
      {/* Left Panel: Emerald Marketing Screen (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-black p-16 flex-col justify-between relative overflow-hidden">
        {/* Glow decoration */}
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
        <div className="space-y-8 z-10 my-auto">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-black">
            Grow your business with the power of WhatsApp Cloud API
          </h2>
          <p className="text-black/85 text-base font-semibold max-w-md">
            Link your phone in seconds, broadcast personalized promotional alerts, sync WooCommerce checkout actions, and retain customer lifetime value instantly.
          </p>

          <div className="space-y-4 pt-4">
            {[
              'Connect multiple WhatsApp numbers concurrently',
              'Schedule bulk message broadcasts with zero ban risk',
              'Configure automated keyword & AI replies',
              'Integrate WooCommerce storefronts in 1-click'
            ].map((text, idx) => (
              <div key={idx} className="flex items-start gap-3.5 text-sm font-bold text-black/90">
                <CheckCircle className="w-5.5 h-5.5 text-black flex-shrink-0 mt-0.5" fill="white" />
                <span>{text}</span>
              </div>
            ))}
          </div>
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
          
          {/* Header */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 md:hidden mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <MessageCircle className="w-6 h-6 text-black" fill="black" />
              </div>
              <span className="font-extrabold text-xl tracking-tighter text-white">wacloud.app</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Welcome back</h1>
            <p className="text-zinc-500 text-sm font-semibold">Sign in to your dashboard to monitor your campaigns.</p>
          </div>



          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm font-medium placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                <Link href="/auth/forgot-password" className="text-xs font-bold text-emerald-400 hover:text-emerald-300">Forgot Password?</Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm font-medium placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              disabled={loading || googleLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 px-4 rounded-2xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Redirect link */}
          <p className="text-center text-zinc-500 text-sm font-semibold">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
