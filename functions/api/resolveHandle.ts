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
  const { request } = context;
  const origin = request.headers.get('Origin');
  const handle = new URL(request.url).searchParams.get('handle');

  if (!handle) {
    return errorResponse('handle parameter is required', 400, origin);
  }

  const name = handle.startsWith('$') ? handle.slice(1) : handle;

  if (name.length === 0 || name.length > 15 || !/^[a-zA-Z0-9_.-]+$/.test(name)) {
    return errorResponse('Invalid handle format', 400, origin);
  }
  const hexName = textToHex(name.toLowerCase());

  try {
    const nftRes = await fetch(`${KOIOS_BASE}/asset_nft_address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _asset_policy: ADA_HANDLE_POLICY_ID, _asset_name: hexName }),
    });

    if (!nftRes.ok) {
      return errorResponse(`Koios lookup failed (${nftRes.status})`, 502, origin);
    }

    const nftData = await nftRes.json() as Array<{ payment_address: string }>;
    if (!nftData.length || !nftData[0].payment_address) {
      return errorResponse(`Handle "$${name}" not found`, 404, origin);
    }

    const paymentAddress = nftData[0].payment_address;

    const addrRes = await fetch(`${KOIOS_BASE}/address_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _addresses: [paymentAddress] }),
    });

    if (!addrRes.ok) {
      return errorResponse(`Address lookup failed (${addrRes.status})`, 502, origin);
    }

    const addrData = await addrRes.json() as Array<{ stake_address: string | null }>;
    const stakeAddress = addrData[0]?.stake_address;

    if (!stakeAddress) {
      return errorResponse(`No stake address found for handle "$${name}"`, 404, origin);
    }

    return jsonResponse({ handle: `$${name}`, stakeAddress }, 200, origin);
  } catch (error) {
    console.error('resolveHandle error:', error);
    return errorResponse('Failed to resolve handle', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
