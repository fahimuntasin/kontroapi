'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SignInPage, type Testimonial } from '@/components/ui/sign-in';

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

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Login failed');
        setGeneralError(data.message || 'Login failed');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Network error. Please try again.');
      setGeneralError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignInPage
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={testimonials}
      onSignIn={handleSubmit}
      onGoogleSignIn={() => {
        toast.info('Google sign-in coming soon');
      }}
      onResetPassword={() => {
        toast.info('Password reset coming soon');
      }}
      onCreateAccount={() => router.push('/register')}
      loading={loading}
      generalError={generalError || undefined}
    />
  );
}
