import { create } from 'zustand';

export type OnboardingStep = 'select-wallet' | 'connecting' | 'profile-setup';

/** Set when the user skips profile setup on this device; we stop asking. */
export const PROFILE_SKIPPED_KEY = 'tosidrop-profile-skipped';

interface OnboardingStore {
  isOpen: boolean;
  step: OnboardingStep;
  profileName: string;
  profileBio: string;
  profileAvatar: string | null;
  isFirstTime: boolean;
  connectError: string | null;
  saveError: string | null;

  openModal: () => void;
  closeModal: () => void;
  setStep: (step: OnboardingStep) => void;
  setProfileName: (name: string) => void;
  setProfileBio: (bio: string) => void;
  setProfileAvatar: (url: string | null) => void;
  setIsFirstTime: (value: boolean) => void;
  setConnectError: (err: string | null) => void;
  setSaveError: (err: string | null) => void;
}

const initialState = {
  isOpen: false,
  step: 'select-wallet' as OnboardingStep,
  profileName: '',
  profileBio: '',
  profileAvatar: null as string | null,
  isFirstTime: true,
  connectError: null as string | null,
  saveError: null as string | null,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initialState,
  openModal: () => set({ ...initialState, isOpen: true }),
  closeModal: () => set({ ...initialState }),
  setStep: (step) => set({ step }),
  setProfileName: (profileName) => set({ profileName }),
  setProfileBio: (profileBio) => set({ profileBio }),
  setProfileAvatar: (profileAvatar) => set({ profileAvatar }),
  setIsFirstTime: (isFirstTime) => set({ isFirstTime }),
  setConnectError: (connectError) => set({ connectError }),
  setSaveError: (saveError) => set({ saveError }),
}));

export const profileSetupSkipped = () =>
  typeof localStorage !== 'undefined' && localStorage.getItem(PROFILE_SKIPPED_KEY) === '1';
