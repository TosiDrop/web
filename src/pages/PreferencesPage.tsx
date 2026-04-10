import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { useProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { truncateHash, getNetworkLabel } from '@/utils/format';

export default function PreferencesPage() {
  const { stakeAddress, connected, walletName, networkId } = useWalletStore();
  const { data: profile, isLoading } = useProfile(stakeAddress);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Manage your profile and wallet preferences.
        </p>
      </div>

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
    </div>
  );
}
