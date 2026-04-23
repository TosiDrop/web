import type { Env } from '../../types/env';
import {
  vmApiGet,
  requireApiKey,
  jsonResponse,
  errorResponse,
  optionsResponse,
  sessionIdFor,
} from '../../services/vmClient';

// VM backend status codes: 0=waiting, 1=processing, 2=failure, 3=success.
function normalizeStatus(raw: unknown): {
  kind: 'waiting' | 'processing' | 'success' | 'failure';
  txHash?: string;
  reason?: string;
} {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return { kind: 'processing' };
  }

  const r = raw as Record<string, unknown>;
  const code = typeof r.status === 'number' ? r.status : typeof r.code === 'number' ? r.code : undefined;
  const txHash = typeof r.tx_hash === 'string' ? r.tx_hash : typeof r.txHash === 'string' ? r.txHash : undefined;
  const reason = typeof r.reason === 'string' ? r.reason : typeof r.error === 'string' ? r.error : undefined;

  switch (code) {
    case 0:
      return { kind: 'waiting' };
    case 1:
      return { kind: 'processing', txHash };
    case 2:
      return { kind: 'failure', reason: reason ?? 'Transaction failed' };
    case 3:
      return { kind: 'success', txHash: txHash ?? '' };
    default:
      return {
        kind: 'failure',
        reason: `Unknown status code: ${code ?? 'missing'}${txHash ? ` (tx: ${txHash})` : ''}`,
      };
  }
}

const INTEGER_RE = /^\d+$/;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const url = new URL(request.url);
  const requestIdParam = url.searchParams.get('requestId');
  const stakeAddress = url.searchParams.get('stakeAddress');

  if (!requestIdParam || !stakeAddress) {
    return errorResponse('requestId and stakeAddress are required', 400, origin);
  }
  if (!stakeAddress.startsWith('stake')) {
    return errorResponse('stakeAddress must be a bech32 stake address', 400, origin);
  }
  if (!INTEGER_RE.test(requestIdParam)) {
    return errorResponse('requestId must be a non-negative integer', 400, origin);
  }

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    const raw = await vmApiGet(env, 'check_status_custom_request', {
      staking_address: stakeAddress,
      request_id: Number(requestIdParam),
      session_id: sessionIdFor(stakeAddress),
    });
    return jsonResponse(normalizeStatus(raw), 200, origin);
  } catch (error) {
    console.error('claim/status error:', error);
    return errorResponse('Failed to fetch claim status', 502, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
