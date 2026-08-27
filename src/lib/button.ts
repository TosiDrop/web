import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3.5 text-xs',
  md: 'h-11 gap-2 rounded-xl px-5 text-sm',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(180deg,#22D3EE,#06B6D4)] text-accent-contrast shadow-glow hover:brightness-110 disabled:shadow-none',
  secondary:
    'border border-border-default bg-white/[0.04] text-text-secondary hover:bg-white/[0.07] hover:text-text-primary',
  ghost: 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
  danger:
    'border border-status-error/30 bg-status-error/[0.08] text-status-error-light hover:bg-status-error/[0.14]',
};

/**
 * Returns the button classes so a <Link> or <a> can look like a button.
 */
export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
    'disabled:cursor-not-allowed disabled:opacity-40',
    SIZES[size],
    VARIANTS[variant],
    className,
  );
}
