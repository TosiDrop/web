import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { useProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { ThemeToggle } from '@/features/preferences/components/ThemeToggle';
import { NetworkSelector } from '@/features/preferences/components/NetworkSelector';
import { HistoryPageHeader } from '@/features/history/components/HistoryPageHeader';
import { truncateHash, getNetworkLabel } from '@/utils/format';

const TABS = ['History', 'Analytics', 'Preferences'] as const;

function tabClass(selected: boolean): string {
  return (
    'rounded-md px-4 py-2 text-sm transition border-b-2 -mb-px focus:outline-none ' +
    (selected
      ? 'border-brand-cyan text-white font-medium'
      : 'border-transparent text-slate-400 hover:text-slate-200')
  );
}

function HistoryTab() {
  return (
    <div className="space-y-6">
      <HistoryPageHeader />
      <p className="py-12 text-center text-sm text-gray-400">
        Claim history will appear here once the history API is available.
      </p>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Analytics</h2>
      <p className="text-sm text-slate-400">
        Charts and reward analytics ship with M7.
      </p>
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-raised/50 p-10 text-center text-xs text-slate-500">
        Coming soon
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { stakeAddress, connected, walletName, networkId } = useWalletStore();
  const { data: profile, isLoading } = useProfile(stakeAddress);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
        <h2 className="text-xs font-medium text-slate-400">Wallet</h2>
        {connected && stakeAddress ? (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Provider</span>
              <span className="text-slate-300">{walletName ?? 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Network</span>
              <span className="text-slate-300">{getNetworkLabel(networkId)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Stake address</span>
              <span className="font-mono text-slate-400">
                {truncateHash(stakeAddress, 14, 8)}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Connect a wallet to view details.</p>
        )}
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
        <div className="mb-4">
          <h2 className="text-xs font-medium text-slate-400">Profile</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Sign a message to update the display name shown across TosiDrop.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading profile...</p>
        ) : (
          <>
            {profile?.value?.name && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-inset px-3 py-2">
                <span className="text-xs text-slate-500">Current name</span>
                <span className="text-sm font-medium text-white">{profile.value.name}</span>
              </div>
            )}
            <ProfileForm currentName={profile?.value?.name} />
          </>
        )}
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-raised p-5 space-y-5">
        <h2 className="text-xs font-medium text-slate-400">Appearance & Network</h2>
        <ThemeToggle />
        <NetworkSelector />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          History, analytics, and account preferences.
        </p>
      </div>

      <TabGroup>
        <TabList className="flex gap-2 border-b border-border-subtle">
          {TABS.map((name) => (
            <Tab key={name} className={({ selected }) => tabClass(selected)}>
              {name}
            </Tab>
          ))}
        </TabList>
        <TabPanels className="mt-6">
          <TabPanel>
            <HistoryTab />
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
