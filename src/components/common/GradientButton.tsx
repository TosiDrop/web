import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

/**
 * The single button primitive for the app. Fixed heights and a shared radius
 * keep every action visually consistent — md (44px) for content actions,
 * sm (36px) for dense areas like the top bar.
 */
const SIZES: Record<NonNullable<GradientButtonProps['size']>, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3.5 text-xs',
  md: 'h-11 gap-2 rounded-xl px-5 text-sm',
};

const VARIANTS: Record<NonNullable<GradientButtonProps['variant']>, string> = {
  primary: cn(
    'bg-[linear-gradient(180deg,#22D3EE,#06B6D4)] text-accent-contrast',
    'shadow-[0_8px_16px_-12px_rgba(34,211,238,0.5)] hover:brightness-110',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
  ),
  secondary: cn(
    'border border-[rgba(56,78,128,0.45)] bg-white/[0.04] text-[#D7D9E0]',
    'hover:bg-white/[0.07] hover:text-white',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ),
};

export function GradientButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: GradientButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
