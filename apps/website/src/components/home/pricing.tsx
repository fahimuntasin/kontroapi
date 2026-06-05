'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Self-Hosted',
    price: 'Free',
    description: 'Full source code. AGPL-3.0. Run anywhere.',
    highlighted: true,
    features: [
      'Unlimited messages',
      'Unlimited sessions',
      'Dashboard UI',
      'REST API',
      'Webhooks',
      'n8n node',
      'Community support',
    ],
    cta: { label: 'Get Started', href: '/docs', variant: 'outline' as const },
  },
  {
    name: 'Cloud',
    price: '$49/mo',
    description: 'Managed hosting. We run it so you don&apos;t have to.',
    highlighted: false,
    badge: 'Popular',
    features: [
      'Everything in Self-Hosted',
      'Managed hosting',
      'Automatic updates',
      '99.9% SLA',
      'Priority support',
      'SMS gateway included',
    ],
    cta: {
      label: 'Coming Soon',
      href: '#',
      variant: 'disabled' as const,
    },
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Volume pricing, dedicated support, custom integrations.',
    highlighted: false,
    features: [
      'Everything in Cloud',
      'Dedicated infra',
      'Custom SLA',
      'White-label',
      'SSO',
      'Phone support',
    ],
    cta: {
      label: 'Contact Us',
      href: 'mailto:team@kontroapi.com',
      variant: 'outline' as const,
    },
  },
];

function PricingCard({
  tier,
  index,
}: {
  tier: (typeof tiers)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      className={cn(
        'glass-card relative flex flex-col rounded-2xl p-6 sm:p-8',
        tier.highlighted && 'animate-glow border-accent-blue-bright/40'
      )}
    >
      {tier.badge && (
        <span className="absolute -top-3 right-4 rounded-full bg-accent-blue px-3 py-1 text-xs font-semibold text-white">
          {tier.badge}
        </span>
      )}

      <h3 className="font-heading text-lg font-semibold text-foreground">
        {tier.name}
      </h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-heading text-3xl font-bold text-foreground">
          {tier.price}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>

      <ul className="mt-8 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue-bright" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {tier.cta.variant === 'disabled' ? (
          <span
            className={cn(
              'inline-flex w-full items-center justify-center rounded-xl',
              'border border-border/50 px-6 py-3 text-sm font-medium',
              'text-muted-foreground/40 cursor-not-allowed'
            )}
          >
            {tier.cta.label}
          </span>
        ) : tier.cta.variant === 'outline' ? (
          <Link
            href={tier.cta.href}
            className={cn(
              'inline-flex w-full items-center justify-center',
              tier.highlighted
                ? 'cta-button'
                : 'cta-button-outline border-accent-blue-bright/30 text-accent-blue-bright hover:bg-accent-blue-soft'
            )}
          >
            {tier.cta.label}
          </Link>
        ) : null}
      </div>
    </motion.div>
  );
}

export function Pricing() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} id="pricing" className="px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-7xl"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-heading font-heading">Simple Pricing</h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <PricingCard key={tier.name} tier={tier} index={index} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
