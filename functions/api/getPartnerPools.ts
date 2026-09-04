import { bech32 } from 'bech32';
import type { Env } from '../types/env';
import { errorResponse, jsonResponse, optionsResponse } from '../services/vmClient';

const POOL_ID_BYTES = 28;

/** Parse our public partner-pool configuration without consulting the VM. */
export function parsePartnerPoolIds(value: string | undefined): string[] {
  const ids = (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  for (const id of ids) {
    try {
      const decoded = bech32.decode(id, 100);
      if (decoded.prefix !== 'pool' || bech32.fromWords(decoded.words).length !== POOL_ID_BYTES) {
        throw new Error('invalid pool id');
      }
    } catch {
      throw new Error('invalid_partner_pool_ids');
    }
  }

  return [...new Set(ids)];
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    return jsonResponse(parsePartnerPoolIds(env.PARTNER_POOL_IDS), 200, request.headers.get('Origin'));
  } catch (error) {
    console.error('getPartnerPools configuration error:', error);
    return errorResponse('Server configuration error', 500, request.headers.get('Origin'));
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
