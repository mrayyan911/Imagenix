import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ProgressBar } from '@/components/layout/progress-bar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Imagenix - AI Dataset Intelligence Platform',
  description:
    'Build high-quality image datasets faster with AI-powered annotation, augmentation, and version control.',
  keywords: ['AI', 'machine learning', 'dataset', 'annotation', 'computer vision', 'object detection'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ProgressBar />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
