'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { Github, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  { label: 'Pricing', href: '#pricing' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border backdrop-blur-md bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <NextLink
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="4" fill="currentColor" />
              <path d="M5 14L10 6L15 14H5Z" fill="#030303" opacity="0.9" />
            </svg>
            KontroAPI
          </NextLink>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <NextLink
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-default hover:text-foreground transition-colors"
              >
                {link.label}
              </NextLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href="https://github.com/fahimuntasin/kontroapi"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center justify-center rounded-md p-2 text-default hover:text-foreground hover:bg-muted transition-colors'
            )}
          >
            <Github className="h-4 w-4" />
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'inline-flex md:hidden items-center justify-center rounded-md p-2 text-default hover:text-foreground hover:bg-muted transition-colors'
          )}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <NextLink
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-default hover:text-foreground transition-colors"
              >
                {link.label}
              </NextLink>
            ))}
            <a
              href="https://github.com/fahimuntasin/kontroapi"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-default hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
