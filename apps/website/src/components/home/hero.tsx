'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pt-28 sm:pb-32"
    >
      <div className="absolute inset-0 bg-grid opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-[#3a3fd4]/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative mx-auto flex max-w-4xl flex-col items-center text-center"
      >
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-accent-blue-border',
            'bg-accent-blue-soft px-4 py-1.5 text-sm font-medium text-accent-blue-bright'
          )}
        >
          Open Source · AGPL-3.0
        </span>

        <h1 className="mt-8 max-w-3xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Self-Hosted WhatsApp API,
          <br />
          No Vendor Lock-In
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Open source gateway. One command to deploy. Full control of your data.
          Works with any Postgres + Redis stack.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/docs" className="cta-button">
            Get Started
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <a
            href="https://github.com/fahimuntasin/kontroapi"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button-outline"
          >
            View on GitHub
          </a>
        </div>

        <p className="mt-6 font-mono text-sm text-muted-foreground/60">
          npm install -g @kontroapis/cli
        </p>
      </motion.div>
    </section>
  );
}
