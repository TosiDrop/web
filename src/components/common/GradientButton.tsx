import type { ButtonHTMLAttributes } from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/lib/button';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The single button primitive. md (44px) for content actions, sm (36px) for
 * dense areas like the top bar. Every button in the app goes through here.
 */
export function GradientButton({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: GradientButtonProps) {
  return <button type={type} className={buttonClassName(variant, size, className)} {...props} />;
}
