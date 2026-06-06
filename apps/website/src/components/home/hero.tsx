'use client';

import { useRef } from 'react';
import NextLink from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Github, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(240_89%_67%/0.06),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative mx-auto flex max-w-3xl flex-col items-center text-center"
      >
        <h1 className="font-heading text-5xl font-bold tracking-tight md:text-7xl leading-[1.1]">
          The WhatsApp API
          <br />
          <span className="text-default">you can self-host</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-default leading-relaxed">
          Open source WhatsApp Business API gateway. One command to deploy,
          full control of your data. Works with your existing Postgres and Redis.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <NextLink
            href="/docs"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition-all duration-150 hover:bg-foreground/80 hover:shadow-md'
            )}
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </NextLink>
          <a
            href="https://github.com/fahimuntasin/kontroapi"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-foreground/20 hover:bg-muted'
            )}
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
          <code className="font-mono text-sm text-gray-400">
            $ npm install -g{' '}
            <span className="text-gray-200">@kontroapis/cli</span>
          </code>
          <button
            onClick={() => navigator.clipboard.writeText('npm install -g @kontroapis/cli')}
            className="rounded p-1 text-default hover:text-foreground transition-colors"
            aria-label="Copy command"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
