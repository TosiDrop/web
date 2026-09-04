import type { Env } from '../types/env';
import {
  vmConfig,
  vmGet,
  vmConfigurationErrorResponse,
  deploymentNetwork,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';
import { recordClaimQuote } from '../services/claimAnalytics';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

interface CustomRewardsInput {
  staking_address: string | null;
  session_id: string | null;
  selected: string | null;
  overhead_fee: number | null;
}

async function handleRequest(
  { request, env, waitUntil }: { request: Request; env: Env; waitUntil: (p: Promise<unknown>) => void },
  { staking_address, session_id, selected, overhead_fee }: CustomRewardsInput,
) {
  const origin = request.headers.get('Origin');

  if (!staking_address || !session_id || !selected) {
    return errorResponse('staking_address, session_id, and selected are required', 400, origin);
  }

  if (!vmConfig(env)) return vmConfigurationErrorResponse(origin);

  try {
    const result = (await vmGet(env, 'custom_request', {
      staking_address,
      session_id,
      selected,
      ...(overhead_fee != null ? { overhead_fee } : {}),
    })) as {
      request_id: unknown;
      deposit: unknown;
      overhead_fee?: unknown;
      withdrawal_address: unknown;
    };

    // This is the claim path ClaimPage actually uses; fee analytics must
    // hang off it, not only off /api/claim/create.
    recordClaimQuote(env, waitUntil, {
      requestId: String(result.request_id),
      stakeAddress: staking_address,
      network: deploymentNetwork(env),
      tokenCount: selected.split(',').filter(Boolean).length,
      deposit: String(result.deposit),
      overheadFee: (result.overhead_fee ?? overhead_fee) as string | number | null | undefined,
    });

    return jsonResponse(
      {
        request_id: result.request_id,
        deposit: result.deposit,
        overhead_fee: Number(result.overhead_fee ?? overhead_fee ?? 0),
        withdrawal_address: result.withdrawal_address,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error('getCustomRewards error:', error);
    return errorResponse('Failed to process request', 500, origin);
  }
}

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const body = (await request.json().catch(() => null)) as
    | { staking_address?: unknown; session_id?: unknown; selected?: unknown; overhead_fee?: unknown }
    | null;
  if (body?.overhead_fee !== undefined && body?.overhead_fee !== null && typeof body.overhead_fee !== 'number') {
    return errorResponse('overhead_fee must be a number', 400, origin);
  }

  return handleRequest(
    { request, env, waitUntil: context.waitUntil.bind(context) },
    {
      staking_address: typeof body?.staking_address === 'string' ? body.staking_address : null,
      session_id: typeof body?.session_id === 'string' ? body.session_id : null,
      selected: typeof body?.selected === 'string' ? body.selected : null,
      overhead_fee: typeof body?.overhead_fee === 'number' ? body.overhead_fee : null,
    },
  );
};
