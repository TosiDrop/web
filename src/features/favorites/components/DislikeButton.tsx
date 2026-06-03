import { IconThumbDown, IconThumbDownFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface DislikeButtonProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function DislikeButton({ active, onToggle, className }: DislikeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Remove dislike' : 'Hide this token'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md border transition',
        active
          ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
          : 'border-border-default bg-surface-inset text-slate-500 hover:text-rose-300',
        className,
      )}
    >
      {active ? <IconThumbDownFilled size={13} /> : <IconThumbDown size={13} stroke={1.8} />}
    </button>
  );
}
