'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

const VAPID_PUBLIC_KEY = 'BMAkOyezbU9ZTaLKcFaPBZ_DAqhiIfQkxZ2xYpe7eJRZqrp7kvhgdDjYFzvEFEtOcelMAI8lMjw34Mb-0J7eAFw';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this browser.');
      return;
    }

    const registerAndSubscribe = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user profile to check settings
        const profile = await apiFetch(`/api/profiles/${user.id}`);
        const settings = typeof profile?.notification_settings === 'string'
          ? JSON.parse(profile.notification_settings)
          : profile?.notification_settings;

        // Only proceed if push is enabled in settings
        if (settings?.push === false) {
          console.log('Push notifications are disabled in user settings.');
          return;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Check permission - Only request if app settings say it's okay
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') return;

        // Subscribe to push
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }

        // Send to backend
        const subData = JSON.parse(JSON.stringify(subscription));
        await apiFetch(`/api/profiles/${user.id}/subscribe`, {
          method: 'POST',
          body: JSON.stringify({ subscription: subData })
        });

      } catch (err) {
        console.error('Error registering service worker or subscribing:', err);
      }
    };

    registerAndSubscribe();
  }, []);

  return <>{children}</>;
}
