import { IconEyeOff } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface DislikeButtonProps {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  ticker?: string;
  className?: string;
}

export function DislikeButton({ active, onToggle, ticker, className, disabled }: DislikeButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      aria-label={ticker ? `Hide ${ticker}` : 'Hide token'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg transition',
        active
          ? 'text-text-secondary hover:bg-tint-strong'
          : 'text-text-muted hover:bg-tint-strong hover:text-text-secondary',
        className,
      )}
    >
      <IconEyeOff size={18} stroke={active ? 1.9 : 1.7} />
    </button>
  );
}
