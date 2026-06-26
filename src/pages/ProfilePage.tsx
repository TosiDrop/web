import { useState } from 'react';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { IconCopy, IconCheck, IconWallet, IconClock, IconBookmark, IconChartLine } from '@tabler/icons-react';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { useProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { ThemeToggle } from '@/features/preferences/components/ThemeToggle';
import { NetworkSelector } from '@/features/preferences/components/NetworkSelector';
import { HistoryList } from '@/features/history/components/HistoryList';
import { FavoritesTab } from '@/features/favorites/components/FavoritesTab';
import { RewardBreakdown } from '@/features/profile/components/RewardBreakdown';
import { truncateHash, getNetworkLabel } from '@/utils/format';

const TABS = [
  { name: 'History', Icon: IconClock },
  { name: 'Favorites', Icon: IconBookmark },
  { name: 'Analytics', Icon: IconChartLine },
  { name: 'Preferences', Icon: IconWallet },
];

function StakeAddressDisplay({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          Where your rewards came from — by pool, epoch, and distribution rule.
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
          <p className="label-eyebrow">Appearance & network</p>
          <p className="mt-2 text-sm text-slate-400">
            Personal preferences. Stored on your device.
          </p>
        </div>
        <div className="mt-5 space-y-5">
          <ThemeToggle />
          <NetworkSelector />
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

      <TabGroup>
        <TabList className="flex gap-1 border-b border-border-subtle">
          {TABS.map(({ name, Icon }) => (
            <Tab
              key={name}
              className={({ selected }) =>
                'group -mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition focus:outline-none ' +
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
                    className={selected ? 'text-accent-light' : ''}
                  />
                  {name}
                </>
              )}
            </Tab>
          ))}
        </TabList>

        <TabPanels className="mt-7">
          <TabPanel>
            <HistoryTab />
          </TabPanel>
          <TabPanel>
            <FavoritesTab />
          </TabPanel>
          <TabPanel>
            <AnalyticsTab />
          </TabPanel>
          <TabPanel>
            <PreferencesTab />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
