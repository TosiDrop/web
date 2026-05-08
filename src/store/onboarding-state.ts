import { create } from 'zustand';

export type OnboardingStep =
  | 'welcome'
  | 'select-wallet'
  | 'connecting'
  | 'profile-setup'
  | 'onboarding-tour'
  | 'welcome-back'
  | 'complete';

interface OnboardingStore {
  isOpen: boolean;
  step: OnboardingStep;
  profileName: string;
  profileBio: string;
  profileAvatar: string | null;
  isFirstTime: boolean;
  connectError: string | null;
  saveError: string | null;
  returningUserName: string | null;

  openModal: () => void;
  closeModal: () => void;
  setStep: (step: OnboardingStep) => void;
  setProfileName: (name: string) => void;
  setProfileBio: (bio: string) => void;
  setProfileAvatar: (url: string | null) => void;
  setIsFirstTime: (value: boolean) => void;
  setConnectError: (err: string | null) => void;
  setSaveError: (err: string | null) => void;
  setReturningUserName: (name: string | null) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  step: 'welcome' as OnboardingStep,
  profileName: '',
  profileBio: '',
  profileAvatar: null as string | null,
  isFirstTime: true,
  connectError: null as string | null,
  saveError: null as string | null,
  returningUserName: null as string | null,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initialState,
  openModal: () => set({ ...initialState, isOpen: true, step: 'welcome' }),
  closeModal: () => set({ ...initialState }),
  setStep: (step) => set({ step }),
  setProfileName: (profileName) => set({ profileName }),
  setProfileBio: (profileBio) => set({ profileBio }),
  setProfileAvatar: (profileAvatar) => set({ profileAvatar }),
  setIsFirstTime: (isFirstTime) => set({ isFirstTime }),
  setConnectError: (connectError) => set({ connectError }),
  setSaveError: (saveError) => set({ saveError }),
  setReturningUserName: (returningUserName) => set({ returningUserName }),
  reset: () => set(initialState),
}));
