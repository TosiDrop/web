import { Link } from 'react-router-dom';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { IconBell, IconGift } from '@tabler/icons-react';
import { useRewardAlerts } from '../hooks/useRewardAlerts';

export function RewardAlertsButton({ stakeAddress }: { stakeAddress: string }) {
  const { count, isLoading, error, browserEnabled, browserError, enableBrowserAlerts, disableBrowserAlerts } = useRewardAlerts(stakeAddress);
  const buttonLabel = count && count > 0
    ? `${count} reward token type${count === 1 ? '' : 's'} ready`
    : 'Reward alerts';

  return (
    <Popover className="relative">
      <PopoverButton
        type="button"
        aria-label={buttonLabel}
        className="relative flex h-10 min-w-10 items-center justify-center rounded-full border border-border-default bg-white/[0.03] px-2 text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <IconBell size={17} stroke={1.7} aria-hidden />
        {count !== null && count > 0 && (
          <span className="ml-1.5 min-w-4 rounded-full bg-accent px-1 py-0.5 text-center font-mono text-2xs leading-none text-accent-contrast">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </PopoverButton>
      <PopoverPanel className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-border-default bg-surface-overlay p-4 shadow-pop focus:outline-none">
        <div className="flex items-center gap-2 text-text-primary">
          <IconGift size={18} stroke={1.7} className="text-accent-light" aria-hidden />
          <h2 className="text-sm font-semibold">Reward alerts</h2>
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          {count === null
            ? error ? 'Rewards are temporarily unavailable.' : isLoading ? 'Checking your rewards…' : 'Waiting for wallet rewards.'
            : count > 0
              ? `${count} token type${count === 1 ? '' : 's'} ready to claim`
              : 'No rewards ready right now.'}
        </p>
        <Link to="/claim" className="mt-3 inline-flex text-xs font-medium text-accent-light hover:underline">
          Review rewards
        </Link>
        <div className="mt-4 border-t border-border-subtle pt-3">
          <p className="text-xs leading-5 text-text-muted">In-app alerts appear when this wallet gains rewards. Browser alerts run while TosiDrop is open in this browser.</p>
          <button
            type="button"
            onClick={() => { if (browserEnabled) disableBrowserAlerts(); else void enableBrowserAlerts(); }}
            className="mt-3 rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-secondary hover:border-accent/50 hover:text-text-primary"
          >
            {browserEnabled ? 'Disable browser alerts' : 'Enable browser alerts'}
          </button>
          {browserError && <p role="alert" className="mt-2 text-xs text-status-error-light">{browserError}</p>}
        </div>
      </PopoverPanel>
    </Popover>
  );
}
