'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  send: 'Send Message',
  settings: 'Settings',
  tokens: 'API Keys',
  billing: 'Billing',
  profile: 'Profile',
  webhooks: 'Webhooks',
  logs: 'Logs',
  new: 'New',
};

export function TerminalBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-[13px]">
      {segments.map((segment, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const label = pathLabels[segment] || segment;
        const isLast = i === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/40">/</span>}
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}