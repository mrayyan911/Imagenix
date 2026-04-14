'use client';

import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/landing/landing-nav';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerChildren, StaggerItem } from '@/components/animations/stagger-children';
import { AnimatedSection } from '@/components/animations/animated-section';
import { Sparkles, ArrowRight, Github, Linkedin } from 'lucide-react';

const team = [
  {
    name: 'Muhammad Rayyan',
    role: 'Founder and CEO',
    image: '/images/team/rayyan.jpg',
    linkedin: 'https://www.linkedin.com/in/muhammadrayyan911',
    github: 'https://github.com/mrayyan911',
  },
  {
    name: 'Muhammad Khizar Mehmood',
    role: 'Co-Founder',
    image: '/images/team/khizar.jpg',
    linkedin: 'https://www.linkedin.com/in/muhammad-khizar-mehmood-8478642a9',
    github: '',
  },
];

const timeline = [
  {
    year: 'Year 1',
    title: 'The Spark',
    desc: 'From the edge of a bed, laptop open, deep in frustration — hours lost to hunting down images, writing labeling scripts, and wrestling with datasets too small to train anything meaningful. The data desert was real.',
  },
  {
    year: 'Month 3',
    title: 'The Mission Takes Shape',
    desc: 'Frustration became direction. The goal crystallized: eliminate the code barrier for developers and researchers who just want to build — not spend their days wrangling data pipelines.',
  },
  {
    year: 'Month 6',
    title: 'No-Code Annotation Engine',
    desc: 'Built the first working version of a no-code annotation tool — bounding boxes, segmentation masks, and class labeling without writing a single line of code. First internal tests passed.',
  },
  {
    year: 'Month 9',
    title: 'Augmentation Pipeline',
    desc: 'Added an automated augmentation engine that could multiply a handful of images into a robust, production-ready library in minutes. What used to take days now took under five.',
  },
  {
    year: 'Today',
    title: 'Imagenix',
    desc: 'A full No-Code Image Annotation & Augmentation SaaS — built by someone who lived the pain. So the next great idea is never held back by a lack of data.',
  },
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
            The Spark Behind
            <br />
            <span className="text-primary-400">the Screen</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
            Born from late nights, messy datasets, and a relentless frustration with the &ldquo;data desert.&rdquo;
            We stopped waiting for the right tool — and built it.
          </p>
        </FadeIn>
      </section>

      {/* Timeline */}
      <AnimatedSection className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="mb-4 text-center">
            <h2 className="text-3xl font-bold text-neutral-900">Our Journey</h2>
          </FadeIn>
          <FadeIn className="mb-12 text-center">
            <p className="text-neutral-500 max-w-xl mx-auto">
              It started exactly <strong>one year ago</strong> — not in a high-tech lab, but from the edge of a bed
              with a laptop and a relentless frustration with the <em>&ldquo;data desert.&rdquo;</em>
            </p>
          </FadeIn>
          {/* Pull-quote */}
          <FadeIn className="mb-14">
            <blockquote className="relative border-l-4 border-primary-500 pl-6 py-2 text-neutral-600 italic text-lg">
              &ldquo;I was tired of hitting the same brick wall: hours staring at a screen, wrestling with
              insufficient datasets and the grueling, manual labor of labeling images — doing more
              &lsquo;busy work&rsquo; than actual data science.&rdquo;
              <span className="block mt-3 not-italic text-sm font-semibold text-primary-600">— Muhammad Rayyan, Founder</span>
            </blockquote>
          </FadeIn>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-neutral-200" />
            <StaggerChildren className="space-y-10">
              {timeline.map((t) => (
                <StaggerItem key={t.year}>
                  <div className="flex gap-6">
                    <div className="relative z-10 flex-shrink-0 h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shadow-md leading-tight text-center px-1">
                      {t.year}
                    </div>
                    <div className="pt-2">
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
          <StaggerChildren className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
            {team.map((member) => (
              <StaggerItem key={member.name}>
                <div className="p-6 rounded-2xl border border-neutral-200 bg-white text-center hover:shadow-md transition-shadow">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="mx-auto h-24 w-24 rounded-full object-cover"
                  />
                  <h3 className="mt-4 font-semibold text-neutral-900">{member.name}</h3>
                  <p className="text-sm text-primary-600 font-medium">{member.role}</p>
                  <div className="mt-4 flex items-center justify-center gap-3 text-neutral-400">
                    {member.github && (
                      <a href={member.github} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4 hover:text-neutral-700 cursor-pointer transition-colors" />
                      </a>
                    )}
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 hover:text-primary-600 cursor-pointer transition-colors" />
                    </a>
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
