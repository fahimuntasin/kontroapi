'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerPhoneSchema } from '@kontroapi/shared';
import { toast } from 'sonner';
import { Loader2, Phone, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Props {
  onSubmit: (phone: string) => void;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-[#5c5ff5]/70 dark:focus-within:border-[#5c5ff5]/70 focus-within:bg-[#3a3fd4]/5 dark:focus-within:bg-[#5c5ff5]/10">
    {children}
  </div>
);

export function RegisterStepPhone({ onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ phone: string }>({
    resolver: zodResolver(registerPhoneSchema),
  });

  const sendOtp = handleSubmit(async (data) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch('/api/auth/otp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone }),
      });
      const result = await res.json();

      if (!result.success) {
        setServerError(result.message || 'Failed to send OTP');
        toast.error(result.message || 'Failed to send OTP');
        return;
      }

      toast.success('OTP sent to your phone');
      onSubmit(data.phone);
    } catch {
      setServerError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={sendOtp} className="space-y-5">
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
        <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
        <GlassInputWrapper>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              {...register('phone')}
              type="tel"
              placeholder="8801XXXXXXXXX"
              autoComplete="tel"
              className="w-full bg-transparent text-sm p-4 pl-11 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </GlassInputWrapper>
        {errors.phone && (
          <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="animate-element animate-delay-400 w-full rounded-2xl bg-[#3a3fd4] dark:bg-[#5c5ff5] py-4 font-medium text-white hover:bg-[#5c5ff5] dark:hover:bg-[#3a3fd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Send OTP'}
      </button>
    </form>
  );
}