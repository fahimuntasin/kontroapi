import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Inter_Tight } from 'next/font/google';
import { JetBrains_Mono } from 'next/font/google';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight', weight: ['400','500','600','700'] });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', weight: ['400','500','600'] });

export const metadata: Metadata = {
  title: { default: 'KontroAPI', template: '%s | KontroAPI' },
  description: 'Open source WhatsApp API. Self-host, no vendor lock-in.',
  keywords: ['whatsapp','api','self-hosted','open source'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${interTight.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
