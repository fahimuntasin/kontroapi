import NextLink from 'next/link';

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
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', href: 'https://github.com/fahimuntasin/kontroapi' },
      { label: 'Discord', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'AGPL-3.0', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 font-heading text-sm font-semibold text-foreground">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => {
                  const isExternal = link.href.startsWith('http');

                  if (isExternal) {
                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-default hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={link.label}>
                      <NextLink
                        href={link.href}
                        className="text-sm text-default hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </NextLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-default">
            Built by{' '}
            <span className="font-heading font-semibold text-foreground">
              KontroAPI
            </span>{' '}
            &copy; {new Date().getFullYear()}
          </p>
          <p className="text-sm text-default">
            Self-hostable. No vendor lock-in.
          </p>
        </div>
      </div>
    </footer>
  );
}
