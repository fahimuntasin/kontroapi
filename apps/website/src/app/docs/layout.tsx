import type { Metadata } from 'next';
import { DocsLayoutContent } from './layout-content';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to use KontroAPI — the self-hosted WhatsApp API gateway.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsLayoutContent>{children}</DocsLayoutContent>;
}
