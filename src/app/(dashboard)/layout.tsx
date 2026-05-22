'use client';

import React, { useState, useEffect } from 'react';
import { Profile, SystemSettings } from '@/lib/types';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { LayoutDashboard, Smartphone, Users, Megaphone, ScrollText, FileText, BarChart3, Webhook, CreditCard, Settings, LogOut, ChevronLeft, ChevronRight, MessageCircle, Shield, MessageSquare, Send, Code, Search } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Overview' },
  { href: '/whatsapp', icon: Smartphone, label: 'WhatsApp' },
  { href: '/send', icon: MessageCircle, label: 'Send Message' },
  { href: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/group-messaging', icon: MessageSquare, label: 'Group Messaging' },
  { href: '/logs', icon: ScrollText, label: 'Message Logs' },
  { href: '/templates', icon: FileText, label: 'Templates' },
  { href: '/sms', icon: Send, label: 'SMS Gateway' },
  { href: '/extractor', icon: Users, label: 'Group Extractor' },
  { href: '/webhooks', icon: Webhook, label: 'Webhooks' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const ADMIN_NAV = [
  { href: '/admin', icon: Shield, label: 'User Management' },
  { href: '/admin/campaigns', icon: Megaphone, label: 'Campaign Monitor' },
  { href: '/admin/settings', icon: Settings, label: 'System Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({});
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return; }
      setUser(data.user);
      
      try {
        const [p, s] = await Promise.all([
          apiFetch(`/api/profiles/${data.user.id}`),
          apiFetch('/api/settings')
        ]);
        setProfile(p);
        setSettings(s.settings || {});
      } catch (err) {
        console.error('Failed to fetch profile/settings in layout:', err);
      }
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        role={profile?.role} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          user={user} 
          profile={profile} 
          onToggleSidebar={() => setCollapsed(!collapsed)} 
        />
        
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
