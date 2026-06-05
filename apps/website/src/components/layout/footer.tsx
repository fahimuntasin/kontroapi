import Link from 'next/link';
import { cn } from '@/lib/utils';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'API Reference', href: '/docs/kontroapi/auth' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      {
        label: 'GitHub',
        href: 'https://github.com/fahimuntasin/kontroapi',
      },
      { label: 'Discord', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'AGPL-3.0 License', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/40 bg-surface">
      <div className="absolute inset-0 bg-grid opacity-[0.03]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-heading font-semibold text-foreground">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={cn(
                        'text-sm text-muted-foreground transition-colors hover:text-foreground',
                        link.href.startsWith('http') &&
                          'cursor-pointer'
                      )}
                      {...(link.href.startsWith('http')
                        ? {
                            target: '_blank',
                            rel: 'noopener noreferrer',
                          }
                        : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Built by{' '}
            <span className="font-heading font-semibold text-foreground">
              KontroAPI
            </span>
            {' · '}
            &copy; {new Date().getFullYear()}
          </p>
          <p className="text-sm text-muted-foreground">
            Self-hostable. No vendor lock-in.
          </p>
        </div>
      </div>
    </footer>
  );
}
