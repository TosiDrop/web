import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  networkUnavailableResponse,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

interface CustomRewardsInput {
  staking_address: string | null;
  session_id: string | null;
  selected: string | null;
  overhead_fee: number | null;
}

async function handleRequest(
  { request, env }: { request: Request; env: Env },
  { staking_address, session_id, selected, overhead_fee }: CustomRewardsInput,
) {
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);

  if (!staking_address || !session_id || !selected) {
    return errorResponse('staking_address, session_id, and selected are required', 400, origin);
  }

  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    const result = (await vmFetch(env, network, 'custom_request', {
      staking_address,
      session_id,
      selected,
      ...(overhead_fee != null ? { overhead_fee } : {}),
    })) as { request_id: unknown; deposit: unknown; withdrawal_address: unknown };

    return jsonResponse(
      {
        request_id: result.request_id,
        deposit: result.deposit,
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
    { request, env },
    {
      staking_address: typeof body?.staking_address === 'string' ? body.staking_address : null,
      session_id: typeof body?.session_id === 'string' ? body.session_id : null,
      selected: typeof body?.selected === 'string' ? body.selected : null,
      overhead_fee: typeof body?.overhead_fee === 'number' ? body.overhead_fee : null,
    },
  );
};
