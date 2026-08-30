import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface FavoriteStarButtonProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function FavoriteStarButton({ active, onToggle, className }: FavoriteStarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Remove from saved' : 'Save token'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg transition',
        active
          ? 'text-[#E7B86E] hover:bg-[#E7B86E]/[0.1]'
          : 'text-[#5F6680] hover:bg-white/[0.06] hover:text-[#E7B86E]',
        className,
      )}
    >
      {active ? <IconBookmarkFilled size={15} /> : <IconBookmark size={15} stroke={1.7} />}
    </button>
  );
}
