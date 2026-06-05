import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const projects = [
  {
    name: 'KontroAPI',
    description:
      'The self-hosted WhatsApp Business API gateway. Send & receive messages via REST API.',
    href: '/docs/kontroapi',
  },
];

export default function DocsPage() {
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Documentation
      </h1>
      <p className="mt-2 text-muted-foreground">
        Explore guides, API references, and tutorials for KontroAPI.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.href} href={project.href}>
            <div
              className={cn(
                'glass-card rounded-2xl p-6 transition-all duration-300',
                'hover:border-accent-blue-bright/50 hover:shadow-lg hover:shadow-accent-blue/5'
              )}
            >
              <div className="inline-flex items-center justify-center rounded-xl bg-accent-blue-soft p-3">
                <BookOpen className="h-5 w-5 text-accent-blue-bright" />
              </div>
              <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">
                {project.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {project.description}
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-accent-blue-bright">
                Read docs &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
