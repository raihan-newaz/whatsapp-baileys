'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Smartphone, Users, Megaphone, ScrollText, 
  FileText, BarChart3, Webhook, CreditCard, Settings, LogOut, 
  ChevronDown, MessageCircle, MessageSquare, 
  Search, Shield, HelpCircle, ChevronLeft, ChevronRight, Grid,
  Send, Inbox, RefreshCcw, Image as ImageIcon, ShoppingCart, UserPlus, CheckCircle2
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  role?: string;
}

const SIDEBAR_MENU = [
  { type: 'link', href: '/dashboard', icon: Grid, label: 'Dashboard' },
  { 
    type: 'group', 
    label: 'Setup', 
    icon: Settings,
    items: [
      { href: '/whatsapp', label: 'Connections', icon: Smartphone },
      { href: '/sms-gateways', label: 'SMS Gateways', icon: MessageSquare },
      { href: '/developer', label: 'Developer API', icon: ScrollText },
    ]
  },
  {
    type: 'group',
    label: 'Messaging',
    icon: MessageSquare,
    items: [
      { href: '/send', label: 'Send Message', icon: Send },
      { href: '/inbox', label: 'Inbox', icon: Inbox },
      { href: '/group-messaging', label: 'Group Messaging', icon: Users },
      { href: '/logs', label: 'Messages Logs', icon: ScrollText },
      { href: '/auto-reply', label: 'Auto Reply', icon: RefreshCcw },
      { href: '/templates', label: 'Templates', icon: FileText },
      { href: '/media', label: 'Media Gallery', icon: ImageIcon },
      { href: '/webhooks', label: 'Webhooks', icon: Webhook },
    ]
  },
  {
    type: 'group',
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { href: '/contacts', label: 'Contacts', icon: Users },
      { href: '/woocommerce', label: 'WooCommerce', icon: ShoppingCart },
    ]
  },
  { type: 'link', href: '/analytics', icon: BarChart3, label: 'Analytics' },
  {
    type: 'group',
    label: 'Tools',
    icon: Users,
    items: [
      { href: '/extractor', label: 'Group Extractor', icon: UserPlus },
      { href: '/tools/number-checker', label: 'Number Checker', icon: CheckCircle2 },
    ]
  },
  {
    type: 'group',
    label: 'Account',
    icon: CreditCard,
    items: [
      { href: '/billing', label: 'Billing', icon: CreditCard },
      { href: '/settings', label: 'Settings', icon: Settings },
    ]
  },
  { type: 'link', href: '/support', icon: HelpCircle, label: 'Support' },
];

const ADMIN_ITEMS = [
  { href: '/admin', icon: Shield, label: 'User Management' },
  { href: '/admin/settings', icon: Settings, label: 'System Settings' },
];

export function Sidebar({ collapsed, setCollapsed, role }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => 
      prev.includes(label) ? [] : [label]
    );
  };

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} flex flex-col bg-card border-r border-border text-card-foreground transition-all duration-300 flex-shrink-0 z-20 shadow-xl overflow-hidden`}>
      {/* Logo Area */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
          <MessageCircle className="w-6 h-6 text-primary-foreground" fill="currentColor" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-foreground text-2xl tracking-tighter">wacloud</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto sidebar-scroll">
        {SIDEBAR_MENU.map((item) => {
          if (item.type === 'link') {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href || '#'}
                className={`flex items-center gap-3 px-4 h-10 rounded-lg transition-all duration-300 group
                  ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'}`} strokeWidth={2.5} />
                {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          }

          if (item.type === 'group') {
            const isGroupOpen = openGroups.includes(item.label);
            const hasActiveItem = item.items?.some(sub => pathname === sub.href);

            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`flex items-center justify-between w-full px-4 h-10 rounded-lg transition-all duration-300 group
                    ${hasActiveItem ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className={`w-5 h-5 flex-shrink-0 ${hasActiveItem ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'}`} strokeWidth={2.5} />}
                    {!collapsed && <span className={`text-sm whitespace-nowrap ${hasActiveItem ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isGroupOpen ? 'rotate-90' : ''}`} />
                  )}
                </button>

                {!collapsed && isGroupOpen && (
                  <div className="pl-12 space-y-1 py-1">
                    {item.items?.map((sub) => {
                      const active = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center gap-2.5 px-4 h-9 rounded-lg transition-all duration-200 text-sm group
                            ${active ? 'bg-primary/5 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                        >
                          {sub.icon && <sub.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'}`} strokeWidth={2} />}
                          <span className="whitespace-nowrap">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}

        {/* Admin Section */}
        {role === 'admin' && (
          <div className="pt-6 mt-6 border-t border-border space-y-2 mb-4">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">Admin Panel</p>}
            {ADMIN_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 h-10 rounded-lg transition-all duration-300 group
                    ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'}`} strokeWidth={2.5} />
                  {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Collapse Bottom */}
      <div className="p-4 border-t border-border mt-auto">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-lg bg-secondary border border-border hover:bg-secondary/80 text-secondary-foreground transition-all group"
        >
          <div className="flex items-center justify-center group-hover:scale-110 transition-transform">
            <ChevronLeft className={`w-5 h-5 transition-transform duration-500 ${collapsed ? 'rotate-180' : ''}`} />
          </div>
          {!collapsed && <span className="font-medium text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
