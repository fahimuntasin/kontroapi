import { getCurrentUser } from '@/lib/db/auth';
import { queryOne } from '@/lib/db';

import { TerminalBreadcrumb } from '@/components/layout/terminal-breadcrumb';
import { StatusPulse } from '@/components/layout/status-pulse';
import { AnimatedThemeToggle } from '@/components/ui/animated-theme-toggle';

export async function Topbar() {
  const user = await getCurrentUser();
  let plan = 'trial';
  let userEmail = '';

  if (user) {
    userEmail = user.email;
    const profile = await queryOne<{ plan: string }>(
      'SELECT plan FROM users WHERE id = $1',
      [user.id]
    );
    if (profile?.plan) plan = profile.plan;
  }

  return (
    <header className="flex h-14 items-center justify-between bg-background/80 backdrop-blur-xl px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <TerminalBreadcrumb />
      </div>
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 md:flex">
          <StatusPulse status="connected" />
          <span className="text-[12px] text-muted-foreground">Live</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <AnimatedThemeToggle />
        <div className="h-4 w-px bg-border" />
        <span className="rounded-full bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[#3a3fd4] dark:text-[#5c5ff5]">
          {plan}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10 text-[11px] font-semibold text-[#3a3fd4] dark:text-[#5c5ff5]">
          {userEmail.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
