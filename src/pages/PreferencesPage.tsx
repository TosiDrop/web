import { SectionCard } from '@/components/common/SectionCard';
import { ProfileForm } from '@/features/preferences/components/ProfileForm';
import { useWalletState } from '@/store/wallet-state';

const PreferencesPage = () => {
  const { walletApi, stakeAddress, signingAddress } = useWalletState();

  return (
    <div className="space-y-8">
      <header className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-300">
          Preferences
        </p>
        <h1 className="text-4xl font-bold text-white">Customize your profile</h1>
        <p className="text-gray-300">
          Sign a message with your wallet to update the name that appears across
          TosiDrop apps.
        </p>
      </header>

      <SectionCard
        title="Profile"
        description="We only store the display name you provide."
      >
        <ProfileForm
          walletApi={walletApi}
          walletAddress={stakeAddress}
          signingAddress={signingAddress}
        />
      </SectionCard>
    </div>
  );
};

export default PreferencesPage;

