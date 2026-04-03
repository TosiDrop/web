export interface ProfileData {
  walletId: string;
  value: {
    name: string;
  };
}

export interface SaveProfileRequest {
  walletId: string;
  value: {
    name: string;
  };
  signature: string;
  key: string;
  message: string;
}

export interface SaveProfileResponse {
  success: boolean;
  walletId: string;
  error?: string;
}
