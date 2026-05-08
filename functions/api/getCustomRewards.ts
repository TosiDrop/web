import type { Env } from '../types/env';
import {
  initVmSdk,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

export const onRequestOptions: PagesFunction<Env> = async () => {
  return optionsResponse();
};

interface CustomRewardsInput {
  staking_address: string | null;
  session_id: string | null;
  selected: string | null;
  overhead_fee: number | null;
}

async function handleRequest(
  { env }: { env: Env },
  { staking_address, session_id, selected, overhead_fee }: CustomRewardsInput,
) {
  if (!staking_address || !session_id || !selected) {
    return errorResponse('staking_address, session_id, and selected are required', 400);
  }

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500);
  }

  try {
    const { getCustomRequest } = await initVmSdk(env);

    const result = await getCustomRequest({
      staking_address,
      session_id,
      selected,
      ...(overhead_fee != null ? { overhead_fee } : {}),
    });

    return jsonResponse({
      request_id: result.request_id,
      deposit: result.deposit,
      withdrawal_address: result.withdrawal_address,
    });
  } catch (error) {
    console.error('getCustomRewards error:', error);
    return errorResponse('Failed to process request');
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  return handleRequest(
    { env },
    {
      staking_address: url.searchParams.get('staking_address'),
      session_id: url.searchParams.get('session_id'),
      selected: url.searchParams.get('selected'),
      overhead_fee: (() => {
        const raw = url.searchParams.get('overhead_fee');
        return raw != null && !isNaN(Number(raw)) ? Number(raw) : null;
      })(),
    },
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = (await request.json().catch(() => null)) as
    | { staking_address?: unknown; session_id?: unknown; selected?: unknown; overhead_fee?: unknown }
    | null;
  if (body?.overhead_fee !== undefined && typeof body.overhead_fee !== 'number') {
    return errorResponse('overhead_fee must be a number', 400);
  }

  return handleRequest(
    { env },
    {
      staking_address: typeof body?.staking_address === 'string' ? body.staking_address : null,
      session_id: typeof body?.session_id === 'string' ? body.session_id : null,
      selected: typeof body?.selected === 'string' ? body.selected : null,
      overhead_fee: typeof body?.overhead_fee === 'number' ? body.overhead_fee : null,
    },
  );
};
