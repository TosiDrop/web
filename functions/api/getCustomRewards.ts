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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const staking_address = url.searchParams.get('staking_address');
  const session_id = url.searchParams.get('session_id');
  const selected = url.searchParams.get('selected');
  const overhead_fee_raw = url.searchParams.get('overhead_fee');

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
      ...(overhead_fee_raw != null && !isNaN(Number(overhead_fee_raw))
        ? { overhead_fee: Number(overhead_fee_raw) }
        : {}),
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
};
