'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { DocsSidebar } from '@/components/docs/sidebar';
import { cn } from '@/lib/utils';

export function DocsLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-7xl">
      <DocsSidebar />

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[260px] bg-background lg:hidden">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
              <span className="font-heading font-semibold">Docs</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DocsSidebar className="border-r-0 pr-4 pt-4" />
          </div>
        </>
      )}

      <div className="min-w-0 flex-1 px-4 py-8 sm:px-10">
        <button
          onClick={() => setSidebarOpen(true)}
          className={cn(
            'mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground lg:hidden',
            'border border-border/40'
          )}
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
