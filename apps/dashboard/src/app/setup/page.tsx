'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CheckCircle,
  Copy,
  Globe,
  Key,
  Loader2,
  Server,
  Shield,
  ArrowRight,
  ChevronLeft,
  Cloud,
  Sparkles,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DomainType = 'cloudflare' | 'nginx' | 'manual';
type SetupStep = 0 | 1 | 2 | 3 | 4 | 5;

interface WizardData {
  email: string;
  password: string;
  confirmPassword: string;
  domainType: DomainType;
  cloudflareToken: string;
  domain: string;
  nginxConfig: string | null;
  nginxCertbotCmd: string | null;
  nginxInstructions: string[];
  licenseKey: string;
  requestEmail: string;
  activated: boolean;
}

const STEP_LABELS = ['Welcome', 'Admin', 'Domain', 'Activate', 'Review', 'Done'];

const DEFAULT_DATA: WizardData = {
  email: 'admin@kontroapi.local',
  password: '',
  confirmPassword: '',
  domainType: 'cloudflare',
  cloudflareToken: '',
  domain: '',
  nginxConfig: null,
  nginxCertbotCmd: null,
  nginxInstructions: [],
  licenseKey: '',
  requestEmail: '',
  activated: false,
};

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
    filter: 'blur(4px)',
  }),
};

