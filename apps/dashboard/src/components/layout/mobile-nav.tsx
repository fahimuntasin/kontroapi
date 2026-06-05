'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Smartphone,
  Send,
  Key,
  Webhook,
  ScrollText,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/sessions', label: 'Sessions', icon: Smartphone },
  { href: '/dashboard/send', label: 'Send', icon: Send },
  { href: '/dashboard/settings/tokens', label: 'Keys', icon: Key },
  { href: '/dashboard/webhooks', label: 'Hooks', icon: Webhook },
  { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all duration-200 ${
                isActive
                  ? 'text-[#3a3fd4] dark:text-[#5c5ff5]'
                  : 'text-muted-foreground active:text-foreground'
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}