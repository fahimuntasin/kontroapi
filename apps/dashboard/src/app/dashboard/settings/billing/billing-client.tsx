'use client';

import { useEffect, useState } from 'react';
import { getPlans, getSubscription, getUsage, Plan, Subscription, Usage } from '@/lib/wa-engine/client';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { StatusPulse } from '@/components/layout/status-pulse';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, CreditCard, BarChart3, Smartphone } from 'lucide-react';

export default function BillingClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');
  const status = searchParams.get('status');
  const invoiceId = searchParams.get('invoice_id');

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (checkoutStatus === 'success' || status === 'success') {
      toast.success(invoiceId ? `Payment received! Invoice ${invoiceId.slice(0, 12)}…` : 'Payment successful!');
      loadData();
    } else if (checkoutStatus === 'cancelled' || status === 'cancelled') {
      toast.info('Checkout cancelled.');
    } else if (status === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
  }, [checkoutStatus, status, invoiceId]);

  async function loadData() {
    try {
      const [plansData, subData, usageData] = await Promise.all([getPlans(), getSubscription(), getUsage()]);
      setPlans(plansData);
      setSubscription(subData);
      setUsage(usageData);
    } catch { toast.error('Failed to load billing data'); }
    finally { setLoading(false); }
  }

  async function handleUpgrade(planId: string) {
    setCheckoutLoading(planId);
    try {
      const result = await createCheckout(planId);
      if (result.success && (result.data.checkout_url || result.data.redirect_url)) {
        window.location.href = result.data.checkout_url ?? result.data.redirect_url;
      } else toast.error('Failed to create checkout');
    } catch { toast.error('Failed to create checkout'); }
    finally { setCheckoutLoading(null); }
  }

  const currentPlanId = subscription?.plan_id || 'trial';
  const sessionUsage = usage?.sessions?.current ?? 0;
  const sessionLimit = usage?.sessions?.limit ?? 1;
  const messageUsage = usage?.messages_today?.current ?? 0;
  const messageLimit = usage?.messages_today?.limit ?? 50;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Manage your subscription and view usage.</p>
        </div>
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Manage your subscription and view usage.</p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-semibold text-foreground capitalize">{subscription?.plan_name || 'Trial'}</span>
                  <Badge variant={subscription?.status === 'active' || !subscription ? 'default' : 'destructive'} className="text-[10px]">
                    {subscription?.status || 'active'}
                  </Badge>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {sessionUsage} of {sessionLimit} sessions used · {messageUsage} messages today
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <StatusPulse status="connected" />
              <span className="text-[12px] font-medium text-primary">Active</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-[12px] font-medium text-muted-foreground mb-1.5">
                <div className="flex items-center gap-1.5"><Smartphone className="h-3 w-3" /> Sessions</div>
                <span>{sessionUsage} / {sessionLimit}</span>
              </div>
              <Progress value={Math.min((sessionUsage / sessionLimit) * 100, 100)} className="h-2" />
            </div>
            {messageLimit && (
              <div>
                <div className="flex justify-between text-[12px] font-medium text-muted-foreground mb-1.5">
                  <div className="flex items-center gap-1.5"><BarChart3 className="h-3 w-3" /> Messages Today</div>
                  <span>{messageUsage} / {messageLimit}</span>
                </div>
                <Progress value={Math.min((messageUsage / messageLimit) * 100, 100)} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const currentPlan = plans.find(p => p.id === currentPlanId);
          const isUpgrade = plan.price > (currentPlan?.price || 0);
          return (
            <Card key={plan.id} className={`transition-all hover:shadow-card ${isCurrent ? 'border-primary/30 shadow-glow' : 'border-border/50'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-[15px] font-medium capitalize">{plan.name}</CardTitle>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[24px] font-semibold tracking-tight text-foreground">{plan.price === 0 ? 'Free' : `৳${plan.price}`}</span>
                      {plan.price > 0 && <span className="text-[13px] text-muted-foreground">/mo</span>}
                    </div>
                    <CardDescription className="text-[12px] mt-1">
                      {plan.session_limit} session{plan.session_limit > 1 ? 's' : ''} · {plan.daily_msg ? `${plan.daily_msg}/day` : 'Unlimited'}
                    </CardDescription>
                  </div>
                  {isCurrent && <Badge className="text-[10px] font-medium">Current</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <Separator className="mb-4" />
                <ul className="space-y-2">
                  {plan.features?.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button disabled variant="outline" className="mt-5 w-full rounded-lg" size="sm">Current Plan</Button>
                ) : (
                  <Button onClick={() => handleUpgrade(plan.id)} disabled={checkoutLoading === plan.id} className="mt-5 w-full rounded-lg" size="sm">
                    {checkoutLoading === plan.id ? 'Processing...' : isUpgrade ? 'Upgrade' : 'Switch Plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

async function createCheckout(planId: string) {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id: planId }),
  });
  return res.json();
}