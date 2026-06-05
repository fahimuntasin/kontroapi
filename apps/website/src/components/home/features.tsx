'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Server, Zap, Shield, Layout, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Server,
    title: 'Self-Hosted',
    description:
      'Deploy anywhere. Your infrastructure, your rules. Docker compose up in 30 seconds.',
  },
  {
    icon: Zap,
    title: 'Instant Messaging',
    description:
      'Send & receive WhatsApp messages via REST API. Queue-based delivery with BullMQ + Redis.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description:
      'API key auth, JWT tokens, webhook signature verification, rate limiting built-in.',
  },
  {
    icon: Layout,
    title: 'Dashboard UI',
    description:
      'Beautiful dashboard to manage sessions, view logs, monitor usage. Dark theme, glass-card design.',
  },
  {
    icon: Puzzle,
    title: 'Extensible',
    description:
      'Open source AGPL-3.0. Fork it, extend it, build on it. n8n node included.',
  },
  {
    icon: Zap,
    title: 'SMS Gateway Ready',
    description:
      'Integrated SMS fallback via syssms.com. OTP verification, notifikasi service built-in.',
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
      className={cn(
        'glass-card rounded-2xl p-6 transition-colors duration-300',
        'hover:border-accent-blue-bright/50'
      )}
    >
      <div className="inline-flex items-center justify-center rounded-xl bg-accent-blue-soft p-3">
        <Icon className="h-5 w-5 text-accent-blue-bright" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
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
          <h2 className="section-heading font-heading">Everything You Need</h2>
          <p className="section-subheading mx-auto">
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
