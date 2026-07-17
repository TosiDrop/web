import {
  isNativeToken,
  type ClaimableToken,
  type GetRewardsDto,
  type TokenInfo,
} from '../../src/shared/rewards';
import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  networkUnavailableResponse,
  type VmNetwork,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

function mergeAmounts(...sources: (Record<string, number> | undefined)[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [id, amount] of Object.entries(source)) {
      merged[id] = (merged[id] ?? 0) + amount;
    }
  }
  return merged;
}

function toClaimableTokens(
  amounts: Record<string, number>,
  tokens: Record<string, TokenInfo>,
  premium: boolean,
): ClaimableToken[] {
  return Object.entries(amounts)
    .filter(([assetId]) => tokens[assetId])
    .map(([assetId, rawAmount]) => {
      const { decimals: tokenDecimals = 0, logo = '', ticker = '' } = tokens[assetId];
      const decimals = Number(tokenDecimals);
      return {
        assetId,
        ticker,
        logo,
        decimals,
        amount: rawAmount / Math.pow(10, decimals),
        premium,
        native: premium ? isNativeToken(assetId) : false,
      };
    });
}

async function getRewards(stakeAddress: string, env: Env, network: VmNetwork): Promise<ClaimableToken[]> {
  const [rewardsResponse, tokensRaw] = await Promise.all([
    vmFetch(env, network, 'get_rewards', { staking_address: stakeAddress }) as Promise<GetRewardsDto | null>,
    vmFetch(env, network, 'get_tokens'),
  ]);

  let tokens = tokensRaw as unknown as Record<string, TokenInfo> | null;
  if (!rewardsResponse || !tokens) {
    console.warn('getRewards: SDK returned null for', !rewardsResponse ? 'rewards' : 'tokens', { stakeAddress });
    return [];
  }

  const regular = mergeAmounts(rewardsResponse.consolidated_promises, rewardsResponse.consolidated_rewards);
  const premium = mergeAmounts(
    rewardsResponse.project_locked_rewards?.consolidated_promises,
    rewardsResponse.project_locked_rewards?.consolidated_rewards,
  );

  const allAssetIds = [...Object.keys(regular), ...Object.keys(premium)];
  for (const assetId of allAssetIds) {
    if (!tokens[assetId]) {
      tokens = (await vmFetch(env, network, 'get_tokens')) as unknown as Record<string, TokenInfo> | null;
      if (!tokens) {
        console.warn('getRewards: token re-fetch returned null', { stakeAddress });
        return [];
      }
      break;
    }
  }

  return [
    ...toClaimableTokens(regular, tokens, false),
    ...toClaimableTokens(premium, tokens, true),
  ];
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);
  const stakeAddress = new URL(request.url).searchParams.get('walletId');

  if (!stakeAddress) {
    return errorResponse('walletId is required', 400, origin);
  }

  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    const claimableTokens = await getRewards(stakeAddress, env, network);
    return jsonResponse({ rewards: claimableTokens }, 200, origin);
  } catch (error) {
    console.error('getRewards error:', error);
    return errorResponse('Failed to process request', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
