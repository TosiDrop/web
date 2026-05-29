interface SignFavoritesPayload {
  wallet: {
    signData: (address: string, payload: string) => Promise<{ signature: string; key: string }>;
  };
  stakeAddress: string;
  assetIds: string[];
}

// Must stay byte-identical to favoritesDigest() in
// functions/services/verifyStakeSignature.ts — the server recomputes and compares.
async function favoritesDigest(assetIds: string[]): Promise<string> {
  const sorted = [...assetIds].sort();
  const data = new TextEncoder().encode(sorted.join(','));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function toHex(value: string): string {
  return Array.from(new TextEncoder().encode(value))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signFavoritesUpdateMessage({
  wallet,
  stakeAddress,
  assetIds,
}: SignFavoritesPayload): Promise<{ signature: string; key: string; message: string }> {
  const digest = await favoritesDigest(assetIds);
  const message =
    `Tosi favorites update for ${stakeAddress} at ${new Date().toISOString()}\n` +
    `favorites: ${assetIds.length} [${digest}]`;

  // CIP-30: sign with the stake/reward address so the server can verify
  // stake-address ownership.
  const result = await wallet.signData(stakeAddress, toHex(message));
  return { signature: result.signature, key: result.key, message };
}
