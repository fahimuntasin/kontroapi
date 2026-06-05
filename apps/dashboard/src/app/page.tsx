"use client";

import React, { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Shield,
  Code,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { GlassButton } from "@/components/ui/apple-tahoe-liquid-glass-button";
import { SocialCard, InstagramIcon, TwitterIcon, DiscordIcon } from "@/components/ui/social-card";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";

type AnimatedGroupProps = {
  children: React.ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

function AnimatedGroup({ children, className, variants }: AnimatedGroupProps) {
  const containerVariants = variants?.container || defaultContainerVariants;
  const itemVariants = variants?.item || defaultItemVariants;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={cn(className)}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

function InfiniteSlider({
  children,
  gap = 16,
  speed = 25,
  className,
}: {
  children: React.ReactNode;
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max"
        animate={{
          x: [0, -1000],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
        style={{ gap: `${gap}px` }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}

const transitionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      bounce: 0.3,
      duration: 1.5,
    },
  },
};

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Docs", href: "/docs" },
  { name: "About", href: "#about" },
];

function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src="/kontrologo.png" alt="KontroAPI" className="h-8 w-8 rounded-lg object-contain" />
      <span className="text-xl font-bold">KontroAPI</span>
    </div>
  );
}

function LandingThemeToggle() {
  return <AnimatedThemeToggle />;
}

function Header() {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav data-state={menuState && "active"} className="fixed z-20 w-full px-2 group">
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "bg-background/70 backdrop-blur-xl max-w-4xl rounded-2xl border border-border shadow-lg dark:shadow-black/10 lg:px-5"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center space-x-2">
                <Logo />
              </Link>

              <div className="flex items-center gap-3 lg:hidden">
                <LandingThemeToggle />
                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState ? "Close Menu" : "Open Menu"}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5"
                >
                  <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                  <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                </button>
              </div>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      className="text-muted-foreground dark:hover:text-white hover:text-foreground block duration-150 hover:border-b hover:border-[#3a3fd4] dark:hover:border-[#5c5ff5] pb-0.5 transition-all"
                    >
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background group-data-[state=active]:block lg:hidden mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-border p-6 shadow-xl dark:shadow-black/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-4 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        className="text-muted-foreground hover:text-foreground block duration-150"
                      >
                        <span>{item.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-accent-blue-border px-4 text-sm font-medium text-accent-blue-bright transition-all duration-200 hover:bg-accent-blue-soft hover:border-accent-blue-bright"
                >
                  <span>Login</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#3a3fd4] to-[#5c5ff5] px-4 text-sm font-medium text-white shadow-md shadow-[#3a3fd4]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#3a3fd4]/30 hover:scale-[1.02]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <LandingThemeToggle />
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-accent-blue-border px-4 text-sm font-medium text-accent-blue-bright transition-all duration-200 hover:bg-accent-blue-soft hover:border-accent-blue-bright",
                  isScrolled && "lg:hidden"
                )}
              >
                <span>Login</span>
              </Link>
              <Link
                href="/register"
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#3a3fd4] to-[#5c5ff5] px-4 text-sm font-medium text-white shadow-md shadow-[#3a3fd4]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#3a3fd4]/30 hover:scale-[1.02]",
                  isScrolled ? "lg:inline-flex" : "hidden lg:inline-flex"
                )}
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative">
      {/* Light mode: diagonal gray sweep + blue accent */}
      <div className="pointer-events-none absolute inset-0 dark:hidden" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(220,220,230,0.6) 45%, rgba(58,63,212,0.08) 100%)',
      }} />
      {/* Dark mode: subtle white + blue accent */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 45%, rgba(58,63,212,0.15) 100%)',
      }} />
      {/* Blue accent blob bottom-left */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 15% 90%, rgba(58,63,212,0.22) 0%, transparent 55%)',
      }} />

      <div className="relative pt-24 md:pt-36">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
            <AnimatedGroup variants={transitionVariants}>
              <a
                href="#features"
                className="hover:bg-background bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border border-accent-blue-border p-1 pl-4 shadow-md dark:shadow-black/5 transition-all duration-300"
              >
                <span className="text-foreground text-sm">
                  Unofficial WhatsApp API Platform
                </span>
                <span className="block h-4 w-0.5 bg-accent-blue-border"></span>
                <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                  <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                    <span className="flex size-6">
                      <ArrowRight className="m-auto size-3" />
                    </span>
                    <span className="flex size-6">
                      <ArrowRight className="m-auto size-3" />
                    </span>
                  </div>
                </div>
              </a>

              <h1 className="mt-8 max-w-4xl mx-auto text-balance text-5xl md:text-6xl lg:mt-16 xl:text-7xl font-bold">
                WhatsApp API{" "}
                <span className="bg-gradient-to-r from-[#3a3fd4] dark:from-[#5c5ff5] to-[#5c5ff5]/60 dark:to-[#5c5ff5]/60 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground">
                Build powerful WhatsApp integrations with our reliable, developer-friendly
                API. Send messages, manage contacts, and automate workflows effortlessly.
              </p>
            </AnimatedGroup>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
              className="mt-12 flex flex-col items-center justify-center gap-3 md:flex-row"
            >
              <div className="rounded-[14px] border border-accent-blue-border p-0.5">
                <Link href="/register">
                  <GlassButton size="default" contentClassName="flex items-center gap-2">
                    <span>Start Building</span>
                    <ArrowRight className="h-4 w-4" />
                  </GlassButton>
                </Link>
              </div>
              <Link
