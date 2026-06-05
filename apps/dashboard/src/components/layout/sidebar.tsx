'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Smartphone,
  Send,
  Key,
  Webhook,
  ScrollText,
  CreditCard,
  User,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

const navSections = [
  {
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/sessions', label: 'Sessions', icon: Smartphone },
      { href: '/dashboard/chats', label: 'Chats', icon: MessageCircle },
      { href: '/dashboard/send', label: 'Send Message', icon: Send },
    ],
  },
  {
    label: 'Developers',
    items: [
      { href: '/dashboard/settings/tokens', label: 'API Keys', icon: Key },
      { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/settings/billing', label: 'Billing', icon: CreditCard },
      { href: '/dashboard/settings/profile', label: 'Profile', icon: User },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-full flex-col"
    >
      <div className="flex h-16 items-center gap-2.5 px-4 shrink-0" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3a3fd4]/30 to-[#5c5ff5]/30 blur-md" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3a3fd4] to-[#5c5ff5]" />
          <img src="/kontrologo.png" alt="KontroAPI" className="relative z-10 h-5 w-5 rounded-md object-contain" />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-bold tracking-tight text-foreground">KontroAPI</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && 'mt-3')}>
            {!collapsed && section.label && (
              <div className="px-3 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                  {section.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                      active
                        ? 'bg-gradient-to-r from-[#3a3fd4]/10 to-transparent dark:from-[#5c5ff5]/10 dark:to-transparent text-[#3a3fd4] dark:text-[#5c5ff5]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-[#3a3fd4] to-[#5c5ff5]" />
                    )}
                    <item.icon className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-[#3a3fd4] dark:text-[#5c5ff5]' : 'text-muted-foreground group-hover:text-foreground'
                    )} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-3 px-3">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
              Actions
            </span>
          )}
          <div className="mt-1 space-y-0.5">
            <button
              onClick={handleSignOut}
              title={collapsed ? 'Sign out' : undefined}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                'text-red-400/50 hover:text-red-400 hover:bg-red-500/10',
                collapsed && 'justify-center px-0'
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Sign out</span>}
            </button>
          </div>
        </div>
      </nav>

      <div className="shrink-0 px-2 pt-2 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl border border-border/30 bg-muted/20 p-2.5 text-muted-foreground transition-all duration-200 hover:bg-muted/40 hover:text-foreground',
            collapsed ? 'flex-col' : 'flex-row'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[12px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}