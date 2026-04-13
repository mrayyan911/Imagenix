'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/landing/landing-nav';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerChildren, StaggerItem } from '@/components/animations/stagger-children';
import { AnimatedSection } from '@/components/animations/animated-section';
import { CheckCircle, X, Sparkles, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfect for individuals exploring the platform.',
    cta: 'Get Started',
    ctaHref: '/register',
    highlighted: false,
    features: [
      { label: '10 GB storage', included: true },
      { label: '3 projects', included: true },
      { label: '5,000 images / month', included: true },
      { label: 'AI auto-annotation (100 credits/mo)', included: true },
      { label: 'COCO & YOLO export', included: true },
      { label: 'Team members', included: false },
      { label: 'Version control', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 23,
    description: 'For serious ML engineers and small teams.',
    cta: 'Start 14-day trial',
    ctaHref: '/register?plan=pro',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { label: '100 GB storage', included: true },
      { label: 'Unlimited projects', included: true },
      { label: '100,000 images / month', included: true },
      { label: 'AI auto-annotation (5,000 credits/mo)', included: true },
      { label: 'All export formats', included: true },
      { label: 'Up to 5 team members', included: true },
      { label: 'Version control', included: true },
      { label: 'Priority support', included: false },
    ],
  },
  {
    name: 'Team',
    monthlyPrice: 99,
    yearlyPrice: 79,
    description: 'Full-power platform for larger ML teams.',
    cta: 'Contact Sales',
    ctaHref: '/about#contact',
    highlighted: false,
    features: [
      { label: '1 TB storage', included: true },
      { label: 'Unlimited projects', included: true },
      { label: 'Unlimited images', included: true },
      { label: 'AI auto-annotation (unlimited)', included: true },
      { label: 'All export formats', included: true },
      { label: 'Unlimited team members', included: true },
      { label: 'Version control + audit log', included: true },
      { label: 'Priority support & SLA', included: true },
    ],
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center bg-gradient-to-b from-neutral-950 to-neutral-900">
        <FadeIn>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" /> Simple, Transparent Pricing
          </span>
          <h1 className="text-5xl font-bold text-white">
            Pay for What You Use
          </h1>
          <p className="mt-4 text-lg text-neutral-400 max-w-xl mx-auto">
            Start free, scale as you grow. No surprise fees.
          </p>
        </FadeIn>

        {/* Toggle */}
        <FadeIn delay={0.2} className="mt-8 flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${!yearly ? 'text-white' : 'text-neutral-400'}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative h-7 w-14 rounded-full transition-colors duration-300 focus:outline-none ${
              yearly ? 'bg-primary-500' : 'bg-neutral-700'
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
                yearly ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${yearly ? 'text-white' : 'text-neutral-400'}`}>
            Yearly{' '}
            <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
              Save 20%
            </span>
          </span>
        </FadeIn>
      </section>

      {/* Pricing cards */}
      <AnimatedSection className="py-20 px-6 bg-neutral-50">
        <div className="mx-auto max-w-5xl">
          <StaggerChildren className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <StaggerItem key={plan.name}>
                <div
                  className={`relative h-full flex flex-col p-8 rounded-2xl border transition-all duration-300 ${
                    plan.highlighted
                      ? 'border-primary-500 bg-primary-600 text-white shadow-xl shadow-primary-500/25 scale-[1.03]'
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-400 text-neutral-900 text-xs font-semibold">
                      {plan.badge}
                    </span>
                  )}
                  <h3
                    className={`text-lg font-semibold ${
                      plan.highlighted ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      plan.highlighted ? 'text-primary-100' : 'text-neutral-500'
                    }`}
                  >
                    {plan.description}
                  </p>

                  <div className="mt-6 flex items-end gap-1">
                    <span
                      className={`text-5xl font-bold ${
                        plan.highlighted ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span
                        className={`mb-2 text-sm ${
                          plan.highlighted ? 'text-primary-200' : 'text-neutral-400'
                        }`}
                      >
                        /mo
                      </span>
                    )}
                  </div>
                  {plan.monthlyPrice === 0 && (
                    <span
                      className={`text-sm ${
                        plan.highlighted ? 'text-primary-200' : 'text-neutral-400'
                      }`}
                    >
                      Forever free
                    </span>
                  )}

                  <Link href={plan.ctaHref} className="mt-6">
                    <Button
                      className={`w-full ${
                        plan.highlighted
                          ? 'bg-white text-primary-700 hover:bg-primary-50'
                          : ''
                      }`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>

                  <ul className="mt-8 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-center gap-3 text-sm">
                        {f.included ? (
                          <CheckCircle
                            className={`h-4 w-4 shrink-0 ${
                              plan.highlighted ? 'text-emerald-300' : 'text-emerald-500'
                            }`}
                          />
                        ) : (
                          <X
                            className={`h-4 w-4 shrink-0 ${
                              plan.highlighted ? 'text-primary-300' : 'text-neutral-300'
                            }`}
                          />
                        )}
                        <span
                          className={
                            plan.highlighted
                              ? f.included
                                ? 'text-white'
                                : 'text-primary-300'
                              : f.included
                              ? 'text-neutral-700'
                              : 'text-neutral-400'
                          }
                        >
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </AnimatedSection>

      {/* FAQ teaser */}
      <AnimatedSection className="py-16 px-6 bg-white text-center">
        <FadeIn>
          <h2 className="text-2xl font-bold text-neutral-900">Questions?</h2>
          <p className="mt-3 text-neutral-500">
            We&apos;re happy to help you find the right plan.
          </p>
          <div className="mt-6">
            <Link href="/about#contact">
              <Button variant="outline" className="gap-2">
                Contact Us <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </FadeIn>
      </AnimatedSection>

      <footer className="border-t border-neutral-200 bg-white py-8 px-6 text-center text-sm text-neutral-500">
        © 2024 Imagenix. All rights reserved.
      </footer>
    </div>
  );
}
