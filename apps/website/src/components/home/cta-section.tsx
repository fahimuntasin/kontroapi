'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

export function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(240_89%_67%/0.08),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative mx-auto max-w-2xl text-center"
      >
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ready to take control of your WhatsApp API?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Self-host in 30 seconds. No credit card required. Open source forever.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/docs" className="cta-button">
            Get Started
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <a
            href="https://github.com/fahimuntasin/kontroapi"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 text-sm font-medium',
              'text-muted-foreground transition-colors hover:text-accent-blue-bright'
            )}
          >
            Star on GitHub
          </a>
        </div>
      </motion.div>
    </section>
  );
}
