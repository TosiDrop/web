import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  networkUnavailableResponse,
  withCache,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';
import { hasDb } from '../services/d1';
import { buildWithdrawalUpserts } from '../services/withdrawalsSync';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);
  const url = new URL(request.url);
  const staking_address = url.searchParams.get('staking_address');
  const token_id = url.searchParams.get('token_id');

  if (!staking_address) {
    return errorResponse('staking_address is required', 400, origin);
  }

  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    return await withCache(request, CACHE_TTL, async () => {
      const data = await vmFetch(env, network, 'delivered_rewards', {
        staking_address,
        token_id: token_id || undefined,
      });

      // #181: accumulate history beyond the VM window. Append-only; a D1
      // hiccup must never break the read path.
      if (hasDb(env)) {
        const stmts = buildWithdrawalUpserts(env.DB, network, staking_address, data);
        if (stmts.length > 0) {
          context.waitUntil(
            env.DB.batch(stmts).then(
              () => undefined,
              (err) => console.error('withdrawals sync error:', err),
            ),
          );
        }
      }
      return data;
    }, context.waitUntil.bind(context));
  } catch (error) {
    console.error('getDeliveredRewards error:', error);
    return errorResponse('Failed to fetch delivered rewards', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