async function apiPost(url: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ─── Progress Bar ───────────────────────────────────────────── */

function ProgressBar({ currentStep, completed }: { currentStep: number; completed: Set<number> }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {[0, 1, 2, 3, 4, 5].map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                step === currentStep && !completed.has(step)
                  ? 'bg-primary text-primary-foreground shadow-glow ring-2 ring-primary/30'
                  : completed.has(step)
                    ? 'bg-signal-green text-white'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {completed.has(step) ? (
                <Check className="h-4 w-4" />
              ) : (
                step + 1
              )}
            </div>
            <span
              className={cn(
                'mt-2 text-[11px] font-medium transition-colors duration-300',
                step === currentStep
                  ? 'text-foreground'
                  : completed.has(step)
                    ? 'text-signal-green'
                    : 'text-muted-foreground',
              )}
            >
              {STEP_LABELS[step]}
            </span>
          </div>
          {i < 5 && (
            <div
              className={cn(
                'mx-1 h-[2px] w-8 rounded-full transition-all duration-500 sm:w-12',
                completed.has(step) ? 'bg-signal-green' : 'bg-muted',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Domain Selection Card ──────────────────────────────────── */

function DomainOptionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
  recommended,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full rounded-xl border p-4 text-left transition-all duration-200',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
      )}
    >
      {recommended && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          RECOMMENDED
        </span>
      )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
            selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

/* ─── Setup Wizard Page ──────────────────────────────────────── */

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>(0);
  const [direction, setDirection] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set([-1]));
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [nginxGenerating, setNginxGenerating] = useState(false);
  const [tunnelCreating, setTunnelCreating] = useState(false);
  const [tunnelResult, setTunnelResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activating, setActivating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [initChecked, setInitChecked] = useState(false);
  const [cfLoggingIn, setCfLoggingIn] = useState(false);

  useEffect(() => {
    fetch('/api/setup/check', { method: 'POST' })
      .then((res) => res.json())
      .then((result) => {
        if (result.setupNeeded === false) {
          router.replace('/dashboard');
        }
      })
      .catch(() => {})
      .finally(() => setInitChecked(true));
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('cloudflare');
    if (status === 'connected') {
      const token = params.get('tunnelToken');
      const domain = params.get('domain');
      if (token && domain) {
        setData((p) => ({ ...p, domain, cloudflareToken: token }));
        setTunnelResult({ success: true, message: `Tunnel created! ${domain} is now connected.` });
        window.history.replaceState({}, '', '/setup');
      }
    }
  }, []);

  const navigate = useCallback(
    (next: SetupStep) => {
      setDirection(next > step ? 1 : -1);
      setError(null);
      setStep(next);
      setCompleted((prev) => new Set([...prev, step]));
    },
    [step],
  );

  /* ── Step 1: Admin Account ───────────────────────────────── */

  const handleAdminSubmit = async () => {
    setError(null);
    if (!isValidEmail(data.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (data.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/setup/admin', { email: data.email, password: data.password });
      toast.success('Admin account created.');
      navigate(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create admin account.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Domain Setup ─────────────────────────────────── */

  const handleDomainContinue = async () => {
    setError(null);
    if (data.domainType === 'cloudflare' && data.domain && data.cloudflareToken) {
      if (tunnelResult?.success) {
        navigate(3);
        return;
      }
    }
    setLoading(true);
    try {
      await apiPost('/api/setup/domain', {
        type: data.domainType,
        ...(data.domainType === 'cloudflare'
          ? { token: data.cloudflareToken, domain: data.domain }
          : {}),
        ...(data.domainType === 'nginx' ? { domain: data.domain } : {}),
      });
      toast.success('Domain configuration saved.');
      navigate(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save domain config.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTunnel = async () => {
    setError(null);
    setTunnelResult(null);
    if (!data.cloudflareToken.trim()) {
      setError('Cloudflare API Token is required.');
      return;
    }
    if (!data.domain.trim()) {
      setError('Domain is required.');
      return;
    }
    setTunnelCreating(true);
    try {
      await apiPost('/api/setup/domain', {
        type: 'cloudflare',
        token: data.cloudflareToken,
        domain: data.domain,
        action: 'create-tunnel',
      });
      setTunnelResult({ success: true, message: `Tunnel created for ${data.domain}` });
      toast.success('Cloudflare tunnel created successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create tunnel.';
      setTunnelResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTunnelCreating(false);
    }
  };

  const handleCloudflareLogin = async () => {
    setCfLoggingIn(true);
    try {
      const res = await fetch('/api/setup/cloudflare-auth');
      const result = await res.json();
      if (result.url) {
        if (data.domain) sessionStorage.setItem('cfDomain', data.domain);
        window.location.href = result.url;
      } else if (result.setup) {
        toast.info('Cloudflare OAuth not configured. Use API token instead.');
      } else {
        toast.error(result.error || 'Failed to connect');
      }
    } catch {
      toast.error('Failed to connect to Cloudflare');
    } finally {
      setCfLoggingIn(false);
    }
  };

  const handleGenerateNginx = async () => {
    setError(null);
    if (!data.domain.trim()) {
      setError('Domain is required.');
      return;
    }
    setNginxGenerating(true);
    try {
      const result = await apiPost('/api/setup/domain', {
        type: 'nginx',
        domain: data.domain,
        action: 'generate-config',
      });
      const instructions = result.data?.instructions || [];
      setData((p) => ({
        ...p,
        nginxConfig: result.data.config,
        nginxCertbotCmd: result.data.certbotCommand,
        nginxInstructions: instructions,
      }));
      toast.success('Nginx configuration generated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate nginx config.';
      setError(msg);
      toast.error(msg);
    } finally {
      setNginxGenerating(false);
    }
  };

  /* ── Step 3: Activation ───────────────────────────────────── */

  const handleActivate = async () => {
    setError(null);
    if (!data.licenseKey.trim()) {
      setError('Please enter a license key.');
      return;
    }
    setActivating(true);
    try {
      await apiPost('/api/setup/activate', { action: 'activate', key: data.licenseKey });
      setData((prev) => ({ ...prev, activated: true }));
      toast.success('License activated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate license.';
      setError(msg);
      toast.error(msg);
    } finally {
      setActivating(false);
    }
  };

  const handleRequestFreeKey = async () => {
    setError(null);
    if (!data.requestEmail.trim() || !isValidEmail(data.requestEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setRequesting(true);
    try {
      await apiPost('/api/setup/activate', { action: 'request', email: data.requestEmail });
      toast.success('Free key requested. Check your email!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request free key.';
      setError(msg);
      toast.error(msg);
    } finally {
      setRequesting(false);
    }
  };

  /* ── Step 4: Review & Finish ──────────────────────────────── */

  const handleFinish = async () => {
    setError(null);
    setLoading(true);
    try {
      await apiPost('/api/setup/finish');
      toast.success('Setup complete!');
      navigate(5);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete setup.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Go Back ──────────────────────────────────────────────── */

  const handleBack = () => {
    if (step > 0 && step < 5) {
      setDirection(-1);
      setError(null);
      setStep((prev) => (prev - 1) as SetupStep);
    }
  };

  /* ── Loading ──────────────────────────────────────────────── */

  if (!initChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            <span className="text-primary">Kontro</span>API
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Initial Setup Wizard</p>
        </div>

        {/* Progress bar */}
        <ProgressBar currentStep={step} completed={completed} />

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* ── Step 0: Welcome ────────────────────────── */}
              {step === 0 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-border/50 bg-black p-4 sm:p-6 overflow-x-auto">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                      <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                      <div className="h-2.5 w-2.5 rounded-full bg-[#28CA41]" />
                    </div>
                    <pre className="font-mono text-green-400 text-[11px] sm:text-sm leading-relaxed whitespace-pre">
{`╔══════════════════════════════════════════════╗
║          🚀 Welcome to KontroAPI             ║
║     Open Source WhatsApp API Gateway          ║
╚══════════════════════════════════════════════╝

Built with open source:
  ⚡ Baileys — WhatsApp multi-device library
  🟢 Node.js — JavaScript runtime
  📘 TypeScript — Type-safe JavaScript
  🐳 Docker — Container runtime
  🗄️  PostgreSQL — Database
  ⚡ Redis — Message queue
  📨 BullMQ — Job queue
  ⚛️  React + Next.js — Dashboard
  🌐 Express — API server
  🧩 n8n — Workflow automation

Self-host. No vendor lock-in. AGPL-3.0.
Star us on GitHub: github.com/fahimuntasin/kontroapi`}
                    </pre>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(1)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
                  >
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </button>

                  <div className="text-center">
                    <a
                      href="https://github.com/fahimuntasin/kontroapi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ⭐ Star on GitHub
                    </a>
                  </div>
                </div>
              )}

              {/* ── Step 1: Admin Account ──────────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Create Admin Account</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set up your administrator credentials for the dashboard.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="setup-email" className="block text-sm font-medium text-foreground mb-1.5">
                        Email
                      </label>
                      <input
                        id="setup-email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))}
                        placeholder="admin@example.com"
                        className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="setup-password" className="block text-sm font-medium text-foreground mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="setup-password"
                          type={showPw ? 'text' : 'password'}
                          value={data.password}
                          onChange={(e) => setData((p) => ({ ...p, password: e.target.value }))}
                          placeholder="Min. 8 characters"
                          className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="setup-confirm-pw" className="block text-sm font-medium text-foreground mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="setup-confirm-pw"
                          type={showConfirmPw ? 'text' : 'password'}
                          value={data.confirmPassword}
                          onChange={(e) => setData((p) => ({ ...p, confirmPassword: e.target.value }))}
                          placeholder="Re-enter your password"
                          className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleAdminSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Continue
                  </button>
                </div>
              )}

              {/* ── Step 2: Domain Setup ───────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Domain Setup</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose how you want to expose KontroAPI to the internet.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <DomainOptionCard
                      selected={data.domainType === 'cloudflare'}
                      onClick={() => {
                        setData((p) => ({ ...p, domainType: 'cloudflare' }));
                        setError(null);
                        setTunnelResult(null);
                      }}
                      icon={Cloud}
                      title="Cloudflare Tunnel"
                      subtitle="Zero config. Auto-create tunnel + DNS."
                      recommended
                    />
                    <DomainOptionCard
                      selected={data.domainType === 'nginx'}
                      onClick={() => {
                        setData((p) => ({ ...p, domainType: 'nginx' }));
                        setError(null);
                      }}
                      icon={Server}
                      title="Nginx"
                      subtitle="Auto-generate config + SSL guide."
                    />
                    <DomainOptionCard
                      selected={data.domainType === 'manual'}
                      onClick={() => {
                        setData((p) => ({ ...p, domainType: 'manual', nginxConfig: null, nginxCertbotCmd: null }));
                        setError(null);
                        setTunnelResult(null);
                      }}
                      icon={Globe}
                      title="Manual"
                      subtitle="Just localhost. Deal with it later."
                    />
                  </div>

                  {data.domainType === 'cloudflare' && (
                    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">
                        Automatically create a Cloudflare Tunnel and configure DNS — no manual config needed.
                      </p>

                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={handleCloudflareLogin}
                          disabled={cfLoggingIn}
                          className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {cfLoggingIn ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M16.5 7.5l-4.5-4.5L16.5 3l5.25 4.5L16.5 7.5zm-9 0l-4.5-4.5L7.5 3l5.25 4.5L7.5 7.5zm4.5 9l-4.5-4.5L12 16.5l5.25-4.5L12 16.5z"/></svg>
                          )}
                          {cfLoggingIn ? 'Connecting...' : 'Login with Cloudflare'}
                        </button>
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[11px] text-muted-foreground">or use API token</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">API Token</label>
                        <input type="password" value={data.cloudflareToken} onChange={(e) => setData((p) => ({ ...p, cloudflareToken: e.target.value }))} placeholder="Paste your token here..." className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Domain</label>
                        <input type="text" value={data.domain} onChange={(e) => setData((p) => ({ ...p, domain: e.target.value }))} placeholder="wa.yourdomain.com" className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30" />
                      </div>

                      <button type="button" disabled={tunnelCreating} onClick={handleCreateTunnel}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-50">
                        {tunnelCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Create Tunnel
                      </button>

                      {tunnelResult && (
                        <div className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-sm', tunnelResult.success ? 'bg-signal-green/10 text-signal-green' : 'bg-destructive/10 text-destructive')}>
                          {tunnelResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                          <span>{tunnelResult.message}</span>
                        </div>
                      )}

                      {tunnelResult?.success && (
                        <div className="rounded-lg border border-signal-green/30 bg-signal-green/5 p-3">
                          <p className="text-xs font-medium text-signal-green mb-1">🎉 Tunnel created!</p>
                          <p className="text-[11px] text-muted-foreground">
                            DNS auto-configured. Your API will be available at <span className="font-mono text-foreground">https://{data.domain}</span> in a few minutes.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {data.domainType === 'nginx' && (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Domain
                        </label>
                        <input
                          type="text"
                          value={data.domain}
                          onChange={(e) => setData((p) => ({ ...p, domain: e.target.value }))}
                          placeholder="wa.yourdomain.com"
                          className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={nginxGenerating}
                        onClick={handleGenerateNginx}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-50"
                      >
                        {nginxGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Server className="h-4 w-4" />
                        )}
                        Generate Config
                      </button>
                      {data.nginxConfig && (
                        <>
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                            <p className="text-xs font-medium text-amber-400 mb-2">📌 Before SSL — add DNS record:</p>
                            <div className="font-mono text-[12px] text-foreground/80 bg-black/30 rounded px-3 py-2">
                              Type: <span className="text-cyan-400">A</span> &nbsp; Name: <span className="text-cyan-400">@</span> &nbsp; Value: <span className="text-green-400">YOUR_SERVER_IP</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                              Point your domain to your server's IP address. Wait 1-5 min for DNS propagation.
                            </p>
                          </div>
                          <NginxConfigBlock config={data.nginxConfig} certbotCmd={data.nginxCertbotCmd || 'sudo certbot --nginx -d ' + (data.domain || 'example.com')} />
                          {data.nginxInstructions && data.nginxInstructions.length > 0 && (
                            <div className="rounded-lg border border-border bg-muted/20 p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Installation steps:</p>
                              <ol className="space-y-1.5">
                                {data.nginxInstructions.filter((s: string) => s.trim()).map((step: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                                    <span className="font-mono text-foreground/50 mt-0.5">{i + 1}.</span>
                                    <span className="font-mono">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {data.domainType === 'manual' && (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                      <Globe className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        You can configure a domain later in Settings.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleDomainContinue}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Activation ─────────────────────── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Activate Your License</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      AGPL-3.0 is free for self-hosting. Enter your activation key to unlock updates &amp; support.
                    </p>
                  </div>

                  {data.activated && (
                    <div className="flex items-center gap-2 rounded-lg bg-signal-green/10 px-3 py-2.5 text-sm text-signal-green">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      License activated successfully.
                    </div>
                  )}

                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        License Key
                      </label>
                      <input
                        type="text"
                        value={data.licenseKey}
                        onChange={(e) =>
                          setData((p) => ({ ...p, licenseKey: e.target.value }))
                        }
                        placeholder="xxxx-xxxx-xxxx-xxxx"
                        className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={activating || data.activated}
                      onClick={handleActivate}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      Activate
                    </button>
                  </div>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">OR</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Request Free Key</p>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={data.requestEmail}
                        onChange={(e) => setData((p) => ({ ...p, requestEmail: e.target.value }))}
                        placeholder="you@example.com"
                        className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={requesting}
                      onClick={handleRequestFreeKey}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                    >
                      {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Request Free Key
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(4)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Review ─────────────────────────── */}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Review Your Setup</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Confirm your choices before finalizing.
                    </p>
                  </div>

                  <div className="divide-y divide-border rounded-lg border border-border">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Shield className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Admin</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{data.email}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Globe className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Domain</span>
                      </div>
                      <span className="text-sm capitalize text-muted-foreground">
                        {data.domainType}
                        {data.domain ? ` · ${data.domain}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Key className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Activation</span>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          data.activated ? 'text-signal-green' : 'text-muted-foreground',
                        )}
                      >
                        {data.activated ? 'Activated' : 'Skipped'}
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleFinish}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Finish Setup
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 5: Done ────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-signal-green/15"
                  >
                    <CheckCircle className="h-12 w-12 text-signal-green" />
                  </motion.div>

                  <div>
                    <h2 className="text-xl font-bold text-foreground">KontroAPI is Ready!</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your API platform is configured and ready to use.
                    </p>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4 text-left">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Dashboard</span>
                      <a
                        href="/dashboard"
                        className="flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        /dashboard
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Engine API</span>
                      <span className="font-mono text-xs text-foreground/70">
                        {data.domain ? `https://${data.domain}` : 'http://localhost:3333'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
                  >
                    Visit Your Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Nginx Config Block ─────────────────────────────────────── */

function NginxConfigBlock({ config, certbotCmd }: { config: string; certbotCmd: string }) {
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedCertbot, setCopiedCertbot] = useState(false);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">nginx config</span>
          <button
            type="button"
            onClick={() => copy(config, setCopiedConfig)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {copiedConfig ? <Check className="h-3 w-3 text-signal-green" /> : <Copy className="h-3 w-3" />}
            {copiedConfig ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-border bg-black/40 p-3 font-mono text-[12px] leading-relaxed text-foreground/80">
          {config}
        </pre>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">SSL certbot command</span>
          <button
            type="button"
            onClick={() => copy(certbotCmd, setCopiedCertbot)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {copiedCertbot ? <Check className="h-3 w-3 text-signal-green" /> : <Copy className="h-3 w-3" />}
            {copiedCertbot ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-border bg-black/40 p-3 font-mono text-[12px] leading-relaxed text-foreground/80">
          {certbotCmd}
        </pre>
      </div>
    </div>
  );
}
