import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
}

export function GradientButton({
  children,
  variant = 'primary',
  className,
  disabled,
  ...props
}: GradientButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition',
        variant === 'primary' && [
          'bg-brand-cyan text-surface-base',
          'hover:bg-cyan-300',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-cyan',
        ],
        variant === 'outline' && [
          'border border-border-default text-slate-300',
          'hover:bg-surface-overlay hover:text-white',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        ],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
