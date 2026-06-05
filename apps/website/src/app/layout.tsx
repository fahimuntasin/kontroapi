import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Inter_Tight } from 'next/font/google';
import { JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { cn } from '@/lib/utils';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'KontroAPI — Self-Hosted WhatsApp API Gateway',
    template: '%s | KontroAPI',
  },
  description:
    'Open source WhatsApp Business API gateway. Self-host, no vendor lock-in. One `kontroapi` CLI, full control.',
  keywords: [
    'whatsapp api',
    'whatsapp business api',
    'self-hosted whatsapp',
    'open source whatsapp api',
    'baileys api',
    'whatsapp gateway',
    'kontroapi',
  ],
  openGraph: {
    title: 'KontroAPI — Self-Hosted WhatsApp API Gateway',
    description:
      'Open source WhatsApp Business API gateway. Self-host, no vendor lock-in.',
    url: 'https://kontroapi.com',
    siteName: 'KontroAPI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KontroAPI — Self-Hosted WhatsApp API Gateway',
    description:
      'Open source WhatsApp Business API gateway. Self-host, no vendor lock-in.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn('dark', geist.variable, interTight.variable, jetbrainsMono.variable)}
    >
      <body className="font-sans antialiased min-h-screen bg-background">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="kontroapi-website-theme">
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
