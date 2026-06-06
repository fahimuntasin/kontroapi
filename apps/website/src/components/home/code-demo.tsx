'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const codeLines = [
  { color: 'text-gray-400', text: '$ npm install -g @kontroapis/cli' },
  { color: 'text-gray-400', text: '$ kontroapi init -y' },
  { color: 'text-green-400', text: '  \u2713 Postgres configured' },
  { color: 'text-green-400', text: '  \u2713 Redis configured' },
  { color: 'text-green-400', text: '  \u2713 docker-compose.yml generated' },
  { color: '', text: '' },
  { color: 'text-gray-400', text: '$ kontroapi start -d' },
  { color: 'text-green-400', text: '  \u2713 Engine started on :3000' },
  { color: 'text-green-400', text: '  \u2713 Dashboard started on :3001' },
  { color: '', text: '' },
  { color: 'text-gray-400', text: '$ curl http://localhost:3000/health' },
  { color: 'text-blue-400', text: '  {"status":"ok"}' },
];

export function CodeDemo() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-3xl"
      >
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            One Command to Deploy
          </h2>
        </div>

        <div className="mt-12">
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            <div className="flex items-center gap-2 border-b border-border bg-zinc-950 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <div className="overflow-x-auto p-4 sm:p-6">
              <pre className="font-mono text-sm leading-relaxed">
                <code>
                  {codeLines.map((line, i) => (
                    <span key={i}>
                      {line.text ? (
                        <span className={line.color || 'text-foreground'}>
                          {line.text}
                        </span>
                      ) : null}
                      {'\n'}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
