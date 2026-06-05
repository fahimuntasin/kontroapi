'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerAccountSchema } from '@kontroapi/shared';
import { toast } from 'sonner';
import { Loader2, User, Mail, Lock, Phone, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  phone: string;
  verifyToken: string;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-[#5c5ff5]/70 dark:focus-within:border-[#5c5ff5]/70 focus-within:bg-[#3a3fd4]/5 dark:focus-within:bg-[#5c5ff5]/10">
    {children}
  </div>
);

export function RegisterStepAccount({ phone, verifyToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerAccountSchema),
    defaultValues: { phone, verify_token: verifyToken },
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, verify_token: verifyToken }),
      });
      const result = await res.json();

      if (!result.success) {
        setServerError(result.message || 'Registration failed');
        toast.error(result.message || 'Registration failed');
        return;
      }

      toast.success('Account created! Please log in.');
      router.push('/login');
    } catch {
      setServerError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, (errors) => {
    const messages = Object.entries(errors).map(([field, err]) => `${field}: ${err?.message}`).filter(Boolean);
    toast.error(messages.length ? messages.join(', ') : 'Please fix the form errors');
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {serverError && (
        <div className="animate-element animate-delay-200 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{serverError}</p>
            {serverError.toLowerCase().includes('already registered') && (
              <p className="mt-1">
                <Link href="/login" className="font-semibold underline underline-offset-2 hover:text-destructive/80 transition-colors">
                  Sign in instead →
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="animate-element animate-delay-300">
        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
        <GlassInputWrapper>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              {...register('full_name')}
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              className="w-full bg-transparent text-sm p-4 pl-11 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </GlassInputWrapper>
        {errors.full_name && (
          <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="animate-element animate-delay-400">
        <label className="text-sm font-medium text-muted-foreground">Email</label>
        <GlassInputWrapper>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              {...register('email')}
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              className="w-full bg-transparent text-sm p-4 pl-11 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </GlassInputWrapper>
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="animate-element animate-delay-500">
        <label className="text-sm font-medium text-muted-foreground">Password</label>
        <GlassInputWrapper>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              {...register('password')}
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
              className="w-full bg-transparent text-sm p-4 pl-11 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </GlassInputWrapper>
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="animate-element animate-delay-600">
        <label className="text-sm font-medium text-muted-foreground">Phone (verified)</label>
        <GlassInputWrapper>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              {...register('phone')}
              readOnly
              className="w-full bg-transparent text-sm p-4 pl-11 rounded-2xl focus:outline-none text-muted-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </GlassInputWrapper>
        <input type="hidden" {...register('verify_token')} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="animate-element animate-delay-700 w-full rounded-2xl bg-[#3a3fd4] dark:bg-[#5c5ff5] py-4 font-medium text-white hover:bg-[#5c5ff5] dark:hover:bg-[#3a3fd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create Account'}
      </button>
    </form>
  );
}