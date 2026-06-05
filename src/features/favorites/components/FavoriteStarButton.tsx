import { IconStar, IconStarFilled } from '@tabler/icons-react';
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
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md border transition',
        active
          ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
          : 'border-border-default bg-surface-inset text-slate-500 hover:text-amber-300',
        className,
      )}
    >
      {active ? <IconStarFilled size={13} /> : <IconStar size={13} stroke={1.8} />}
    </button>
  );
}
