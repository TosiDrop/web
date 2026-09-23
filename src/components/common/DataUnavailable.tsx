import { IconDatabaseOff, IconRefresh } from '@tabler/icons-react';
import { GradientButton } from './GradientButton';

interface DataUnavailableProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function DataUnavailable({ title, message, onRetry }: DataUnavailableProps) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface-inset/45 px-4 py-3">
      <IconDatabaseOff size={18} stroke={1.6} className="shrink-0 text-text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-text-muted">{message}</p>
      </div>
      {onRetry && (
        <GradientButton variant="ghost" size="sm" onClick={onRetry}>
          <IconRefresh size={14} stroke={1.8} aria-hidden />
          Retry
        </GradientButton>
      )}
    </div>
  );
}
