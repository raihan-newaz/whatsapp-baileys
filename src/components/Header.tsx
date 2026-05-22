'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Search, User, Settings, CreditCard, Shield, LogOut, Menu, Check } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Profile, Notification } from '@/lib/types';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSocket } from '@/context/SocketContext';

interface HeaderProps {
  user: any | null;
  profile: Profile | null;
  onToggleSidebar: () => void;
}

function formatRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export function Header({ user, profile, onToggleSidebar }: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket } = useSocket();
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Add the new notification to the top of the list
      setNotifications(prev => {
        // Avoid duplicates if any
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  async function fetchNotifications() {
    try {
      const res = await apiFetch(`/api/notifications/${user?.id}`);
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }

  async function handleMarkAllRead() {
    if (!user?.id) return;
    try {
      const res = await apiFetch(`/api/notifications/read-all/${user.id}`, { method: 'POST' });
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2.5 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "btn-icon bg-transparent border-none p-2 rounded-xl transition-colors relative",
              showNotifications ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in duration-200">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-3 w-80 bg-popover border border-border rounded-2xl shadow-2xl z-30 animate-in fade-in zoom-in duration-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <h3 className="font-bold text-foreground text-sm">Notifications</h3>
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto py-1">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => {
                          handleMarkRead(notification.id);
                          // Option: router.push(notification.link) if available
                        }}
                        className={cn(
                          "w-full text-left px-5 py-4 hover:bg-secondary transition-colors relative group",
                          !notification.is_read && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "text-sm font-bold flex-1",
                                notification.is_read ? "text-foreground/70" : "text-foreground"
                              )}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground/60 pt-1">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-5 py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                      <p className="text-xs text-muted-foreground/60">We'll alert you when something happens.</p>
                    </div>
                  )}
                </div>

                <div className="px-2 py-2 border-t border-border bg-muted/30">
                  <button 
                    className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative ml-2">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 pl-2 pr-1 h-10 rounded-2xl hover:bg-secondary transition-colors group"
          >
            <div className="flex flex-col items-end mr-1 hidden sm:flex">
              <span className="text-sm font-semibold text-foreground line-clamp-1">{profile?.full_name || user?.email?.split('@')[0]}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{profile?.role || 'User'}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm border-2 border-border overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
              {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 mt-3 w-64 bg-popover border border-border rounded-2xl shadow-2xl py-2 z-30 animate-in fade-in zoom-in duration-200">
                <div className="px-5 py-4 border-b border-border mb-2">
                  <p className="font-semibold text-foreground text-sm line-clamp-1">{profile?.full_name || 'My Account'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{user?.email}</p>
                  {profile?.plan && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full border border-primary/20">
                      {profile.plan.toUpperCase()} PLAN
                    </span>
                  )}
                </div>

                <div className="px-2 space-y-1">
                  {[
                    { label: 'My Profile', icon: User, href: '/settings' },
                    { label: 'Settings', icon: Settings, href: '/settings' },
                    { label: 'Billing', icon: CreditCard, href: '/billing' },
                    { label: 'Security', icon: Shield, href: '/settings?tab=security' },
                  ].map(item => (
                    <button 
                      key={item.label}
                      onClick={() => { router.push(item.href); setShowProfile(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground rounded-xl transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-border px-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
