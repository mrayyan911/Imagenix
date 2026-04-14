'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/landing/landing-nav';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerChildren, StaggerItem } from '@/components/animations/stagger-children';
import { AnimatedSection } from '@/components/animations/animated-section';
import {
  Upload,
  Sparkles,
  Zap,
  Download,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Your Images',
    color: 'bg-blue-100 text-blue-600',
    border: 'border-blue-200',
    points: [
      'Drag-and-drop batch upload — thousands of images at once',
      'Connect S3, GCS, or Azure Blob Storage directly',
      'Automatic deduplication and metadata extraction',
      'Supports JPEG, PNG, TIFF, WebP, and more',
    ],
    detail:
      'Imagenix ingests your images at any scale — from a handful of test shots to multi-million image corpora — without forcing you to pre-process or rename files.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Annotate with AI Assistance',
    color: 'bg-purple-100 text-purple-600',
    border: 'border-purple-200',
    points: [
      'Run zero-shot detection to get instant label suggestions',
      'Draw bounding boxes, polygons, and keypoints manually',
      'Bulk-accept or refine AI suggestions in a fast review UI',
      'Multi-label, multi-class, and instance segmentation support',
    ],
    detail:
      'Our AI pre-labeling engine cuts annotation time by up to 80%. You review and correct — not draw from scratch. The more you correct, the better the model gets.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Augment & Improve Quality',
    color: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-200',
    points: [
      'Apply flips, crops, rotations, and color jitter in bulk',
      'Visualize class distribution to detect imbalance early',
      'Create and restore dataset snapshots at any point',
      'Compare annotation diffs between versions',
    ],
    detail:
      'Great models start with great data. Imagenix helps you catch quality issues, diversify your dataset, and track every change so nothing is ever lost.',
  },
  {
    number: '04',
    icon: Download,
    title: 'Export & Train',
    color: 'bg-amber-100 text-amber-600',
    border: 'border-amber-200',
    points: [
      'Export in COCO JSON, YOLO TXT, or Pascal VOC XML',
      'One-click download or push to your cloud storage bucket',
      'Train/Val/Test split with configurable ratios',
      'Reproducible exports — always tied to a dataset version',
    ],
    detail:
      'Your data is ready the moment you are. Export exactly the split and format your training pipeline expects, then reproduce any experiment later with dataset versioning.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center bg-gradient-to-b from-neutral-950 to-neutral-900">
        <FadeIn>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" /> Workflow
          </span>
          <h1 className="text-5xl font-bold text-white">
            From Raw Images to
            <br />
            <span className="text-primary-400">Training Data in 4 Steps</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
            Imagenix replaces a tangle of scripts and separate tools with one end-to-end workflow
            that any ML engineer can master in an afternoon.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Try It Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Steps */}
      {steps.map((step, i) => (
        <AnimatedSection
          key={step.number}
          className={`py-24 px-6 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
          delay={0.05}
        >
          <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div className={i % 2 !== 0 ? 'md:order-2' : ''}>
              <FadeIn>
                <span className="text-7xl font-black text-neutral-100 leading-none block mb-2">
                  {step.number}
                </span>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${step.color} mb-4`}>
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{step.title}</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">{step.detail}</p>
              </FadeIn>
              <StaggerChildren className="mt-6 space-y-3">
                {step.points.map((pt) => (
                  <StaggerItem key={pt}>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-neutral-700">{pt}</span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>

            {/* Visual placeholder */}
            <FadeIn
              delay={0.15}
              direction={i % 2 === 0 ? 'left' : 'right'}
              className={i % 2 !== 0 ? 'md:order-1' : ''}
            >
              <div
                className={`h-64 rounded-2xl border-2 ${step.border} flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100`}
              >
                <step.icon className={`h-20 w-20 opacity-20 ${step.color.split(' ')[1]}`} />
              </div>
            </FadeIn>
          </div>
        </AnimatedSection>
      ))}

      {/* CTA */}
      <AnimatedSection className="py-20 px-6 bg-primary-600 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-4 text-primary-100 text-lg">
            No setup. No credit card. Upload your first dataset in minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
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
      </AnimatedSection>

      <footer className="border-t border-neutral-200 bg-white py-8 px-6 text-center text-sm text-neutral-500">
        © 2024 Imagenix. All rights reserved.
      </footer>
    </div>
  );
}
