import { lazy, Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { IconClock, IconBookmark, IconChartLine, IconSettings } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { CopyButton } from '@/components/common/CopyButton';
import { useProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { truncateHash, getNetworkLabel } from '@/utils/format';

const HistoryList = lazy(async () => {
  const module = await import('@/features/history/components/HistoryList');
  return { default: module.HistoryList };
});
const FavoritesTab = lazy(async () => {
  const module = await import('@/features/favorites/components/FavoritesTab');
  return { default: module.FavoritesTab };
});
const RewardBreakdown = lazy(async () => {
  const module = await import('@/features/profile/components/RewardBreakdown');
  return { default: module.RewardBreakdown };
});
const PersonalAnalytics = lazy(async () => {
  const module = await import('@/features/profile/components/PersonalAnalytics');
  return { default: module.PersonalAnalytics };
});
const ProfileForm = lazy(async () => {
  const module = await import('@/features/profile/components/ProfileForm');
  return { default: module.ProfileForm };
});

function TabLoading() {
  return (
    <div role="status" aria-label="Loading profile tab" className="card-premium h-48 animate-pulse" />
  );
}

const TABS = [
  { id: 'history', name: 'History', Icon: IconClock },
  { id: 'favorites', name: 'Favorites', Icon: IconBookmark },
  { id: 'analytics', name: 'Analytics', Icon: IconChartLine },
  { id: 'settings', name: 'Settings', Icon: IconSettings },
];

function HistoryTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Claim history</h2>
        <p className="mt-1 text-sm text-text-muted">Tokens delivered to your stake address.</p>
      </div>
      <HistoryList />
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Reward analytics</h2>
        <p className="mt-1 text-sm text-text-muted">
          Delivered claim trends, fee history, and current reward sources.
        </p>
      </div>
      <PersonalAnalytics />
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-text-primary">Current allocations</h3>
        <p className="mt-1 text-xs text-text-muted">
          Rewards waiting for your next claim, grouped by source.
        </p>
      </div>
      <RewardBreakdown />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="space-y-4">
      <div className="skeleton-shimmer h-3 w-24 rounded" />
      <div className="skeleton-shimmer h-10 w-full rounded-lg" />
      <div className="skeleton-shimmer h-11 w-28 rounded-xl" />
    </div>
  );
}

function SettingsTab() {
  const { stakeAddress, connected, walletName, networkId } = useWalletStore();
  const { data: profile, isLoading } = useProfile(stakeAddress);

  return (
    <div className="space-y-5">
      <Card as="section" className="p-6">
        <h2 className="text-sm font-semibold text-text-primary">Connected wallet</h2>
        <p className="mt-2 text-base font-medium text-text-primary">
          {connected ? walletName ?? 'Wallet' : 'Not connected'}
        </p>

        {connected && stakeAddress ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label-eyebrow">Network</p>
              <p className="mt-1.5 font-mono text-xs text-text-secondary">
                {getNetworkLabel(networkId)}
              </p>
            </div>
            <div>
              <p className="label-eyebrow">Stake address</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-mono text-xs text-text-secondary">
                  {truncateHash(stakeAddress, 14, 8)}
                </span>
                <CopyButton value={stakeAddress} ariaLabel="Copy stake address" />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">Connect a wallet to view details.</p>
        )}
      </Card>

      <Card as="section" className="p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Display name</h2>
          <p className="mt-2 text-sm text-text-muted">
            Sign a message to update the display name shown across TosiDrop.
          </p>
        </div>

        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {profile?.value?.name && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-inset px-3 py-2">
                <span className="label-eyebrow">Current</span>
                <span className="text-sm font-medium text-text-primary">{profile.value.name}</span>
              </div>
            )}
            <ProfileForm currentName={profile?.value?.name} />
          </>
        )}
      </Card>
    </div>
  );
}

function HeroStakeChip() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const connected = useWalletStore((s) => s.connected);
  if (!connected || !stakeAddress) return null;
  return (
    <span className="font-mono text-xs text-text-muted">{truncateHash(stakeAddress, 8, 6)}</span>
  );
}

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabIndex = Math.max(0, TABS.findIndex((t) => t.id === searchParams.get('tab')));
  const tabListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabListRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
  }, [tabIndex]);

  return (
    <div className="space-y-7">
      <header>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Your profile</h1>
          <HeroStakeChip />
        </div>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Claim history, saved tokens, and your display name.
        </p>
      </header>

      <TabGroup
        selectedIndex={tabIndex}
        onChange={(i) => setSearchParams({ tab: TABS[i].id }, { replace: true })}
      >
        <div className="border-b border-border-subtle">
          <TabList
            ref={tabListRef}
            className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TABS.map(({ name, Icon }) => (
              <Tab
                key={name}
                className={({ selected }) =>
                  'flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 ' +
                  (selected
                    ? 'border-accent font-semibold text-text-primary'
                    : 'border-transparent font-medium text-text-muted hover:text-text-secondary')
                }
              >
                {({ selected }) => (
                  <>
                    <Icon
                      size={14}
                      stroke={1.6}
                      aria-hidden
                      className={selected ? 'text-accent-light' : ''}
                    />
                    {name}
                  </>
                )}
              </Tab>
            ))}
          </TabList>
        </div>

        <TabPanels className="mt-7">
          <TabPanel>
            <Suspense fallback={<TabLoading />}>
              <HistoryTab />
            </Suspense>
          </TabPanel>
          <TabPanel>
            <Suspense fallback={<TabLoading />}>
              <FavoritesTab />
            </Suspense>
          </TabPanel>
          <TabPanel>
            <Suspense fallback={<TabLoading />}>
              <AnalyticsTab />
            </Suspense>
          </TabPanel>
          <TabPanel>
            <Suspense fallback={<TabLoading />}>
              <SettingsTab />
            </Suspense>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
