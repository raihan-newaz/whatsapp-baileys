'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { CreditCard, Check, Shield, Loader2 } from 'lucide-react';

const PLANS = [
  {
    name: 'Free Trial', price: '$0', period: '7 days',
    color: 'border-orange-500/20 bg-orange-500/5', badge: 'bg-orange-500 text-white',
    features: ['1 WhatsApp account', '100 messages/day', 'Basic analytics', 'CSV import'],
    cta: 'Current Plan',
  },
  {
    name: 'Pro', price: '$19', period: '/month',
    color: 'border-primary/50', badge: 'bg-primary/20 text-primary', popular: true,
    features: ['3 WhatsApp accounts', '1,000 messages/day', 'Advanced analytics', 'Excel export', 'WooCommerce integration', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    name: 'Agency', price: '$49', period: '/month',
    color: 'border-purple-500/50', badge: 'bg-purple-500/20 text-purple-400 dark:text-purple-500',
    features: ['Unlimited accounts', 'Unlimited messages', 'All Pro features', 'Custom branding', 'API access', 'Dedicated support'],
    cta: 'Upgrade to Agency',
  },
];

export default function BillingPage() {
  const [role, setRole] = useState<string>('user');
  const [userPlan, setUserPlan] = useState<string>('free_trial');
  const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      try {
        const [profile, settingsData] = await Promise.all([
          apiFetch(`/api/profiles/${data.user.id}`),
          apiFetch('/api/settings/billing_limits')
        ]);

        setRole(profile?.role || 'user');
        setUserPlan(profile?.plan || 'free_trial');

        if (settingsData?.value) {
          const limits = settingsData.value;
          const mappedPlans = Object.keys(limits)
            .filter(key => key !== 'admin' && key !== 'free' && key !== 'free_trial') // Skip admin and free from main cards
            .map(key => ({
              id: key,
              name: limits[key].name || key,
              monthly_price: limits[key].monthly_price || limits[key].price || '$0',
              yearly_price: limits[key].yearly_price || '$0',
              period: billingCycle === 'monthly' ? '/month' : '/year',
              color: key === 'pro' || key === 'business' ? 'border-primary/50' : 'border-border',
              badge: key === 'pro' || key === 'business' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground',
              popular: key === 'pro',
              features: limits[key].features || [],
              cta: 'Upgrade Now'
            }));
          
          // Sort to ensure Starter -> Pro -> Business -> Enterprise
          const order = ['starter', 'pro', 'business', 'enterprise'];
          mappedPlans.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

          setDynamicPlans(mappedPlans);
        }
      } catch (err) {
        console.error('Failed to fetch billing data:', err);
      } finally {
        setLoading(false);
      }
    });
  }, [billingCycle]);

  const isAdmin = role === 'admin';

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (isAdmin) {
    return (
      <div className="p-4 md:p-8 min-h-screen pb-24">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-yellow-500" /> Billing & Plans
          </h1>
          <p className="text-muted-foreground mt-1">Your account billing details</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-primary/10 border border-purple-500/30 rounded-2xl p-8 flex items-center gap-6 max-w-3xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center flex-shrink-0">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-semibold text-foreground">Administrator Account</span>
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs rounded-full font-medium">Unlimited</span>
            </div>
            <p className="text-muted-foreground text-sm">You have full access to all features — unlimited accounts, unlimited messages, all integrations, and admin controls. No billing required.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['Unlimited WhatsApp accounts', 'Unlimited messages', 'All integrations', 'Admin panel', 'API access', 'Priority support'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  <Check className="w-3 h-3" /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-yellow-500" /> Billing & Plans
          </h1>
          <p className="text-muted-foreground mt-1">Choose the plan that fits your business</p>
        </div>

        {/* Monthly/Yearly Toggle */}
        <div className="flex items-center bg-secondary border border-border p-1 rounded-xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-lg transition ${billingCycle === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-lg transition flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Yearly
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Save 35%+</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        {dynamicPlans.map((plan, i) => (
          <div key={plan.id} className={`bg-card border-2 ${plan.color} rounded-2xl p-6 relative flex flex-col ${plan.popular ? 'ring-2 ring-primary/30' : ''}`}>
            {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">Most Popular</div>}
            <div className={`inline-block self-start px-3 py-1 rounded-full text-xs font-medium ${plan.badge} mb-4`}>{plan.name}</div>
            <div className="mb-5">
              <span className="text-4xl font-semibold text-foreground">{billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              {plan.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.id === userPlan}
              className={
                plan.id === userPlan
                  ? 'btn-secondary !bg-secondary/50 !text-muted-foreground cursor-not-allowed'
                  : plan.popular
                    ? 'btn-primary'
                    : 'btn-secondary'
              }
            >
              {plan.id === userPlan ? 'Current Plan' : plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
