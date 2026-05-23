'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  MessageCircle, Smartphone, Users, Megaphone, Send, Inbox, 
  RefreshCcw, FileText, Webhook, BarChart3, Shield, ArrowRight, 
  Check, Play, Sparkles, Code, Zap, Heart, CheckCircle2, ChevronRight, 
  Building, ShoppingCart, Globe, HelpCircle, Star
} from 'lucide-react';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    // Scroll listener for sticky header
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Check if user is authenticated
    const user = localStorage.getItem('local_auth_user');
    if (user) {
      setIsLoggedIn(true);
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-[400px] left-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Sticky Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/80 backdrop-blur-md border-b border-zinc-800/80 py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform duration-300 group-hover:scale-105">
              <MessageCircle className="w-6 h-6 text-black" fill="black" />
            </div>
            <span className="font-bold text-2xl tracking-tighter text-white group-hover:text-emerald-400 transition-colors">
              wacloud<span className="text-emerald-400">.app</span>
            </span>
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#integrations" className="text-sm text-zinc-400 hover:text-white transition-colors">Integrations</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-zinc-400 hover:text-white transition-colors">FAQs</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="relative px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors hidden sm:block"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm shadow-[0_4px_20px_rgba(16,185,129,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 md:pt-44 pb-20 px-6 max-w-7xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          The Ultimate WhatsApp Marketing Automation
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
          Supercharge Customer Outreach with <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">WhatsApp Cloud API</span>
        </h1>
        
        <p className="text-zinc-400 text-lg md:text-xl max-w-3xl mx-auto mt-6 leading-relaxed">
          Broadcast campaigns, automate support queries, instantly sync WooCommerce updates, and build developer APIs. Securely connect multiple numbers with zero hassle.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link 
            href={isLoggedIn ? "/dashboard" : "/auth/signup"} 
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-[0_4px_30px_rgba(16,185,129,0.3)] hover:scale-[1.03] transition-all flex items-center justify-center gap-2 group"
          >
            {isLoggedIn ? "Go to Dashboard" : "Start 3-Day Free Trial"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a 
            href="#features" 
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            Explore Features
          </a>
        </div>

        {/* Floating Premium Dashboard Mockup */}
        <div className="mt-20 relative rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-2xl backdrop-blur-sm max-w-5xl mx-auto group hover:border-emerald-500/20 transition-all duration-700">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4 px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="w-1/3 bg-zinc-900 text-zinc-500 text-[10px] py-1 rounded-lg text-center border border-zinc-800">
              wacloud.app/dashboard
            </div>
            <div className="w-4" />
          </div>
          
          {/* Simulated Premium Dashboard UI */}
          <div className="aspect-[16/10] bg-zinc-900/60 rounded-xl overflow-hidden grid grid-cols-[200px_1fr] text-left border border-zinc-800/80">
            {/* Sidebar */}
            <div className="border-r border-zinc-800 p-4 space-y-4 bg-black/40 hidden sm:block">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold">W</div>
                <span className="font-semibold text-sm">wacloud</span>
              </div>
              <div className="space-y-1.5">
                {['Dashboard', 'Connections', 'Campaigns', 'Inbox', 'WooCommerce', 'API Gateway'].map((item, idx) => (
                  <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${idx === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-emerald-400' : 'bg-transparent'}`} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {/* Main Area */}
            <div className="p-6 space-y-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Campaign Analytics</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Real-time delivery monitor</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connection Live
                </div>
              </div>
              
              {/* Quick stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l: 'Sent Messages', v: '142,850', c: 'text-emerald-400' },
                  { l: 'Delivery Rate', v: '99.2%', c: 'text-teal-400' },
                  { l: 'WooCommerce Sales', v: '$42,500', c: 'text-blue-400' },
                  { l: 'Active Instances', v: '15 / 20', c: 'text-purple-400' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-black/30 border border-zinc-850 p-4 rounded-xl">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">{s.l}</p>
                    <p className={`text-xl font-bold mt-1.5 tracking-tight ${s.c}`}>{s.v}</p>
                  </div>
                ))}
              </div>

              {/* Chart Placeholder */}
              <div className="bg-black/40 border border-zinc-850 rounded-xl p-4 flex-1 h-[220px] flex flex-col justify-end gap-1 relative overflow-hidden">
                <div className="absolute top-4 left-4 flex items-center gap-4 text-xs font-semibold text-zinc-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Delivered</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-700" /> Pending</span>
                </div>
                <div className="flex items-end justify-between h-[120px] px-2 border-b border-zinc-800">
                  {[20, 45, 28, 60, 52, 75, 45, 90, 80, 110, 95, 120].map((h, i) => (
                    <div key={i} className="w-[6%] flex flex-col justify-end h-full group/bar relative">
                      <div className="bg-zinc-800 rounded-t-sm w-full group-hover/bar:bg-zinc-700 transition-colors" style={{ height: `${h * 0.4}%` }} />
                      <div className="bg-emerald-500 rounded-t-sm w-full absolute bottom-0 hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-colors" style={{ height: `${h * 0.6}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[9px] text-zinc-600 font-semibold px-2 pt-1">
                  <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="border-t border-b border-zinc-800 bg-zinc-950/20 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-white">5M+</p>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-2">Messages Delivered</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-emerald-400">99.9%</p>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-2">Uptime SLA</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-white">12,000+</p>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-2">Active Businesses</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-emerald-400">4.9/5</p>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-2">Customer Rating</p>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Designed for Scale</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mt-2">
            Powerful features to drive customer relationships
          </h2>
          <p className="text-zinc-400 mt-4 text-base">
            Equipped with all the tools required for premium bulk messaging, live notifications, dynamic auto replying and complete Woo integration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Smartphone,
              title: 'Multi-Device QR Connection',
              desc: 'Seamlessly link multiple WhatsApp accounts via a responsive, secure QR code scan interface. Sync chats in real-time.',
              color: 'text-blue-400 bg-blue-500/10'
            },
            {
              icon: Megaphone,
              title: 'Smart Bulk Broadcasts',
              desc: 'Reach thousands of verified contacts concurrently. Schedule messaging arrays and track live delivery metrics.',
              color: 'text-purple-400 bg-purple-500/10'
            },
            {
              icon: RefreshCcw,
              title: 'Auto-Reply Rules & AI',
              desc: 'Craft customized keyword replies or enable fully automated AI responses with dynamic chat support pipelines.',
              color: 'text-emerald-400 bg-emerald-500/10'
            },
            {
              icon: ShoppingCart,
              title: 'WooCommerce Automation',
              desc: 'Send order status updates, transactional invoices, tracking links and cart abandonment reminders instantly.',
              color: 'text-teal-400 bg-teal-500/10'
            },
            {
              icon: Code,
              title: 'Robust Developer API',
              desc: 'Send messages, check number registration, and intercept live webhooks using highly secure authorization tokens.',
              color: 'text-orange-400 bg-orange-500/10'
            },
            {
              icon: Inbox,
              title: 'Unified Cloud Inbox',
              desc: 'Manage all incoming WhatsApp messages within a stunning multi-agent unified chat layout. Perfect for support agents.',
              color: 'text-red-400 bg-red-500/10'
            }
          ].map((f, i) => (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800/80 p-8 rounded-2xl hover:border-emerald-500/20 hover:bg-zinc-900/60 transition-all duration-300 group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color} mb-6 transition-transform group-hover:scale-105`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integration Showcase Section */}
      <section id="integrations" className="py-20 border-t border-zinc-900 bg-zinc-950/20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Ecosystem Sync</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Plugs right into the tools you already love
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Connect wacloud.app with your ecommerce storefront, CRM manager, custom developer pipelines or automated web applications in a few simple clicks.
            </p>
            <div className="space-y-4 pt-2">
              {[
                'Instant WooCommerce transactional triggers',
                'API gateway compatible with custom codebases',
                'Incoming message webhooks dynamically parsed',
                'Comprehensive failover options via SMS integrations'
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-zinc-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
          
          {/* visual connector */}
          <div className="relative border border-zinc-800 bg-zinc-900/10 rounded-3xl p-8 aspect-square max-w-md mx-auto flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="w-24 h-24 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] z-10">
              <MessageCircle className="w-12 h-12 text-black" fill="black" />
            </div>
            
            {/* outer rings */}
            <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-zinc-850 animate-[spin_60s_linear_infinite]" />
            <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-zinc-800/40 animate-[spin_90s_linear_infinite_reverse]" />
            
            {/* surrounding nodes */}
            {[
              { icon: ShoppingCart, label: 'WooCommerce', pos: 'top-10 left-10' },
              { icon: Globe, label: 'Webhooks', pos: 'top-10 right-10' },
              { icon: Code, label: 'REST API', pos: 'bottom-10 left-10' },
              { icon: Send, label: 'SMS Gateway', pos: 'bottom-10 right-10' }
            ].map((node, idx) => (
              <div key={idx} className={`absolute ${node.pos} flex flex-col items-center gap-2 group z-20`}>
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 flex items-center justify-center transition-colors shadow-lg cursor-pointer group-hover:scale-105">
                  <node.icon className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 tracking-wider uppercase">{node.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest font-mono">Simple Billing</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Plans built to fit your business capacity
          </h2>
          <p className="text-zinc-400 text-base">
            Start completely free, no credit card required. Upgrade anytime for higher connection caps and unlimited broadcasts.
          </p>
          
          {/* Toggle Period */}
          <div className="inline-flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl mt-6">
            <button 
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                billingPeriod === 'monthly' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                billingPeriod === 'yearly' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Yearly <span className="text-[9px] font-bold uppercase ml-1 opacity-90">(Save 20%)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Solo Trial',
              desc: 'Perfect to test our capabilities.',
              price: '0',
              badge: '3-Day Trial',
              popular: false,
              cta: 'Get Started Free',
              features: [
                '1 Active WhatsApp Connection',
                '200 Messages Daily Cap',
                '50 Verified Contact limit',
                'Standard Auto-Reply rules',
                '20MB Media Gallery storage',
                'Standard Support'
              ]
            },
            {
              name: 'Business Pro',
              desc: 'High-performing platform for growing companies.',
              price: billingPeriod === 'monthly' ? '29' : '23',
              badge: 'Most Popular',
              popular: true,
              cta: 'Upgrade to Pro',
              features: [
                '5 Active WhatsApp Connections',
                '10,000 Messages Daily Cap',
                '50,000 Contact capacity',
                'Advanced AI Auto-Responder',
                'WooCommerce Order Sync',
                '1GB Media Gallery storage',
                '24/7 Priority Support'
              ]
            },
            {
              name: 'Enterprise',
              desc: 'Ultimate capacity for maximum outreach.',
              price: billingPeriod === 'monthly' ? '79' : '63',
              badge: 'High Capacity',
              popular: false,
              cta: 'Get Enterprise Now',
              features: [
                '20 Active WhatsApp Connections',
                '50,000 Messages Daily Cap',
                '250,000 Contact capacity',
                'Full Developer API & Webhooks',
                'WooCommerce abandonment loops',
                '5GB Media Gallery storage',
                'Dedicated Account Manager'
              ]
            }
          ].map((plan, i) => (
            <div 
              key={i} 
              className={`relative rounded-3xl p-8 bg-zinc-950/60 border ${
                plan.popular ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-zinc-900/20' : 'border-zinc-800'
              } flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]`}
            >
              {plan.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-extrabold uppercase px-4 py-1 rounded-full tracking-wider shadow-lg">
                  {plan.badge}
                </span>
              )}
              
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {!plan.popular && plan.badge && (
                    <span className="bg-zinc-800 text-zinc-400 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{plan.desc}</p>
                
                {/* Price Display */}
                <div className="flex items-baseline mt-6 mb-8">
                  <span className="text-4xl md:text-5xl font-black text-white">${plan.price}</span>
                  <span className="text-zinc-500 text-sm font-semibold ml-2">/ month</span>
                </div>

                <div className="border-t border-zinc-900 pt-6 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs font-semibold text-zinc-300">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        plan.popular ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900 text-zinc-400'
                      }`}>
                        <Check className="w-3 h-3" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              
              <Link 
                href={isLoggedIn ? "/dashboard" : "/auth/signup"} 
                className={`w-full text-center py-4 rounded-2xl mt-8 font-bold text-sm transition-all ${
                  plan.popular 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:scale-[1.02]' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white hover:scale-[1.02]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 border-t border-zinc-900 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Reviews</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-2 tracking-tight">Approved by thousands</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              quote: 'Connecting WooCommerce orders directly to customer WhatsApp alerts completely transformed our delivery pipeline. Returns dropped by 24% in weeks!',
              author: 'Raihan Newaz',
              role: 'Product Lead, Arabic Shop',
              rating: 5
            },
            {
              quote: 'The API setup is robust and secure. Sending transactional messages via HttpOnly sessions has significantly optimized our platform compliance.',
              author: 'Sarah Jenkins',
              role: 'Lead Architect, FinTech Lab',
              rating: 5
            },
            {
              quote: 'WACloud unified dashboard is amazing. Multi-agent inbox keeps all our support reps on exactly the same page without chat collisions.',
              author: 'Ali Al-Hasan',
              role: 'Customer Care Lead, GulfStore',
              rating: 5
            }
          ].map((t, idx) => (
            <div key={idx} className="bg-zinc-950/40 border border-zinc-850 p-8 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex gap-1">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed italic">"{t.quote}"</p>
              </div>
              <div className="border-t border-zinc-900 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{t.author}</p>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase mt-0.5">{t.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  {t.author.charAt(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 max-w-4xl mx-auto space-y-16 border-t border-zinc-900">
        <div className="text-center">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Have Questions?</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-2">Frequently Asked Questions</h2>
        </div>
        
        <div className="space-y-4">
          {[
            {
              q: 'Is it completely safe to link my WhatsApp number?',
              a: 'Yes! We use standard web session mechanisms over WhiskeySockets Baileys which emulates standard web browser connections. To remain 100% compliant, make sure you send messages at safe intervals to prevent user spam reports.'
            },
            {
              q: 'Can I connect multiple WhatsApp instances concurrently?',
              a: 'Absolutely. Depending on the plan limits (Solo allows 1 connection, Pro allows 5, and Enterprise allows 20), you can scan QR codes and connect completely independent accounts concurrently.'
            },
            {
              q: 'How does WooCommerce automation sync up?',
              a: 'Our WooCommerce system works by hooking into standard status hooks on order status changes. You can set customized transactional message templates for checkout, cart abandonment, updates, and more.'
            },
            {
              q: 'Can I use developer APIs on all subscription plans?',
              a: 'Developer API access and live webhook endpoints are enabled for Pro and Enterprise subscribers. The Solo trial allows checking features manually.'
            }
          ].map((faq, i) => (
            <div key={i} className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl space-y-2">
              <h4 className="text-base font-bold text-white flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                {faq.q}
              </h4>
              <p className="text-zinc-400 text-sm leading-relaxed pl-7">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Wrapper */}
      <section className="py-20 border-t border-zinc-900 text-center max-w-5xl mx-auto px-6 space-y-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        <h2 className="text-3xl md:text-6xl font-extrabold text-white tracking-tight leading-none">
          Ready to experience the future?
        </h2>
        <p className="text-zinc-400 max-w-2xl mx-auto text-base">
          Start your 3-day full feature trial today. Link your WhatsApp account in less than a minute and supercharge your customer lifetime value.
        </p>
        <div className="pt-4">
          <Link 
            href={isLoggedIn ? "/dashboard" : "/auth/signup"} 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-[0_4px_35px_rgba(16,185,129,0.3)] hover:scale-[1.03] transition-all group"
          >
            {isLoggedIn ? "Go to Dashboard" : "Sign Up Free & Start Scanning"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-black/60 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
          
          {/* Col 1 */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-black" fill="black" />
              </div>
              <span className="font-bold text-xl tracking-tighter text-white">wacloud<span className="text-emerald-400">.app</span></span>
            </Link>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Premium bulk messaging and Cloud API automation SaaS. Grow conversions and build lifetime retention.
            </p>
            <p className="text-[10px] text-zinc-600 font-semibold flex items-center gap-1.5 pt-2">
              Made with <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" /> by Antigravity Team.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-4">
            <h5 className="text-white text-xs font-bold uppercase tracking-widest font-mono">Product</h5>
            <div className="flex flex-col gap-2.5 text-xs text-zinc-500 font-semibold uppercase">
              <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing Options</a>
              <a href="#integrations" className="hover:text-emerald-400 transition-colors">Integrations</a>
              <a href="/auth/signup" className="hover:text-emerald-400 transition-colors">Free trial</a>
            </div>
          </div>

          {/* Col 3 */}
          <div className="space-y-4">
            <h5 className="text-white text-xs font-bold uppercase tracking-widest font-mono">Developer</h5>
            <div className="flex flex-col gap-2.5 text-xs text-zinc-500 font-semibold uppercase">
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">API Reference</span>
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">System Status</span>
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">Webhooks Setup</span>
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">Documentation</span>
            </div>
          </div>

          {/* Col 4 */}
          <div className="space-y-4">
            <h5 className="text-white text-xs font-bold uppercase tracking-widest font-mono">Legal</h5>
            <div className="flex flex-col gap-2.5 text-xs text-zinc-500 font-semibold uppercase">
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">GDPR Compliance</span>
              <span className="hover:text-emerald-400 transition-colors cursor-pointer">Support Desk</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-zinc-900 mt-12 pt-8 text-center text-zinc-600 text-xs">
          © {new Date().getFullYear()} wacloud.app. All rights reserved. Registered SaaS product.
        </div>
      </footer>
    </div>
  );
}
