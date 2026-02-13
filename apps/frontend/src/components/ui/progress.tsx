'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps {
  /** 0–100 */
  value: number;
  /** e.g. "3 of 6 images annotated" */
  label?: string;
  /** e.g. "~12s remaining" */
  estimatedTime?: string;
  className?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, label, estimatedTime, className }, ref) => {
    const clamped = Math.min(100, Math.max(0, value));

    return (
      <div ref={ref} className={cn('w-full space-y-1.5', className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-700 font-medium">
            {label || `${Math.round(clamped)}%`}
          </span>
          {estimatedTime && (
            <span className="text-neutral-400 text-xs">{estimatedTime}</span>
          )}
        </div>
        <div className="relative h-2.5 w-full rounded-full bg-neutral-200 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              clamped < 100 ? 'bg-primary-500' : 'bg-green-500',
            )}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>{Math.round(clamped)}% complete</span>
          {clamped < 100 && <span className="animate-pulse">Processing...</span>}
          {clamped >= 100 && <span>Done</span>}
        </div>
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
