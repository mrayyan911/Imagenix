'use client';

import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/landing/landing-nav';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerChildren, StaggerItem } from '@/components/animations/stagger-children';
import { AnimatedSection } from '@/components/animations/animated-section';
import { Sparkles, ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';

const team = [
  {
    name: 'Alex Rahman',
    role: 'Co-founder & CEO',
    bio: 'Former ML lead at a top-5 tech company. Built dataset pipelines for 100M+ image corpora.',
    avatar: 'AR',
    color: 'bg-primary-100 text-primary-700',
  },
  {
    name: 'Sara Chen',
    role: 'Co-founder & CTO',
    bio: 'PhD in Computer Vision. Author of several open-source annotation tools used by 50k+ developers.',
    avatar: 'SC',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    name: 'Jordan Kim',
    role: 'Head of Product',
    bio: 'Led product at two successful ML startups. Passionate about making AI tooling accessible.',
    avatar: 'JK',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    name: 'Priya Nair',
    role: 'Head of Engineering',
    bio: 'Full-stack engineer with deep expertise in real-time annotation UIs and distributed systems.',
    avatar: 'PN',
    color: 'bg-rose-100 text-rose-700',
  },
];

const timeline = [
  { year: '2022', title: 'Founded', desc: 'Started in a garage after feeling the pain of manual dataset curation at a vision startup.' },
  { year: '2023 Q1', title: 'Public Beta', desc: 'Launched to 500 early users. First AI auto-annotation feature shipped.' },
  { year: '2023 Q3', title: 'Seed Round', desc: 'Raised $3.2M seed to expand the team and build cloud infrastructure.' },
  { year: '2024', title: 'Version Control', desc: 'Shipped dataset versioning — our most-requested feature — and crossed 5,000 users.' },
  { year: 'Today', title: 'Scaling', desc: 'Processing millions of annotations per month for teams across 40 countries.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center bg-gradient-to-b from-neutral-950 to-neutral-900">
        <FadeIn>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" /> Our Story
          </span>
          <h1 className="text-5xl font-bold text-white">
            Built by ML Engineers,
            <br />
            <span className="text-primary-400">for ML Engineers</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
            We got tired of stitching together spreadsheets, custom scripts, and expensive tools to
            manage training data. So we built Imagenix — the platform we wished existed.
          </p>
        </FadeIn>
      </section>

      {/* Timeline */}
      <AnimatedSection className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900">Our Journey</h2>
          </FadeIn>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-neutral-200" />
            <StaggerChildren className="space-y-10">
              {timeline.map((t) => (
                <StaggerItem key={t.year}>
                  <div className="flex gap-6">
                    <div className="relative z-10 flex-shrink-0 h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {t.year.slice(0, 4)}
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                        {t.year}
                      </span>
                      <h3 className="mt-1 text-lg font-semibold text-neutral-900">{t.title}</h3>
                      <p className="mt-1 text-sm text-neutral-600">{t.desc}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </div>
      </AnimatedSection>

      {/* Team */}
      <AnimatedSection className="py-24 px-6 bg-neutral-50">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl font-bold text-neutral-900">Meet the Team</h2>
            <p className="mt-3 text-neutral-500">
              A small team with big ambitions for AI data infrastructure.
            </p>
          </FadeIn>
          <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <StaggerItem key={member.name}>
                <div className="p-6 rounded-2xl border border-neutral-200 bg-white text-center hover:shadow-md transition-shadow">
                  <div
                    className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold ${member.color}`}
                  >
                    {member.avatar}
                  </div>
                  <h3 className="mt-4 font-semibold text-neutral-900">{member.name}</h3>
                  <p className="text-sm text-primary-600 font-medium">{member.role}</p>
                  <p className="mt-3 text-xs text-neutral-500 leading-relaxed">{member.bio}</p>
                  <div className="mt-4 flex items-center justify-center gap-3 text-neutral-400">
                    <Github className="h-4 w-4 hover:text-neutral-700 cursor-pointer transition-colors" />
                    <Twitter className="h-4 w-4 hover:text-neutral-700 cursor-pointer transition-colors" />
                    <Linkedin className="h-4 w-4 hover:text-neutral-700 cursor-pointer transition-colors" />
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </AnimatedSection>

      {/* Contact */}
      <AnimatedSection id="contact" className="py-20 px-6 bg-primary-600 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white">Get in Touch</h2>
          <p className="mt-4 text-primary-100">
            Questions, partnerships, or just want to say hi?
          </p>
          <div className="mt-8">
            <a href="mailto:hello@imagenix.ai">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50 gap-2">
                hello@imagenix.ai <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </FadeIn>
      </AnimatedSection>

      <footer className="border-t border-neutral-200 bg-white py-8 px-6 text-center text-sm text-neutral-500">
        © 2024 Imagenix. All rights reserved.
      </footer>
    </div>
  );
}
