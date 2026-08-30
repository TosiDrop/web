import { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { IconCopy, IconCheck, IconWallet, IconClock, IconBookmark, IconChartLine } from '@tabler/icons-react';
import { useProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { truncateHash, getNetworkLabel } from '@/utils/format';

// These panels are independent of the profile header and are only needed
// after the user opens their tab. Keeping them out of the route entry avoids
// loading charting, history, and wallet-editing code for every profile visit.
const HistoryList = lazy(async () => {
  const module = await import('@/features/history/components/HistoryList');
  return { default: module.HistoryList };
});
const FavoritesTab = lazy(async () => {
  const module = await import('@/features/favorites/components/FavoritesTab');
  return { default: module.FavoritesTab };
});
const PersonalAnalytics = lazy(async () => {
  const module = await import('@/features/profile/components/PersonalAnalytics');
  return { default: module.PersonalAnalytics };
});
const RewardBreakdown = lazy(async () => {
  const module = await import('@/features/profile/components/RewardBreakdown');
  return { default: module.RewardBreakdown };
});
const ProfileForm = lazy(async () => {
  const module = await import('@/features/profile/components/ProfileForm');
  return { default: module.ProfileForm };
});
const ThemeToggle = lazy(async () => {
  const module = await import('@/features/preferences/components/ThemeToggle');
  return { default: module.ThemeToggle };
});

function TabLoading() {
  return <div className="card-premium h-48 animate-pulse" aria-label="Loading profile tab" />;
}

const TABS = [
  { id: 'history', name: 'History', Icon: IconClock },
  { id: 'favorites', name: 'Favorites', Icon: IconBookmark },
  { id: 'analytics', name: 'Analytics', Icon: IconChartLine },
  { id: 'preferences', name: 'Preferences', Icon: IconWallet },
];

function StakeAddressDisplay({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group inline-flex items-center gap-2 font-mono text-xs text-slate-300 transition hover:text-white"
      aria-label="Copy stake address"
    >
      <span>{truncateHash(value, 14, 8)}</span>
      <span className="text-slate-500 transition group-hover:text-accent-light">
        {copied ? <IconCheck size={12} stroke={2} /> : <IconCopy size={12} stroke={1.6} />}
      </span>
    </button>
  );
}

function HistoryTab() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-light tracking-tight text-white">
            Claim <span className="font-semibold">history</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Tokens delivered to your stake address.
          </p>
        </div>
        <button
          disabled
          title="Coming soon"
          className="font-mono text-[11px] uppercase tracking-wider text-slate-500 opacity-60 cursor-not-allowed"
        >
          Export · CSV
        </button>
      </div>
      <HistoryList />
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light tracking-tight text-white">
          Reward <span className="font-semibold">analytics</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Delivered claim trends, fee history, and current reward sources.
        </p>
      </div>
      <PersonalAnalytics />
      <div className="pt-2">
        <p className="label-eyebrow">Current allocations</p>
        <p className="mt-1 text-xs text-slate-500">
          Rewards waiting for your next claim, grouped by source.
        </p>
      </div>
      <RewardBreakdown />
    </div>
  );
}

function PreferencesTab() {
  const { stakeAddress, connected, walletName, networkId } = useWalletStore();
  const { data: profile, isLoading } = useProfile(stakeAddress);

  return (
    <div className="space-y-5">
      <section className="card-premium px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-eyebrow">Connected wallet</p>
            <p className="mt-2 text-base font-medium text-white">
              {connected ? walletName ?? 'Wallet' : 'Not connected'}
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {connected ? 'Synced' : 'Offline'}
          </span>
        </div>

        {connected && stakeAddress ? (
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="label-eyebrow">Network</p>
              <p className="mt-1.5 font-mono text-xs text-slate-200">
                {getNetworkLabel(networkId)}
              </p>
            </div>
            <div className="text-right">
              <p className="label-eyebrow">Stake address</p>
              <div className="mt-1.5 flex justify-end">
                <StakeAddressDisplay value={stakeAddress} />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Connect a wallet to view details.
          </p>
        )}
      </section>

      <section className="card-premium px-6 py-5">
        <div className="mb-4">
          <p className="label-eyebrow">Profile</p>
          <p className="mt-2 text-sm text-slate-400">
            Sign a message to update the display name shown across TosiDrop.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading profile...</p>
        ) : (
          <>
            {profile?.value?.name && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-inset/50 px-3 py-2">
                <span className="label-eyebrow">Current</span>
                <span className="text-sm font-medium text-white">
                  {profile.value.name}
                </span>
              </div>
            )}
            <ProfileForm currentName={profile?.value?.name} />
          </>
        )}
      </section>

      <section className="card-premium px-6 py-5">
        <div>
          <p className="label-eyebrow">Appearance</p>
          <p className="mt-2 text-sm text-slate-400">
            Personal preferences. Stored on your device.
          </p>
        </div>
        <div className="mt-5 space-y-5">
          <ThemeToggle />
        </div>
      </section>
    </div>
  );
}

function HeroStakeChip() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const connected = useWalletStore((s) => s.connected);
  if (!connected || !stakeAddress) return null;
  return (
    <span className="font-mono text-xs text-slate-500">
      {truncateHash(stakeAddress, 8, 6)}
    </span>
  );
}

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = Math.max(0, TABS.findIndex((tab) => tab.id === searchParams.get('tab')));

  return (
    <div className="space-y-7">
      <header>
        <p className="label-eyebrow">Account</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Your profile
          </h1>
          <HeroStakeChip />
        </div>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Track claim history, manage saved tokens, and tune how TosiDrop
          talks to your wallet.
        </p>
      </header>

      <TabGroup
        selectedIndex={defaultTab}
        onChange={(index) => {
          const next = new URLSearchParams(searchParams);
          next.set('tab', TABS[index].id);
          setSearchParams(next);
        }}
      >
        <TabList className="grid grid-cols-4 border-b border-border-subtle sm:flex sm:gap-1">
          {TABS.map(({ name, Icon }) => (
            <Tab
              key={name}
              className={({ selected }) =>
                'group -mb-px flex min-w-0 items-center justify-center gap-1.5 border-b-2 px-1 py-2.5 text-xs transition focus:outline-none sm:gap-2 sm:px-3.5 sm:text-sm ' +
                (selected
                  ? 'border-accent font-semibold text-white'
                  : 'border-transparent font-medium text-slate-500 hover:text-slate-200')
              }
            >
              {({ selected }) => (
                <>
                  <Icon
                    size={14}
                    stroke={1.6}
                    className={
                      'hidden shrink-0 sm:block ' +
                      (selected ? 'text-accent-light' : '')
                    }
                  />
                  {name}
                </>
              )}
            </Tab>
          ))}
        </TabList>

        <TabPanels className="mt-7">
          <TabPanel>
            <Suspense fallback={<TabLoading />}><HistoryTab /></Suspense>
          </TabPanel>
          <TabPanel>
            <Suspense fallback={<TabLoading />}><FavoritesTab /></Suspense>
          </TabPanel>
          <TabPanel>
            <Suspense fallback={<TabLoading />}><AnalyticsTab /></Suspense>
          </TabPanel>
          <TabPanel>
            <Suspense fallback={<TabLoading />}><PreferencesTab /></Suspense>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
