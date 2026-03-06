import {
  isNativeToken,
  type ClaimableToken,
  type GetRewardsDto,
  type TokenInfo,
} from '../../src/shared/rewards';
import { jsonResponse, errorResponse } from '../services/vmClient';

interface Env {
  VITE_VM_API_KEY: string;
}

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
        ticker: ticker as string,
        logo: logo as string,
        decimals,
        amount: rawAmount / Math.pow(10, decimals),
        premium,
        native: premium ? isNativeToken(assetId) : false,
      };
    });
}

async function getRewards(stakeAddress: string, env: Env): Promise<ClaimableToken[]> {
  const { getRewards: getRewardsFromVM, getTokens: getTokensFromVM, setApiToken } = await import('vm-sdk');
  setApiToken(env.VITE_VM_API_KEY);

  const [rewardsResponse, tokensRaw] = await Promise.all([
    getRewardsFromVM(stakeAddress) as Promise<GetRewardsDto | null>,
    getTokensFromVM(),
  ]);

  let tokens = tokensRaw as unknown as Record<string, TokenInfo> | null;
  if (!rewardsResponse || !tokens) return [];

  const regular = mergeAmounts(rewardsResponse.consolidated_promises, rewardsResponse.consolidated_rewards);
  const premium = mergeAmounts(
    rewardsResponse.project_locked_rewards?.consolidated_promises,
    rewardsResponse.project_locked_rewards?.consolidated_rewards,
  );

  const allAssetIds = [...Object.keys(regular), ...Object.keys(premium)];
  for (const assetId of allAssetIds) {
    if (!tokens[assetId]) {
      tokens = (await getTokensFromVM()) as unknown as Record<string, TokenInfo> | null;
      if (!tokens) return [];
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
  const stakeAddress = new URL(request.url).searchParams.get('walletId');

  if (!stakeAddress) {
    return errorResponse('stakeAddress is required', 400);
  }

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('VITE_VM_API_KEY is not configured', 500);
  }

  try {
    const claimableTokens = await getRewards(stakeAddress, env);
    return jsonResponse({ rewards: claimableTokens });
  } catch (error) {
    console.error('getRewards error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`Failed to process request: ${message}`);
  }
};
