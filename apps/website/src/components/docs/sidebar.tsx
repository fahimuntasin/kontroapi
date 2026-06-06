'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const docsNav = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs/kontroapi' },
      { title: 'Quick Start', href: '/docs/kontroapi/quick-start' },
      { title: 'Installation', href: '/docs/kontroapi/installation' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Authentication', href: '/docs/kontroapi/auth' },
      { title: 'Send Message', href: '/docs/kontroapi/send-message' },
      { title: 'Receive Messages', href: '/docs/kontroapi/webhooks' },
      { title: 'Sessions', href: '/docs/kontroapi/sessions' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Deploy to VPS', href: '/docs/kontroapi/deploy-vps' },
      { title: 'n8n Integration', href: '/docs/kontroapi/n8n' },
      { title: 'SMS Gateway', href: '/docs/kontroapi/sms-gateway' },
    ],
  },
];

export function DocsSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(docsNav.map((s) => [s.title, true]))
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className={cn(
        'sticky top-20 hidden h-[calc(100vh-5rem)] w-[260px] shrink-0 overflow-y-auto border-r border-border py-8 pr-4 lg:block',
        className
      )}
    >
      <nav className="space-y-6">
        {docsNav.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex w-full items-center justify-between py-1 text-left"
            >
              <span className="font-heading text-sm font-semibold text-foreground">
                {section.title}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-default transition-transform',
                  openSections[section.title] && 'rotate-180'
                )}
              />
            </button>
            {openSections[section.title] && (
              <ul className="mt-2 ml-2 space-y-1 border-l border-border pl-3">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NextLink
                      href={item.href}
                      className={cn(
                        'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                        pathname === item.href
                          ? 'text-primary font-medium'
                          : 'text-default hover:text-foreground'
                      )}
                    >
                      {item.title}
                    </NextLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
