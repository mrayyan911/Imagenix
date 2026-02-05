'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const percentage = ((value[0] - min) / (max - min)) * 100;

    return (
      <div className={cn('relative w-full', className)}>
        <div className="relative h-2 w-full rounded-full bg-neutral-200">
          <div
            className="absolute h-full rounded-full bg-primary-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          ref={ref}
          value={value[0]}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
          className={cn(
            'absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:shadow-md',
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-500',
            '[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2',
            '[&::-moz-range-thumb]:border-white'
          )}
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
