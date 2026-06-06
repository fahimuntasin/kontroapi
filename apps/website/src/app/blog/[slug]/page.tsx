import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const posts: Record<
  string,
  {
    title: string;
    date: string;
    readTime: string;
    content: string[];
  }
> = {
  'introducing-kontroapi': {
    title: 'Introducing KontroAPI — Self-Hosted WhatsApp API',
    date: 'June 1, 2026',
    readTime: '4 min read',
    content: [
      'We are excited to announce KontroAPI, an open-source WhatsApp Business API gateway that you can self-host in under 30 seconds.',
      'KontroAPI was born out of frustration with existing WhatsApp API solutions. The official WhatsApp Business API requires Meta approval, has complex pricing, and locks you into their infrastructure. Third-party providers charge per-message fees and own your data.',
      'We wanted something different: a self-hosted gateway that gives you full control over your WhatsApp messaging infrastructure.',
      'KontroAPI uses the open-source Baileys library under the hood, providing a production-ready REST API with queue-based message delivery, JWT authentication, webhook integrations, and a beautiful dashboard UI.',
      'With a single command, you can deploy KontroAPI anywhere: your VPS, your homelab, your Kubernetes cluster. It works with any PostgreSQL and Redis instance, and scales horizontally.',
      'We chose AGPL-3.0 licensing because we believe in open source. The code is yours to fork, modify, and deploy. No vendor lock-in. No per-message fees. Just a tool that works.',
      'Head over to the docs to get started, or star us on GitHub to show your support.',
    ],
  },
  'why-we-chose-baileys': {
    title: 'Why We Built on Baileys for WhatsApp Multi-Device',
    date: 'May 20, 2026',
    readTime: '7 min read',
    content: [
      'When building KontroAPI, the most critical decision was choosing the WhatsApp protocol library. After evaluating several options, we settled on Baileys — and here is why.',
      'Baileys is an open-source TypeScript library that implements the WhatsApp Web Multi-Device protocol. Unlike the older WhatsApp Web protocol, Multi-Device does not require a persistent phone connection, making it ideal for server-side applications.',
      'The library handles all the heavy lifting: QR-based authentication, message encryption/decryption, media uploads, group management, and more. It also provides robust session persistence using a custom auth state store.',
      'We built on top of Baileys because it gave us the flexibility to add enterprise features: queue-based delivery with BullMQ + Redis for reliability at scale, webhook delivery with retry logic and signature verification, and a multi-session architecture that supports multiple WhatsApp numbers from a single deployment.',
      'One of the biggest challenges was session management. WhatsApp sessions can expire or be invalidated, and we needed a way to handle reconnection gracefully. KontroAPI monitors session health and can auto-reconnect when needed.',
      'The result is a stable, production-ready gateway that handles thousands of messages per minute while maintaining WhatsApp session integrity.',
    ],
  },
  'n8n-whatsapp-automation': {
    title: 'Automate WhatsApp Workflows with n8n',
    date: 'May 10, 2026',
    readTime: '5 min read',
    content: [
      'n8n is a powerful workflow automation tool, and KontroAPI ships with a dedicated n8n node that makes WhatsApp automation as simple as drag-and-drop.',
      'With the KontroAPI n8n node, you can trigger workflows from incoming WhatsApp messages, send automated replies, integrate with hundreds of other services, and build complex conversational flows.',
      'For example, you can build a customer support bot that: receives a WhatsApp message, looks up the customer in your CRM, checks order status in your database, and sends a formatted reply with order details — all without writing code.',
      'The n8n node supports all KontroAPI features: sending text messages, media messages, location sharing, contact cards, and buttons. It also handles webhook-based message reception for real-time automation.',
      'To get started, install the KontroAPI n8n node and configure it with your engine URL and API key. The node will automatically discover your active WhatsApp sessions.',
    ],
  },
  'deploy-to-vps-guide': {
    title: 'How to Deploy KontroAPI on a $5 VPS',
    date: 'April 25, 2026',
    readTime: '8 min read',
    content: [
      'You can run KontroAPI on a $5/month VPS from providers like DigitalOcean, Hetzner, or Linode. This guide walks you through the complete deployment.',
      'Prerequisites: a VPS with Ubuntu 22.04, Docker and Docker Compose installed, and a domain name pointing to your VPS IP.',
      'Step 1: Install the KontroAPI CLI globally using npm. Step 2: Run kontroapi init to generate configuration files. Step 3: Edit the .env file with your domain name and admin credentials. Step 4: Run kontroapi start -d to launch the engine and dashboard in detached mode.',
      'For production, we recommend setting up an Nginx reverse proxy with SSL via Certbot. The kontroapi CLI can generate Nginx config templates for you.',
      'With caching and resource limits configured, a $5 VPS can handle hundreds of daily active WhatsApp sessions and thousands of messages.',
      'KontroAPI is designed to be resource-efficient. The engine uses minimal CPU and memory per session, and Redis + Postgres handle persistence with minimal overhead.',
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-default transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to blog
      </Link>

      <article className="mt-8">
        <div className="flex items-center gap-3 text-sm text-default">
          <time dateTime={post.date}>{post.date}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readTime}</span>
        </div>

        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>

        <div className="mt-10 space-y-5">
          {post.content.map((paragraph, index) => (
            <p
              key={index}
              className="text-base leading-relaxed text-default"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      <div className="mt-16 border-t border-border pt-8">
        <Link
          href="/blog"
          className={cn(
            'inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>
      </div>
    </div>
  );
}
