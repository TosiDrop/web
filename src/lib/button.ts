import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3.5 text-xs',
  md: 'h-11 gap-2 rounded-xl px-5 text-sm',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:bg-accent-light',
  secondary:
    'border border-border-default bg-tint text-text-secondary hover:bg-tint-strong hover:text-text-primary',
  ghost: 'text-text-muted hover:bg-tint hover:text-text-primary',
  danger:
    'border border-status-error-line bg-status-error-soft text-status-error-light hover:border-status-error',
};

/**
 * Returns the button classes so a <Link> or <a> can look like a button.
 */
export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition duration-[120ms] ease-out active:scale-[0.97]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
    'disabled:cursor-not-allowed disabled:opacity-40',
    SIZES[size],
    VARIANTS[variant],
    className,
  );
}
