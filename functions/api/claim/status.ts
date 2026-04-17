import type { Env } from '../../types/env';
import { errorResponse, optionsResponse } from '../../services/vmClient';

// TODO: Integrate with VM backend for claim status polling
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const hash = new URL(context.request.url).searchParams.get('hash');

  if (!hash) {
    return errorResponse('hash query parameter is required', 400);
  }

  return errorResponse('Claim status not yet integrated with VM backend', 501);
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
