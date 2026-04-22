import { create } from 'zustand';

export type OnboardingStep =
  | 'welcome'
  | 'select-wallet'
  | 'connecting'
  | 'profile-setup'
  | 'onboarding-tour'
  | 'complete';

interface OnboardingStore {
  isOpen: boolean;
  step: OnboardingStep;
  profileName: string;
  profileBio: string;
  profileAvatar: string | null;
  isFirstTime: boolean;

  openModal: () => void;
  closeModal: () => void;
  setStep: (step: OnboardingStep) => void;
  setProfileName: (name: string) => void;
  setProfileBio: (bio: string) => void;
  setProfileAvatar: (url: string | null) => void;
  setIsFirstTime: (value: boolean) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  step: 'welcome' as OnboardingStep,
  profileName: '',
  profileBio: '',
  profileAvatar: null as string | null,
  isFirstTime: true,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initialState,
  openModal: () => set({ isOpen: true, step: 'welcome' }),
  closeModal: () => set({ isOpen: false }),
  setStep: (step) => set({ step }),
  setProfileName: (profileName) => set({ profileName }),
  setProfileBio: (profileBio) => set({ profileBio }),
  setProfileAvatar: (profileAvatar) => set({ profileAvatar }),
  setIsFirstTime: (isFirstTime) => set({ isFirstTime }),
  reset: () => set(initialState),
}));
