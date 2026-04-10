import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const ADA_HANDLE_POLICY_ID = 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a';
const KOIOS_BASE = 'https://api.koios.rest/api/v1';

function textToHex(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const handle = new URL(context.request.url).searchParams.get('handle');

  if (!handle) {
    return errorResponse('handle parameter is required', 400);
  }

  const name = handle.startsWith('$') ? handle.slice(1) : handle;
  const hexName = textToHex(name.toLowerCase());

  try {
    // Step 1: Find the address holding this handle NFT
    const nftRes = await fetch(`${KOIOS_BASE}/asset_nft_address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _asset_policy: ADA_HANDLE_POLICY_ID, _asset_name: hexName }),
    });

    if (!nftRes.ok) {
      return errorResponse(`Koios lookup failed (${nftRes.status})`, 502);
    }

    const nftData = await nftRes.json() as Array<{ payment_address: string }>;
    if (!nftData.length || !nftData[0].payment_address) {
      return errorResponse(`Handle "$${name}" not found`, 404);
    }

    const paymentAddress = nftData[0].payment_address;

    // Step 2: Get the stake address from the payment address
    const addrRes = await fetch(`${KOIOS_BASE}/address_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _addresses: [paymentAddress] }),
    });

    if (!addrRes.ok) {
      return errorResponse(`Address lookup failed (${addrRes.status})`, 502);
    }

    const addrData = await addrRes.json() as Array<{ stake_address: string | null }>;
    const stakeAddress = addrData[0]?.stake_address;

    if (!stakeAddress) {
      return errorResponse(`No stake address found for handle "$${name}"`, 404);
    }

    return jsonResponse({ handle: `$${name}`, stakeAddress });
  } catch (error) {
    console.error('resolveHandle error:', error);
    return errorResponse('Failed to resolve handle');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
