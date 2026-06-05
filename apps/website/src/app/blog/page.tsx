import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const posts = [
  {
    slug: 'introducing-kontroapi',
    title: 'Introducing KontroAPI — Self-Hosted WhatsApp API',
    excerpt:
      'We built an open-source WhatsApp Business API gateway that you can self-host in 30 seconds. No vendor lock-in, full data control.',
    date: 'June 1, 2026',
    readTime: '4 min read',
  },
  {
    slug: 'why-we-chose-baileys',
    title: 'Why We Built on Baileys for WhatsApp Multi-Device',
    excerpt:
      'A deep dive into the WhatsApp Web protocol, why Baileys is the best open-source library, and how we handle session persistence.',
    date: 'May 20, 2026',
    readTime: '7 min read',
  },
  {
    slug: 'n8n-whatsapp-automation',
    title: 'Automate WhatsApp Workflows with n8n',
    excerpt:
      'Learn how to connect KontroAPI to n8n and build powerful WhatsApp automation workflows without writing code.',
    date: 'May 10, 2026',
    readTime: '5 min read',
  },
  {
    slug: 'deploy-to-vps-guide',
    title: 'How to Deploy KontroAPI on a $5 VPS',
    excerpt:
      'Step-by-step guide to deploying KontroAPI on a cheap VPS with Docker Compose, Nginx reverse proxy, and SSL.',
    date: 'April 25, 2026',
    readTime: '8 min read',
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Blog
      </h1>
      <p className="mt-2 text-muted-foreground">
        Updates, guides, and deep dives from the KontroAPI team.
      </p>

      <div className="mt-12 grid gap-8">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <article
              className={cn(
                'glass-card rounded-2xl p-6 transition-all duration-300',
                'hover:border-accent-blue-bright/50 hover:shadow-lg hover:shadow-accent-blue/5'
              )}
            >
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <time dateTime={post.date}>{post.date}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="mt-3 font-heading text-xl font-semibold text-foreground">
                {post.title}
              </h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-blue-bright">
                Read more
                <ArrowRight className="h-3 w-3" />
              </span>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
