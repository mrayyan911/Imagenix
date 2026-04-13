'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/landing/landing-nav';
import { LogoTicker } from '@/components/landing/logo-ticker';
import { TiltCard } from '@/components/landing/tilt-card';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerChildren, StaggerItem } from '@/components/animations/stagger-children';
import { AnimatedSection } from '@/components/animations/animated-section';
import { AnimatedCounter } from '@/components/animations/animated-counter';
import {
  Database,
  Sparkles,
  Download,
  GitBranch,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
} from 'lucide-react';

// Lazy-load the 3D scene to avoid SSR issues
const HeroScene = dynamic(
  () => import('@/components/3d/hero-scene').then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gradient-to-br from-primary-900/50 to-primary-800/30 rounded-2xl animate-pulse" />
    ),
  }
);

const features = [
  {
    icon: Database,
    title: 'Dataset Management',
    description:
      'Upload and organize images with automatic duplicate detection, metadata tracking, and smart categorization.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Sparkles,
    title: 'AI Auto-Annotation',
    description:
      'Automatically detect and label objects with AI. Review and refine suggestions instantly — 10× faster.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: GitBranch,
    title: 'Version Control',
    description:
      'Track dataset changes with snapshots. Roll back anytime with full annotation history.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Download,
    title: 'Multi-Format Export',
    description:
      'Export in COCO, YOLO, and Pascal VOC formats instantly. Ready for training in any ML framework.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Zap,
    title: 'Fast Augmentation',
    description:
      'Apply flips, crops, rotations, and color jitter to multiply your dataset size automatically.',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: Shield,
    title: 'Team Collaboration',
    description:
      'Invite teammates, assign annotation tasks, and review work in a unified workspace.',
    color: 'bg-sky-100 text-sky-600',
  },
];

const steps = [
  { step: '01', title: 'Upload', desc: 'Drag and drop your images or connect a data source.' },
  { step: '02', title: 'Annotate', desc: 'Use AI suggestions or manual tools to label every object.' },
  { step: '03', title: 'Augment', desc: 'Apply transforms to grow and diversify your dataset.' },
  { step: '04', title: 'Export', desc: 'Download in any format — ready for training immediately.' },
];

const stats = [
  { value: 60, suffix: '%', label: 'Faster dataset prep' },
  { value: 10, suffix: 'GB', label: 'Free storage' },
  { value: 5000, suffix: '+', label: 'ML engineers' },
  { value: 3, suffix: '', label: 'Export formats' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-blue-950 pt-20">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeIn delay={0.1}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
                <Sparkles className="h-3 w-3" /> AI-Powered Dataset Intelligence
              </span>
            </FadeIn>
            <FadeIn delay={0.2}>
              <h1 className="text-5xl sm:text-6xl font-bold leading-tight text-white">
                Build High-Quality{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-blue-300">
                  Image Datasets
                </span>{' '}
                Faster with AI
              </h1>
            </FadeIn>
            <FadeIn delay={0.35}>
              <p className="mt-6 text-lg text-neutral-400 max-w-lg">
                Upload, annotate, augment, and export your image datasets with AI-powered tools.
                Reduce dataset preparation time by 60% and focus on building better models.
              </p>
            </FadeIn>
            <FadeIn delay={0.45}>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="gap-2 bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30"
                  >
                    Start Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/how-it-works">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  >
                    See How It Works
                  </Button>
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={0.55}>
              <div className="mt-8 flex items-center gap-6 text-sm text-neutral-500">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> No credit card
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> 10 GB free
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> Cancel anytime
                </span>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.3} direction="left" className="relative h-[420px] lg:h-[520px]">
            <HeroScene />
          </FadeIn>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 0V80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Trusted-by ticker */}
      <AnimatedSection className="py-14 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="text-center mb-8">
            <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest">
              Trusted by engineers working with
            </p>
          </FadeIn>
          <LogoTicker />
        </div>
      </AnimatedSection>

      {/* Stats */}
      <AnimatedSection className="py-16 px-6 bg-neutral-50">
        <div className="mx-auto max-w-5xl">
          <StaggerChildren className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <StaggerItem key={s.label}>
                <div className="text-4xl font-bold text-neutral-900">
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </div>
                <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </AnimatedSection>

      {/* Features bento */}
      <AnimatedSection id="features" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900">
              Everything You Need for Dataset Preparation
            </h2>
            <p className="mt-4 text-lg text-neutral-500 max-w-2xl mx-auto">
              From raw images to production-ready training data — all in one platform.
            </p>
          </FadeIn>
          <StaggerChildren className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <TiltCard className="h-full p-6 rounded-2xl border border-neutral-200 bg-white hover:border-primary-300 cursor-default transition-colors">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${f.color}`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-neutral-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{f.description}</p>
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerChildren>
          <FadeIn delay={0.2} className="mt-10 text-center">
            <Link href="/features">
              <Button variant="outline" className="gap-2">
                Explore all features <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </AnimatedSection>

      {/* How it works */}
      <AnimatedSection className="py-24 px-6 bg-neutral-950">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-neutral-400">
              Four steps from raw data to training-ready datasets.
            </p>
          </FadeIn>
          <StaggerChildren className="grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <StaggerItem key={s.step}>
                <div className="relative p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-5xl font-black text-primary-500/20 leading-none">
                    {s.step}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-neutral-400">{s.desc}</p>
                  {i < steps.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 h-7 w-7 text-neutral-700 z-10" />
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
          <FadeIn delay={0.2} className="mt-10 text-center">
            <Link href="/how-it-works">
              <Button className="gap-2">
                Full walkthrough <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </AnimatedSection>

      {/* CTA */}
      <AnimatedSection className="py-24 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg,#1e40af,#3b82f6,#6366f1,#8b5cf6)',
            backgroundSize: '300% 300%',
            animation: 'gradient-shift 6s ease infinite',
          }}
        />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse-glow pointer-events-none" />
        <div
          className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse-glow pointer-events-none"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-4xl sm:text-5xl font-bold text-white">
              Ready to Build Better Datasets?
            </h2>
            <p className="mt-5 text-lg text-blue-100">
              Join thousands of ML engineers who trust Imagenix for their dataset needs.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-primary-700 hover:bg-blue-50 shadow-xl font-semibold"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.35}>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-blue-200">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> 10 GB free storage
              </span>
            </div>
          </FadeIn>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-10 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Imagenix" className="h-6 w-6 rounded object-contain" />
              <span className="text-sm text-neutral-600">© 2024 Imagenix. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <Link href="/features" className="hover:text-neutral-900 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-neutral-900 transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="hover:text-neutral-900 transition-colors">
                About
              </Link>
              <a href="#" className="hover:text-neutral-900 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-neutral-900 transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
