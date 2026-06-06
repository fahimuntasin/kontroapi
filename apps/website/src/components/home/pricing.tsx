'use client';

import { useRef } from 'react';
import NextLink from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Self-Hosted',
    price: 'Free',
    description: 'Full source code. AGPL-3.0. Run anywhere.',
    highlighted: true,
    badge: { label: 'Open Source' },
    features: [
      'Unlimited messages',
      'Unlimited sessions',
      'Dashboard UI',
      'REST API',
      'Webhooks',
      'n8n node',
      'Community support',
    ],
    cta: {
      label: 'Get Started',
      href: '/docs',
      variant: 'solid' as const,
      disabled: false,
    },
  },
  {
    name: 'Cloud',
    price: '$49/mo',
    description: 'Managed hosting. We run it so you don\'t have to.',
    highlighted: false,
    badge: { label: 'Coming Soon' },
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
      variant: 'outline' as const,
      disabled: true,
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
      disabled: false,
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

  const renderCta = () => {
    if (tier.cta.disabled) {
      return (
        <span
          className={cn(
            'inline-flex items-center justify-center w-full rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-150 opacity-50 cursor-not-allowed'
          )}
        >
          {tier.cta.label}
        </span>
      );
    }

    if (tier.cta.href.startsWith('/')) {
      return (
        <NextLink
          href={tier.cta.href}
          className={cn(
            'inline-flex items-center justify-center w-full rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-150',
            tier.cta.variant === 'solid'
              ? 'bg-foreground text-background shadow-sm hover:bg-foreground/80 hover:shadow-md'
              : 'border border-border text-foreground hover:border-foreground/20 hover:bg-muted'
          )}
        >
          {tier.cta.label}
        </NextLink>
      );
    }

    return (
      <a
        href={tier.cta.href}
        className={cn(
          'inline-flex items-center justify-center w-full rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-foreground/20 hover:bg-muted'
        )}
      >
        {tier.cta.label}
      </a>
    );
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      className="flex h-full"
    >
      <div
        className={cn(
          'rounded-xl border border-border bg-card p-8 flex flex-col w-full',
          tier.highlighted && 'ring-1 ring-primary/30'
        )}
      >
        {tier.badge && (
          <div className="mb-4">
            <span className="bg-primary/10 text-primary text-xs rounded-full px-3 py-1">
              {tier.badge.label}
            </span>
          </div>
        )}

        <h3 className="text-lg font-semibold">{tier.name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-heading text-3xl font-bold text-foreground">
            {tier.price}
          </span>
        </div>
        <p className="mt-3 text-sm text-default">{tier.description}</p>

        <ul className="mt-8 flex-1 space-y-3">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-default">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {renderCta()}
        </div>
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
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Simple Pricing
          </h2>
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
