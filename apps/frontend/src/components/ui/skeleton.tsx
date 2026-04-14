'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-neutral-100',
        'before:absolute before:inset-0',
        'before:-translate-x-full before:animate-[shimmer_1.5s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl border border-neutral-200 bg-white space-y-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="p-6 rounded-xl border border-neutral-200 bg-white space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-1/3" />
    </div>
  );
}
