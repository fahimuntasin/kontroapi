'use client';

import { useRef } from 'react';
import NextLink from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Github } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(240_89%_67%/0.08),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative mx-auto max-w-2xl text-center"
      >
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ready to take control?
        </h2>
        <p className="mt-4 text-lg text-default">
          Self-host in 30 seconds. No credit card required. Open source forever.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <NextLink
            href="/docs"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition-all duration-150 hover:bg-foreground/80 hover:shadow-md'
            )}
          >
            Get Started
            <span aria-hidden="true">&rarr;</span>
          </NextLink>
          <a
            href="https://github.com/fahimuntasin/kontroapi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-default hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            Star on GitHub
          </a>
        </div>
      </motion.div>
    </section>
  );
}
