'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/landing/landing-nav';
import { TiltCard } from '@/components/landing/tilt-card';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerChildren, StaggerItem } from '@/components/animations/stagger-children';
import { AnimatedSection } from '@/components/animations/animated-section';
import {
  Database,
  Sparkles,
  Download,
  GitBranch,
  Zap,
  Shield,
  Eye,
  RefreshCw,
  Tag,
  BarChart3,
  Cloud,
  Lock,
  ArrowRight,
} from 'lucide-react';

const featureGroups = [
  {
    heading: 'Data Ingestion',
    color: 'bg-blue-600',
    features: [
      {
        icon: Database,
        title: 'Bulk Upload',
        desc: 'Upload thousands of images at once via drag-and-drop or direct cloud storage integration.',
      },
      {
        icon: Cloud,
        title: 'Cloud Sync',
        desc: 'Connect S3, GCS, or Azure Blob Storage and sync datasets without manual downloads.',
      },
      {
        icon: RefreshCw,
        title: 'Deduplication',
        desc: 'Automatic perceptual hash-based duplicate detection to keep your dataset clean.',
      },
    ],
  },
  {
    heading: 'Annotation Tools',
    color: 'bg-purple-600',
    features: [
      {
        icon: Sparkles,
        title: 'AI Auto-Label',
        desc: 'Run zero-shot or fine-tuned models to pre-annotate images before human review.',
      },
      {
        icon: Tag,
        title: 'Bounding Box & Polygon',
        desc: 'Draw precise bounding boxes, polygons, and keypoints with a fast canvas editor.',
      },
      {
        icon: Eye,
        title: 'Review & Refine',
        desc: 'Streamlined review flow to accept, reject, or correct AI suggestions quickly.',
      },
    ],
  },
  {
    heading: 'Dataset Quality',
    color: 'bg-emerald-600',
    features: [
      {
        icon: BarChart3,
        title: 'Class Distribution',
        desc: 'Visualize label distributions and detect class imbalance before training.',
      },
      {
        icon: Zap,
        title: 'Augmentation',
        desc: 'Apply flips, crops, rotations, color jitter, and Gaussian noise in one click.',
      },
      {
        icon: GitBranch,
        title: 'Version Control',
        desc: 'Create snapshots, compare dataset versions, and rollback with one click.',
      },
    ],
  },
  {
    heading: 'Export & Security',
    color: 'bg-amber-600',
    features: [
      {
        icon: Download,
        title: 'Multi-Format Export',
        desc: 'Download in COCO JSON, YOLO TXT, or Pascal VOC XML — instantly.',
      },
      {
        icon: Shield,
        title: 'Team Permissions',
        desc: 'Role-based access control for annotators, reviewers, and project owners.',
      },
      {
        icon: Lock,
        title: 'SOC 2 Ready',
        desc: 'All data encrypted at rest and in transit. GDPR-compliant storage options.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-neutral-950 to-neutral-900 text-center">
        <FadeIn>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" /> Platform Features
          </span>
          <h1 className="text-5xl font-bold text-white mt-4">
            Every Tool You Need,
            <br />
            <span className="text-primary-400">All in One Place</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
            Imagenix bundles data ingestion, AI annotation, quality tools, and export into a single
            seamless workflow — so your team ships training data faster.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Feature groups */}
      {featureGroups.map((group, gi) => (
        <AnimatedSection
          key={group.heading}
          className={`py-20 px-6 ${gi % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
        >
          <div className="mx-auto max-w-6xl">
            <FadeIn>
              <div className="flex items-center gap-3 mb-12">
                <span className={`h-2 w-8 rounded-full ${group.color}`} />
                <h2 className="text-2xl font-bold text-neutral-900">{group.heading}</h2>
              </div>
            </FadeIn>
            <StaggerChildren className="grid gap-5 md:grid-cols-3">
              {group.features.map((f) => (
                <StaggerItem key={f.title}>
                  <TiltCard className="h-full p-6 rounded-2xl border border-neutral-200 bg-white cursor-default hover:border-primary-300 transition-colors">
                    <div className="h-11 w-11 rounded-xl bg-neutral-100 flex items-center justify-center mb-4">
                      <f.icon className="h-5 w-5 text-neutral-700" />
                    </div>
                    <h3 className="text-base font-semibold text-neutral-900">{f.title}</h3>
                    <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{f.desc}</p>
                  </TiltCard>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </AnimatedSection>
      ))}

      {/* CTA */}
      <AnimatedSection className="py-20 px-6 bg-primary-600 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white">Start annotating in minutes</h2>
          <p className="mt-4 text-primary-100 text-lg">
            No setup required. Sign up and upload your first dataset immediately.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
                Create Free Account
              </Button>
            </Link>
          </div>
        </FadeIn>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8 px-6 text-center text-sm text-neutral-500">
        © 2024 Imagenix. All rights reserved.
      </footer>
    </div>
  );
}
