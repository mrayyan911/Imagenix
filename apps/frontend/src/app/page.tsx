'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Sparkles, 
  Download, 
  GitBranch,
  ArrowRight,
  CheckCircle 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">IX</span>
              </div>
              <span className="text-xl font-semibold text-neutral-900">Imagenix</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl">
            Build High-Quality Image Datasets{' '}
            <span className="text-primary-500">Faster with AI</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-600 max-w-2xl mx-auto">
            Upload, annotate, augment, and export your image datasets with AI-powered tools.
            Reduce dataset preparation time by 60% and focus on building better models.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-neutral-900">
            Everything You Need for Dataset Preparation
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-neutral-200 bg-neutral-50">
              <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                Dataset Management
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                Upload and organize images with automatic duplicate detection and metadata tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-neutral-200 bg-neutral-50">
              <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                AI Auto-Annotation
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                Automatically detect and label objects with AI. Review and refine suggestions instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-neutral-200 bg-neutral-50">
              <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                Version Control
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                Track dataset changes with snapshots. Rollback anytime with full annotation history.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border border-neutral-200 bg-neutral-50">
              <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <Download className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                Multi-Format Export
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                Export datasets in COCO, YOLO, and Pascal VOC formats. Ready for training.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-neutral-900">
            Ready to Build Better Datasets?
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Join thousands of ML engineers who trust Imagenix for their dataset needs.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Create Free Account</Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-neutral-500">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" /> No credit card required
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" /> 10GB free storage
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">IX</span>
            </div>
            <span className="text-sm text-neutral-600">
              © 2024 Imagenix. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <a href="#" className="hover:text-neutral-900">Documentation</a>
            <a href="#" className="hover:text-neutral-900">Privacy</a>
            <a href="#" className="hover:text-neutral-900">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
