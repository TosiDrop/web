import { IconEyeOff } from '@tabler/icons-react';
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
      aria-label={active ? 'Unhide token' : 'Hide token'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg transition',
        active
          ? 'text-[#9AA6BE] hover:bg-white/[0.06]'
          : 'text-[#5F6680] hover:bg-white/[0.06] hover:text-[#9AA6BE]',
        className,
      )}
    >
      <IconEyeOff size={15} stroke={active ? 1.9 : 1.7} />
    </button>
  );
}
