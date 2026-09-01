import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** raised — default panel. inset — recessed well for empty states and sub-panels. */
  variant?: 'raised' | 'inset';
  as?: 'div' | 'section' | 'article';
}

const VARIANTS: Record<NonNullable<CardProps['variant']>, string> = {
  raised: 'card-premium',
  inset: 'rounded-2xl border border-border-subtle bg-surface-inset',
};

/** The single card surface. Pad with className (p-5 for content, p-6 for sections). */
export function Card({ variant = 'raised', as: Tag = 'div', className, ...props }: CardProps) {
  return <Tag className={cn(VARIANTS[variant], className)} {...props} />;
}
