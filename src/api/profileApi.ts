export interface ProfileDataPayload {
  walletId: string;
  value: {
    name: string;
  };
}

export interface ProfileDataResponse {
  walletId: string;
  value: {
    name: string;
  };
}

export interface StoreResponse {
  success: boolean;
  walletId: string;
}

interface ErrorResponse {
  error?: string;
}

export async function storeProfileData(
  payload: ProfileDataPayload
): Promise<StoreResponse> {
  const response = await fetch('/api/profileData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let error: string;
    try {
      const errorMessage = await response.json() as ErrorResponse;
      error = errorMessage.error || JSON.stringify(errorMessage);
    } catch {
      error = await response.text();
    }
    throw new Error(`API error! status: ${response.status}, message: ${error}`);
  }

  // parse the JSON success payload
  return await response.json();
}

export async function getProfileData(
  walletId: string
): Promise<ProfileDataResponse | null> {
  const response = await fetch(
    `/api/profileData?walletId=${encodeURIComponent(walletId)}`
  );

  if (response.status === 404) {
    console.warn(`No profile data found for walletId: ${walletId}`);
    return null;
  }
  if (!response.ok) {
    let error: string;
    try {
      const errorMessage = await response.json() as ErrorResponse;
      error = errorMessage.error || JSON.stringify(errorMessage);
    } catch {
      error = await response.text();
    }
    throw new Error(`API error! status: ${response.status}, message: ${error}`);
  }
  return await response.json();
}
