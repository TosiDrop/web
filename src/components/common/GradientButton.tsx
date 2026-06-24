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
        'inline-flex items-center justify-center rounded-[11px] px-4 py-2 text-sm font-semibold transition',
        variant === 'primary' && [
          'bg-[linear-gradient(180deg,#6F72F5,#5A5DE8)] text-white',
          'shadow-[0_10px_24px_-12px_rgba(99,102,241,0.85)] hover:brightness-110',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        ],
        variant === 'outline' && [
          'border border-white/[0.14] bg-white/[0.04] text-[#D7D9E0]',
          'hover:bg-white/[0.07] hover:text-white',
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
