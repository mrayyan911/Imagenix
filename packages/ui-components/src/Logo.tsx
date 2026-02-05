import * as React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = {
  sm: { icon: 'h-6 w-6', text: 'text-lg' },
  md: { icon: 'h-8 w-8', text: 'text-xl' },
  lg: { icon: 'h-10 w-10', text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${icon} rounded-lg bg-primary-500 flex items-center justify-center`}
      >
        <span className="text-white font-bold text-sm">IX</span>
      </div>
      {showText && (
        <span className={`${text} font-semibold text-neutral-900`}>
          Imagenix
        </span>
      )}
    </div>
  );
}
