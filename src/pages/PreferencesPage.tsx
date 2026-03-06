import { SectionCard } from '@/components/common/SectionCard';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { useProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';

export default function PreferencesPage() {
  const { stakeAddress } = useWalletStore();
  const { data: profile } = useProfile(stakeAddress);

  return (
    <div className="space-y-8">
      <header className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-300">Preferences</p>
        <h1 className="text-4xl font-bold text-white">Customize your profile</h1>
        <p className="text-gray-300">
          Sign a message with your wallet to update the name that appears across TosiDrop apps.
        </p>
      </header>

      {profile?.value?.name && (
        <SectionCard title="Current profile">
          <p className="text-gray-300">
            Display name: <span className="font-semibold text-white">{profile.value.name}</span>
          </p>
        </SectionCard>
      )}

      <SectionCard
        title="Profile"
        description="We only store the display name you provide."
      >
        <ProfileForm />
      </SectionCard>
    </div>
  );
}
