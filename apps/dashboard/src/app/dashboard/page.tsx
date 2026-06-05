import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/db/auth';
import { query } from '@/lib/db';
import { StatusPulse } from '@/components/layout/status-pulse';
import { Activity, CreditCard, MessageSquare, Zap, ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SessionRow { status: string }
interface ProfileRow { plan: string; session_limit: number; billing_status: string }
interface CountRow { count: string }

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const userId = user.id;

  const [sessions, todayCountRow, profile] = await Promise.all([
    query<SessionRow>('SELECT status FROM whatsapp_sessions WHERE user_id = $1', [userId]),
    query<CountRow>(
      "SELECT COUNT(*)::text AS count FROM message_logs WHERE user_id = $1 AND created_at >= $2",
      [userId, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()]
    ),
    query<ProfileRow>(
      'SELECT plan, session_limit, billing_status FROM users WHERE id = $1',
      [userId]
    ),
  ]);

  const messagesToday = parseInt(todayCountRow[0]?.count || '0', 10);
  const connectedCount = sessions.filter((s) => s.status === 'connected').length;
  const p = profile[0];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <StatusPulse status={connectedCount > 0 ? 'connected' : 'pending'} />
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">All systems operational</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Control Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time view of your WhatsApp sessions and account usage.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/sessions" className="group glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-[#3a3fd4]/5 dark:hover:shadow-[#5c5ff5]/5 hover:border-accent-blue-bright/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Sessions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10">
              <MessageSquare className="h-4 w-4 text-[#3a3fd4] dark:text-[#5c5ff5]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">{sessions.length}</span>
            {p?.session_limit !== undefined && (
              <span className="text-sm text-muted-foreground">/ {p.session_limit}</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#3a3fd4] dark:text-[#5c5ff5] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            View sessions <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        <Link href="/dashboard/sessions" className="group glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-[#3a3fd4]/5 dark:hover:shadow-[#5c5ff5]/5 hover:border-accent-blue-bright/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Connected</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10">
              <Activity className="h-4 w-4 text-[#3a3fd4] dark:text-[#5c5ff5]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">{connectedCount}</span>
            <StatusPulse status={connectedCount > 0 ? 'connected' : 'failed'} />
          </div>
        </Link>

        <div className="glass-card rounded-2xl p-5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Messages Today</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10">
              <Zap className="h-4 w-4 text-[#3a3fd4] dark:text-[#5c5ff5]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">{messagesToday}</span>
            <StatusPulse status="read" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Plan</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10">
              <CreditCard className="h-4 w-4 text-[#3a3fd4] dark:text-[#5c5ff5]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">{(p?.plan || 'trial').toUpperCase()}</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              p?.billing_status === 'active'
                ? 'bg-[#3a3fd4]/10 text-[#3a3fd4] dark:bg-[#5c5ff5]/10 dark:text-[#5c5ff5]'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {p?.billing_status || 'active'}
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">API Health Check</span>
          <a href="/docs" className="flex items-center gap-1 text-xs font-medium text-[#3a3fd4] dark:text-[#5c5ff5] hover:underline">
            View docs <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <div className="code-block p-4 font-mono text-[13px] text-foreground">
          <span className="syntax-punct">{'{'}</span><br />
          &nbsp;&nbsp;<span className="syntax-keyword">&quot;status&quot;</span><span className="syntax-punct">:</span> <span className="syntax-string">&quot;operational&quot;</span><span className="syntax-punct">,</span><br />
          &nbsp;&nbsp;<span className="syntax-keyword">&quot;version&quot;</span><span className="syntax-punct">:</span> <span className="syntax-string">&quot;2.0.0&quot;</span><span className="syntax-punct">,</span><br />
          &nbsp;&nbsp;<span className="syntax-keyword">&quot;region&quot;</span><span className="syntax-punct">:</span> <span className="syntax-string">&quot;ap-south-1&quot;</span><span className="syntax-punct">,</span><br />
          &nbsp;&nbsp;<span className="syntax-keyword">&quot;uptime&quot;</span><span className="syntax-punct">:</span> <span className="syntax-string">&quot;99.97%&quot;</span><br />
          <span className="syntax-punct">{'}'}</span>
        </div>
      </div>
    </div>
  );
}
