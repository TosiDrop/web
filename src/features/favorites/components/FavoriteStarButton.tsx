import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface FavoriteStarButtonProps {
  active: boolean;
  onToggle: () => void;
  ticker?: string;
  className?: string;
}

export function FavoriteStarButton({ active, onToggle, ticker, className }: FavoriteStarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ticker ? `Favorite ${ticker}` : 'Favorite token'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg transition',
        active
          ? 'text-cream hover:bg-cream/[0.1]'
          : 'text-text-muted hover:bg-white/[0.06] hover:text-cream',
        className,
      )}
    >
      {active ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} stroke={1.7} />}
    </button>
  );
}
