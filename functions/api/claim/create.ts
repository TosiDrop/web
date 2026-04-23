import type { Env } from '../../types/env';
import {
  initVmSdk,
  requireApiKey,
  jsonResponse,
  errorResponse,
  optionsResponse,
  sessionIdFor,
} from '../../services/vmClient';

interface CreateRequestBody {
  stakeAddress?: string;
  assetIds?: string[];
  overheadFee?: number;
  unlocksSpecial?: boolean;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  let body: CreateRequestBody;
  try {
    body = await request.json<CreateRequestBody>();
  } catch {
    return errorResponse('Invalid JSON body', 400, origin);
  }

  const stakeAddress = body.stakeAddress?.trim();
  if (!stakeAddress || !stakeAddress.startsWith('stake')) {
    return errorResponse('stakeAddress must be a bech32 stake address', 400, origin);
  }
  if (!Array.isArray(body.assetIds) || body.assetIds.length === 0) {
    return errorResponse('assetIds must be a non-empty array', 400, origin);
  }
  if (body.assetIds.some((id) => typeof id !== 'string' || id.length === 0)) {
    return errorResponse('assetIds must contain non-empty strings', 400, origin);
  }
  if (
    body.overheadFee !== undefined &&
    (typeof body.overheadFee !== 'number' || !Number.isFinite(body.overheadFee))
  ) {
    return errorResponse('overheadFee must be a number', 400, origin);
  }
  if (body.unlocksSpecial !== undefined && typeof body.unlocksSpecial !== 'boolean') {
    return errorResponse('unlocksSpecial must be a boolean', 400, origin);
  }

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    const sdk = await initVmSdk(env);
    const response = await sdk.getCustomRequest({
      staking_address: stakeAddress,
      session_id: sessionIdFor(stakeAddress),
      selected: body.assetIds.join(','),
      overhead_fee: body.overheadFee,
      unlocks_special: body.unlocksSpecial,
    });

    return jsonResponse(
      {
        requestId: String(response.request_id),
        deposit: response.deposit,
        overheadFee: response.overhead_fee,
        withdrawalAddress: response.withdrawal_address,
        isWhitelisted: response.is_whitelisted,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error('claim/create error:', error);
    return errorResponse('Failed to create claim request', 502, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
