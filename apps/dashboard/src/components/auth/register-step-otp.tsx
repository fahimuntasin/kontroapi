'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

interface Props {
  phone: string;
  onBack: () => void;
  onSuccess: (verifyToken: string) => void;
}

export function RegisterStepOtp({ phone, onBack, onSuccess }: Props) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code }),
      });
      const result = await res.json();

      if (!result.success) {
        toast.error(result.message || 'Invalid OTP');
        return;
      }

      toast.success('Phone verified!');
      onSuccess(result.verify_token);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const otpCode = otp.join('');
  useEffect(() => {
    if (otp.every((d) => d !== '') && !loading) {
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="animate-element animate-delay-300 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="animate-element animate-delay-350 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3a3fd4]/10 dark:bg-[#5c5ff5]/10">
          <ShieldCheck className="h-7 w-7 text-[#3a3fd4] dark:text-[#5c5ff5]" />
        </div>
      </div>

      <div className="animate-element animate-delay-400 flex justify-center gap-3">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-14 w-11 rounded-2xl border border-border bg-foreground/5 text-center text-xl font-semibold text-foreground backdrop-blur-sm transition-colors focus:border-[#5c5ff5]/70 focus:bg-[#3a3fd4]/5 dark:focus:bg-[#5c5ff5]/10 focus:outline-none"
          />
        ))}
      </div>

      <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {countdown > 0 ? `Resend in ${countdown}s` : ''}
        </span>
        <button
          type="button"
          disabled={countdown > 0 || loading}
          onClick={async () => {
            setCountdown(60);
            await fetch('/api/auth/otp-send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone }),
            });
            toast.success('OTP resent');
          }}
          className="text-[#3a3fd4] dark:text-[#5c5ff5] hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resend OTP
        </button>
      </div>

      <button
        type="button"
        className="animate-element animate-delay-600 w-full rounded-2xl bg-[#3a3fd4] dark:bg-[#5c5ff5] py-4 font-medium text-white hover:bg-[#5c5ff5] dark:hover:bg-[#3a3fd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Verify'}
      </button>
    </div>
  );
}