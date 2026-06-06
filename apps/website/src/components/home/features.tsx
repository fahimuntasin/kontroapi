'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Server, Zap, Shield, Layout, Puzzle, MessageCircle } from 'lucide-react';

const features = [
  {
    icon: Server,
    title: 'Self-Hosted',
    description:
      'Deploy anywhere. Your infra, your rules. Docker compose up in 30 seconds.',
  },
  {
    icon: Zap,
    title: 'Instant Messaging',
    description:
      'Send & receive WhatsApp via REST API. Queue-based with BullMQ + Redis.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description:
      'API key auth, JWT tokens, webhook signature verification, rate limiting.',
  },
  {
    icon: Layout,
    title: 'Dashboard UI',
    description:
      'Manage sessions, view logs, monitor usage. Dark theme, clean design.',
  },
  {
    icon: Puzzle,
    title: 'Extensible',
    description:
      'Open source AGPL-3.0. Fork it, extend it. n8n node included.',
  },
  {
    icon: MessageCircle,
    title: 'SMS Gateway Ready',
    description:
      'SMS fallback via syssms.com. OTP verification built-in.',
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: (typeof features)[number] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
      className="flex h-full"
    >
      <div className="rounded-xl border border-border bg-card p-6 hover:border-foreground/20 transition-all">
        <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-muted p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-heading font-semibold text-sm">{title}</h3>
        <p className="mt-1 text-sm text-default">{description}</p>
      </div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-7xl"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mt-4 text-base text-default">
            Production-ready WhatsApp gateway with everything built-in.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
