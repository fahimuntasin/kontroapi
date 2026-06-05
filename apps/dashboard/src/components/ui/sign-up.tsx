"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface SignUpPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  onSignUp?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignUp?: () => void;
  onSignIn?: () => void;
  phoneError?: string;
  emailError?: string;
  passwordError?: string;
  nameError?: string;
  generalError?: string;
  loading?: boolean;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-[#5c5ff5]/70 dark:focus-within:border-[#5c5ff5]/70 focus-within:bg-[#3a3fd4]/5 dark:focus-within:bg-[#5c5ff5]/10">
    {children}
  </div>
);

export const SignUpPage: React.FC<SignUpPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Create your account</span>,
  description = "Get started with KontroAPI — the WhatsApp API platform for developers",
  heroImageSrc,
  onSignUp,
  onGoogleSignUp,
  onSignIn,
  phoneError,
  emailError,
  passwordError,
  nameError,
  generalError,
  loading = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2.5 mb-2">
              <img src="/kontrologo.png" alt="KontroAPI" className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-xl font-bold">KontroAPI</span>
            </div>
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

            <form className="space-y-4" onSubmit={onSignUp}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <GlassInputWrapper>
                  <input name="name" type="text" placeholder="Enter your full name" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50" />
                </GlassInputWrapper>
                {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
              </div>

              <div className="animate-element animate-delay-350">
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <GlassInputWrapper>
                  <input name="phone" type="tel" placeholder="8801XXXXXXXXX" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50" />
                </GlassInputWrapper>
                {phoneError && <p className="mt-1 text-xs text-destructive">{phoneError}</p>}
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50" />
                </GlassInputWrapper>
                {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
              </div>

              <div className="animate-element animate-delay-450">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? "text" : "password"} placeholder="Create a password" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground/50" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
                {passwordError && <p className="mt-1 text-xs text-destructive">{passwordError}</p>}
              </div>

              <div className="animate-element animate-delay-500 flex items-center gap-3 text-sm">
                <input type="checkbox" name="agreeTerms" className="rounded border-border accent-[#3a3fd4] dark:accent-[#5c5ff5]" required />
                <span className="text-foreground/90">
                  I agree to the{" "}
                  <a href="#" className="text-[#3a3fd4] dark:text-[#5c5ff5] hover:underline">Terms of Service</a>{" "}
                  and{" "}
                  <a href="#" className="text-[#3a3fd4] dark:text-[#5c5ff5] hover:underline">Privacy Policy</a>
                </span>
              </div>

              <button type="submit" disabled={loading} className="animate-element animate-delay-600 w-full rounded-2xl bg-[#3a3fd4] dark:bg-[#5c5ff5] py-4 font-medium text-white hover:bg-[#5c5ff5] dark:hover:bg-[#3a3fd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Create Account"}
              </button>

              {generalError && <p className="text-sm text-destructive text-center">{generalError}</p>}
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-border"></span>
              <span className="px-4 text-sm text-muted-foreground bg-background absolute">Or continue with</span>
            </div>

            <button onClick={onGoogleSignUp} className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
              </svg>
              Continue with Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={onSignIn} className="text-[#3a3fd4] dark:text-[#5c5ff5] hover:underline transition-colors">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </section>

      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }} />
        </section>
      )}
    </div>
  );
};