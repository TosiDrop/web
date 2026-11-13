import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface FavoriteStarButtonProps {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  ticker?: string;
  className?: string;
}

export function FavoriteStarButton({ active, onToggle, ticker, className, disabled }: FavoriteStarButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      aria-label={ticker ? `Favorite ${ticker}` : 'Favorite token'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg transition',
        active
          ? 'text-cream hover:bg-tint'
          : 'text-text-muted hover:bg-tint-strong hover:text-cream',
        className,
      )}
    >
      {active ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} stroke={1.7} />}
    </button>
  );
}
