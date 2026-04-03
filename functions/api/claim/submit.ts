import type { Env } from '../../types/env';
import { errorResponse, optionsResponse } from '../../services/vmClient';

// TODO: Integrate with VM backend for claim submission
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { stakeAddress: string; assets: string[]; airdropHash: string };

    if (!body.stakeAddress || !body.assets?.length || !body.airdropHash) {
      return errorResponse('stakeAddress, assets, and airdropHash are required', 400);
    }

    return errorResponse('Claim submission not yet integrated with VM backend', 501);
  } catch (error) {
    console.error('Claim submit error:', error);
    return errorResponse('Submit failed');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