href="/docs"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-accent-blue-border px-6 text-sm font-medium text-accent-blue-bright transition-colors hover:bg-accent-blue-soft"
              >
                <span className="text-nowrap">View Documentation</span>
              </Link>
            </AnimatedGroup>
          </div>
        </div>

        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.75,
                },
              },
            },
            ...transitionVariants,
          }}
        >
          <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
            <div
              aria-hidden
              className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
            />
            <div className="glass-card relative mx-auto max-w-6xl overflow-hidden rounded-2xl p-4 shadow-xl">
              <div className="aspect-video relative rounded-xl border border-border bg-muted/50 flex items-center justify-center">
                <Code className="w-20 h-20 text-accent-blue" />
              </div>
            </div>
          </div>
        </AnimatedGroup>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description:
        "Send messages instantly with our optimized infrastructure and global CDN.",
      accentLight: "#3a3fd4",
      accentDark: "#5c5ff5",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Reliable",
      description:
        "Enterprise-grade security with 99.9% uptime SLA and end-to-end encryption.",
      accentLight: "#3a3fd4",
      accentDark: "#5c5ff5",
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Developer Friendly",
      description:
        "Simple REST API with comprehensive documentation and SDKs for all platforms.",
      accentLight: "#3a3fd4",
      accentDark: "#5c5ff5",
    },
  ];

  return (
    <section id="features" className="py-16 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full border border-accent-blue-border bg-accent-blue-soft px-3.5 py-1 mb-4">
            <span className="text-xs font-medium text-accent-blue-bright">Features</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to build
          </h2>
          <p className="max-w-[900px] mx-auto text-muted-foreground md:text-xl/relaxed mt-4">
            Powerful features designed for developers who want to move fast.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              viewport={{ once: true }}
            >
              <div className="group relative glass-card rounded-2xl p-8 transition-all duration-500 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-[#5c5ff5]/5">
                <div
                  className="pointer-events-none absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(300px circle at 50% 0%, hsl(var(--accent-blue) / 0.15), transparent 70%)`,
                  }}
                />
                <div className="relative">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-blue-border bg-accent-blue-soft text-accent-blue-bright transition-all duration-300 group-hover:scale-110 group-hover:border-accent-blue-bright">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-accent-blue-bright transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5">
                    <span>Learn more</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Trial",
      price: "Free",
      description: "Perfect for testing",
      features: ["1 Session", "50 Messages/day", "Community Support", "Webhook Access"],
      popular: false,
    },
    {
      name: "Basic",
      price: "৳699",
      description: "For getting started",
      features: [
        "1 Session",
        "Unlimited Messages",
        "Priority Support",
        "Webhook Access",
      ],
      popular: false,
    },
    {
      name: "Pro",
      price: "৳1,499",
      description: "For growing businesses",
      features: [
        "3 Sessions",
        "Unlimited Messages",
        "Webhooks & Events",
        "Priority Support",
        "Analytics Dashboard",
      ],
      popular: true,
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full border border-accent-blue-border bg-accent-blue-soft px-3.5 py-1 mb-4">
            <span className="text-xs font-medium text-accent-blue-bright">Pricing</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="max-w-[900px] mx-auto text-muted-foreground md:text-xl/relaxed mt-4">
            Choose the plan that fits your needs. All plans include a free trial.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div
                className={cn(
                  "relative glass-card rounded-xl transition-all duration-500 shadow-xl hover:shadow-2xl",
                  plan.popular
                    ? "border-accent-blue-bright/30 shadow-2xl shadow-accent-blue/10 ring-1 ring-accent-blue-bright/20 scale-105"
                    : ""
                )}
              >
                {plan.popular && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 via-accent-blue/5 to-transparent rounded-xl" />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-tr from-accent-blue/5 via-transparent to-accent-blue/10 opacity-50 rounded-xl"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <motion.span
                        className="bg-gradient-to-r from-[#3a3fd4] via-[#5c5ff5] to-[#3a3fd4] text-white px-5 py-1.5 rounded-full text-sm font-semibold shadow-2xl shadow-[#3a3fd4]/50 backdrop-blur-sm border border-[#5c5ff5]/30"
                        initial={{ scale: 0.8, opacity: 0, y: -10 }}
                        whileInView={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, type: "spring" as const, stiffness: 200 }}
                      >
                        Most Popular
                      </motion.span>
                    </div>
                  </>
                )}
                <div className="relative p-8">
                  <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                  <div className="mt-4">
                    <motion.span
                      className="text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
                      whileHover={{ scale: 1.05 }}
                    >
                      {plan.price}
                    </motion.span>
                  </div>
                </div>
                <div className="relative px-8 pb-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <motion.li
                        key={idx}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        viewport={{ once: true }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-accent-blue-bright flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="relative p-8 pt-4">
                  <Link href="/register" className="block">
                    {plan.popular ? (
                      <button className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3a3fd4] px-6 text-sm font-medium text-white transition-colors hover:bg-[#5c5ff5] hover:shadow-lg hover:shadow-[#3a3fd4]/25">
                        <span className="group-hover:translate-x-1 transition-transform duration-300">Get Started</span>
                      </button>
                    ) : (
                      <button className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-accent-blue-border px-6 text-sm font-medium text-accent-blue-bright transition-colors hover:bg-accent-blue-soft">
                        <span className="group-hover:translate-x-1 transition-transform duration-300">Get Started</span>
                      </button>
                    )}
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LogoCloud() {
  return (
    <section className="overflow-hidden py-16">
      <div className="group relative m-auto max-w-7xl px-6">
        <div className="flex flex-col items-center md:flex-row">
          <div className="mb-6 md:mb-0 md:max-w-44 md:border-r md:pr-6 border-border">
            <p className="text-center md:text-end text-sm text-muted-foreground">
              Trusted by developers worldwide
            </p>
          </div>
          <div className="relative py-6 md:w-[calc(100%-11rem)]">
            <InfiniteSlider speed={40} gap={112}>
              {["Company", "Brand", "Startup", "Tech Co", "Business"].map(
                (name) => (
                  <div key={name} className="flex items-center">
                    <div className="h-8 w-24 bg-muted rounded flex items-center justify-center text-xs font-semibold text-muted-foreground border border-border">
                      {name}
                    </div>
                  </div>
                )
              )}
            </InfiniteSlider>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="relative glass-card rounded-2xl shadow-2xl overflow-hidden">
            {/* Blue accent blob bottom-left */}
            <div className="pointer-events-none absolute inset-0" style={{
              background: 'radial-gradient(ellipse at 15% 90%, rgba(58,63,212,0.22) 0%, transparent 55%)',
            }} />
            {/* Diagonal sweep light mode */}
            <div className="pointer-events-none absolute inset-0 dark:hidden" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 45%, rgba(58,63,212,0.06) 100%)',
            }} />
            {/* Diagonal sweep dark mode */}
            <div className="pointer-events-none absolute inset-0 hidden dark:block" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 45%, rgba(58,63,212,0.1) 100%)',
            }} />
            <motion.div
              className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-accent-blue/10 rounded-full blur-[100px]"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.6, 0.4],
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-accent-blue/10 rounded-full blur-[100px]"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, -40, 0],
                y: [0, -20, 0],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="relative p-12 text-center">
              <motion.h2
                className="text-3xl font-bold mb-4 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
              >
                Ready to get started?
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                viewport={{ once: true }}
              >
                Join thousands of developers building amazing WhatsApp integrations with
                KontroAPI.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                viewport={{ once: true }}
              >
                <Link href="/register">
                  <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3a3fd4] px-8 text-base font-semibold text-white transition-all duration-200 hover:bg-[#5c5ff5] hover:shadow-lg hover:shadow-[#3a3fd4]/25">
                    <span>Start Free Trial</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-accent-blue-border px-8 text-base font-medium text-accent-blue-bright backdrop-blur-sm transition-all duration-200 hover:bg-accent-blue-soft"
                >
                  <span>Read the Docs</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo className="mb-4" />
            <p className="text-sm text-muted-foreground mb-6">
              The most reliable WhatsApp API platform for developers.
            </p>
            <SocialCard
              title="Follow Us"
              socialLinks={[
                { href: "https://twitter.com/kontroapi", icon: <TwitterIcon />, className: "box1" },
                { href: "https://discord.gg/kontroapi", icon: <DiscordIcon />, className: "box2", delay: "0.2s" },
                { href: "https://instagram.com/kontroapi", icon: <InstagramIcon />, className: "box3", delay: "0.4s" },
              ]}
            />
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="/docs" className="hover:text-foreground transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Developers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">SDKs</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2026 KontroAPI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function KontroAPILanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="overflow-hidden">
        <HeroSection />
        <LogoCloud />
        <FeaturesSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}