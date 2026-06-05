'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/40',
        'backdrop-blur-xl bg-background/80'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className={cn(
            'text-xl font-heading font-bold text-gradient tracking-tight'
          )}
        >
          KontroAPI
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/fahimuntasin/kontroapi"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/fahimuntasin/kontroapi"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
