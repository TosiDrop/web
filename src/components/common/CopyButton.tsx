import { useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  value: string;
  className?: string;
  iconSize?: number;
  feedbackMs?: number;
  ariaLabel?: string;
}

export function CopyButton({
  value,
  className,
  iconSize = 12,
  feedbackMs = 1500,
  ariaLabel = 'Copy',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), feedbackMs);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={cn(
        'rounded-md border border-border-subtle bg-surface-inset/60 p-1.5 text-slate-400 transition hover:border-brand-cyan/40 hover:text-brand-cyan',
        className,
      )}
    >
      {copied ? (
        <IconCheck size={iconSize} stroke={2} />
      ) : (
        <IconCopy size={iconSize} stroke={1.6} />
      )}
    </button>
  );
}
