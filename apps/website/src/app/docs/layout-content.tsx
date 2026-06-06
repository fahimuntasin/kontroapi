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
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="font-heading text-sm font-semibold">Docs</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="inline-flex items-center justify-center rounded-md p-2 text-default hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close sidebar"
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
            'mb-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-all duration-150 hover:border-foreground/20 hover:bg-muted lg:hidden'
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
