interface MinimalWallet {
  signData(address: string, payload: string): Promise<{ signature: string; key: string }>;
}

export interface ProfileSignaturePayload {
  message: string;
  signature: string;
  key: string;
}

const MESSAGE_PREFIX = 'Tosi profile update';

export function buildProfileMessage(stakeAddress: string, now: Date = new Date()): string {
  return `${MESSAGE_PREFIX} for ${stakeAddress} at ${now.toISOString()}`;
}

function utf8ToHex(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/**
 * Build and sign a profile-update authentication payload via CIP-30 signData.
 * The server verifies (signature, key, message) before accepting any write.
 *
 * Throws if the wallet rejects the sign request or the address can't be signed.
 */
export async function signProfileUpdate(
  wallet: MinimalWallet,
  stakeAddress: string,
): Promise<ProfileSignaturePayload> {
  const message = buildProfileMessage(stakeAddress);
  const payloadHex = utf8ToHex(message);
  const { signature, key } = await wallet.signData(stakeAddress, payloadHex);
  return { message, signature, key };
}
