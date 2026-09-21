import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';
import { KoiosClient } from '../services/koiosClient';

const ADA_HANDLE_POLICY_ID = 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a';

// CIP-68 asset name prefixes used by ADA Handle.
// Most active handles live on label 222 (user NFT). Legacy pre-CIP-68 handles
// have no prefix. SubHandles use label 314.
const CIP68_LABEL_222 = '000de140';
const CIP68_LABEL_314 = '0013ab30';

function textToHex(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function lookupHolder(koios: KoiosClient, assetName: string): Promise<string | null> {
  let data: Array<{ payment_address?: string }>;
  try {
    data = await koios.post('asset_nft_address', {
      _asset_policy: ADA_HANDLE_POLICY_ID,
      _asset_name: assetName,
    });
  } catch {
    return null;
  }
  return data[0]?.payment_address ?? null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
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
  const koios = new KoiosClient(env);

  try {
    const candidates = [
      CIP68_LABEL_222 + hexName,
      hexName,
      CIP68_LABEL_314 + hexName,
    ];

    let paymentAddress: string | null = null;
    for (const assetName of candidates) {
      paymentAddress = await lookupHolder(koios, assetName);
      if (paymentAddress) break;
    }

    if (!paymentAddress) {
      return errorResponse(`Handle "$${name}" not found`, 404, origin);
    }

    let addrData: Array<{ stake_address: string | null }>;
    try {
      addrData = await koios.post('address_info', { _addresses: [paymentAddress] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Address lookup failed';
      return errorResponse(message, 502, origin);
    }
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
