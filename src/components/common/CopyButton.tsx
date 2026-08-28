import { useEffect, useRef, useState } from 'react';
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
  iconSize = 14,
  feedbackMs = 1500,
  ariaLabel = 'Copy',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleClick = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setCopied(false);
    setCopyError(false);

    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopyError(true);
    }

    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      setCopyError(false);
      timeoutRef.current = null;
    }, feedbackMs);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle bg-surface-inset/60 text-text-muted transition hover:border-accent/40 hover:text-accent',
        copied && 'border-status-success/40 text-status-success-light hover:text-status-success-light',
        copyError && 'border-status-error/60 text-status-error-light hover:border-status-error hover:text-status-error-light',
        className,
      )}
    >
      {copied ? (
        <IconCheck size={iconSize} stroke={2} />
      ) : (
        <IconCopy size={iconSize} stroke={1.6} />
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : copyError ? 'Copy failed' : ''}
      </span>
    </button>
  );
}
