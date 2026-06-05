'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterStepPhone } from '@/components/auth/register-step-phone';
import { RegisterStepOtp } from '@/components/auth/register-step-otp';
import { RegisterStepAccount } from '@/components/auth/register-step-account';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type Step = 'phone' | 'otp' | 'account';

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/^\+/, '').trim();
  if (cleaned.startsWith('0')) {
    cleaned = '88' + cleaned;
  }
  return cleaned;
}

interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl glass-card p-5 w-64`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt={testimonial.name} />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium text-foreground">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

const testimonials: Testimonial[] = [
  {
    avatarSrc: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
    name: 'Sarah Chen',
    handle: '@sarahdigital',
    text: 'The API is incredibly fast. We process 10K messages/day without a hitch.',
  },
  {
    avatarSrc: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    name: 'Marcus Johnson',
    handle: '@marcustech',
    text: 'Clean docs, great support. This is how developer platforms should work.',
  },
  {
    avatarSrc: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    name: 'David Martinez',
    handle: '@davidcreates',
    text: 'Switched from another provider — KontroAPI is genuinely reliable.',
  },
];

const stepInfo: { key: Step; label: string; description: string }[] = [
  { key: 'phone', label: 'Phone', description: 'Enter your number' },
  { key: 'otp', label: 'Verify', description: 'Confirm with code' },
  { key: 'account', label: 'Account', description: 'Set your details' },
];

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const router = useRouter();

  const currentIndex = stepInfo.findIndex((s) => s.key === step);

  const getTitle = () => {
    switch (step) {
      case 'phone':
        return <span className="font-light text-foreground tracking-tighter">Create your account</span>;
      case 'otp':
        return <span className="font-light text-foreground tracking-tighter">Verify your phone</span>;
      case 'account':
        return <span className="font-light text-foreground tracking-tighter">Set your details</span>;
    }
  };

  const getDescription = () => {
    switch (step) {
      case 'phone':
        return 'Enter your Bangladesh phone number to get started';
      case 'otp':
        return `Enter the 6-digit code sent to ${phone}`;
      case 'account':
        return 'Create your email and password';
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2.5 mb-2">
              <img src="/kontrologo.png" alt="KontroAPI" className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-xl font-bold">KontroAPI</span>
            </div>

            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              {getTitle()}
            </h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">
              {getDescription()}
            </p>

            {/* Step indicators */}
            <div className="animate-element animate-delay-250 flex items-center gap-2">
              {stepInfo.map((s, i) => {
                const isActive = s.key === step;
                const isCompleted = i < currentIndex;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                        isActive && 'bg-[#3a3fd4] dark:bg-[#5c5ff5] text-white scale-110 shadow-lg shadow-[#3a3fd4]/25 dark:shadow-[#5c5ff5]/25',
                        isCompleted && 'bg-[#3a3fd4] dark:bg-[#5c5ff5] text-white',
                        !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    {i < stepInfo.length - 1 && (
                      <div
                        className={cn(
                          'h-px w-6 transition-colors duration-300',
                          isCompleted ? 'bg-[#3a3fd4] dark:bg-[#5c5ff5]' : 'bg-border'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {step === 'phone' && (
              <RegisterStepPhone
                onSubmit={(p) => {
                  const normalized = normalizePhone(p);
                  setPhone(p);
                  setNormalizedPhone(normalized);
                  setStep('otp');
                }}
              />
            )}

            {step === 'otp' && (
              <RegisterStepOtp
                phone={normalizedPhone}
                onBack={() => setStep('phone')}
                onSuccess={(token) => {
                  setVerifyToken(token);
                  setStep('account');
                }}
              />
            )}

            {step === 'account' && (
              <RegisterStepAccount
                phone={normalizedPhone}
                verifyToken={verifyToken}
              />
            )}

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-[#3a3fd4] dark:text-[#5c5ff5] hover:underline transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="hidden md:block flex-1 relative p-4">
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551650975-87deedd944c3?w=2160&q=80)' }}
        />
        <div className="absolute inset-4 rounded-3xl bg-gradient-to-t from-[#3a3fd4]/40 via-transparent to-transparent" />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
          <TestimonialCard testimonial={testimonials[0]!} delay="animate-delay-1000" />
          {testimonials.length > 1 && testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
          {testimonials.length > 2 && testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
        </div>
      </section>
    </div>
  );
}