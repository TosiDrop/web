import type { GetRewardsDto, ClaimableToken, TokenInfo } from '../utils/rewards-helpers';
import { isNativeToken, getTokenValue } from '../utils/rewards-helpers';
import { getPrices, convertToSimplePrices } from '../services/MinswapService';

interface Env {
  VITE_VM_API_KEY: string;
}

/**
 * Enhanced getRewards function that processes rewards data
 * Similar to the reference implementation from another repo
 */
async function getRewards(stakeAddress: string, env: Env): Promise<ClaimableToken[]> {
  // Import vm-sdk functions
  const { getRewards: getRewardsFromVM, getTokens: getTokensFromVM, setApiToken } = await import('vm-sdk');
  setApiToken(env.VITE_VM_API_KEY);

  // Fetch all data in parallel
  const [getRewardsResponse, tokensRaw, priceInfoMap] = await Promise.all([
    getRewardsFromVM(stakeAddress) as Promise<GetRewardsDto | null>,
    getTokensFromVM(),
    getPrices(),
  ]);

  // Convert tokens to the expected format (handle type conversion)
  let tokens = tokensRaw as unknown as Record<string, TokenInfo> | null;

  // Convert PriceInfoMap to simple prices format for getTokenValue
  const prices = convertToSimplePrices(priceInfoMap);

  const claimableTokens: ClaimableToken[] = [];

  if (getRewardsResponse == null) return claimableTokens;
  if (tokens == null) return claimableTokens;

  const consolidatedAvailableReward: { [key: string]: number } = {};
  const consolidatedAvailableRewardPremium: { [key: string]: number } = {};

  /** handle regular tokens */
  const regularRewards: Record<string, number> = {
    ...getRewardsResponse.consolidated_promises,
    ...getRewardsResponse.consolidated_rewards,
  };

  Object.entries(regularRewards).forEach(([assetId, amount]) => {
    if (consolidatedAvailableReward[assetId]) {
      consolidatedAvailableReward[assetId] += amount;
    } else {
      consolidatedAvailableReward[assetId] = amount;
    }
  });

  /** handle premium tokens */
  const premiumRewards: Record<string, number> = {
    ...(getRewardsResponse.project_locked_rewards?.consolidated_promises ?? {}),
    ...(getRewardsResponse.project_locked_rewards?.consolidated_rewards ?? {}),
  };

  Object.entries(premiumRewards).forEach(([assetId, amount]) => {
    if (consolidatedAvailableRewardPremium[assetId]) {
      consolidatedAvailableRewardPremium[assetId] += amount;
    } else {
      consolidatedAvailableRewardPremium[assetId] = amount;
    }
  });

  /** if there is no token info in the map, flush the cache and re-fetch token info */
  for (const assetId of [
    ...Object.keys(consolidatedAvailableReward),
    ...Object.keys(consolidatedAvailableRewardPremium),
  ]) {
    const token = tokens[assetId];
    if (token == null) {
      const refreshedTokens = await getTokensFromVM();
      tokens = refreshedTokens as unknown as Record<string, TokenInfo> | null;
      if (tokens == null) break;
    }
  }

  if (tokens == null) return claimableTokens;

  Object.keys(consolidatedAvailableReward).forEach((assetId) => {
    const token = tokens[assetId];
    /** add default values just to be safe */
    const { decimals: tokenDecimals = 0, logo = "", ticker = "" } = token || {};
    const decimals = Number(tokenDecimals);
    const amount = consolidatedAvailableReward[assetId] / Math.pow(10, decimals);
    const { price, total } = getTokenValue(assetId, amount, prices);

    if (token) {
      claimableTokens.push({
        assetId,
        ticker: ticker as string,
        logo: logo as string,
        decimals,
        amount,
        premium: false,
        native: false,
        price,
        total,
      });
    }
  });

  Object.keys(consolidatedAvailableRewardPremium).forEach((assetId) => {
    const token = tokens[assetId];
    /** add default values just to be safe */
    const { decimals: tokenDecimals = 0, logo = "", ticker = "" } = token || {};
    const decimals = Number(tokenDecimals);
    const amount = consolidatedAvailableRewardPremium[assetId] / Math.pow(10, decimals);
    const { price, total } = getTokenValue(assetId, amount, prices);

    if (token) {
      claimableTokens.push({
        assetId,
        ticker: ticker as string,
        logo: logo as string,
        decimals,
        amount,
        premium: true,
        native: isNativeToken(assetId),
        price,
        total,
      });
    }
  });

  return claimableTokens;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const stakeAddress = url.searchParams.get("walletId");

  console.log("getRewards called with stakeAddress:", stakeAddress);
  console.log("API Key exists:", !!env.VITE_VM_API_KEY);
  console.log("API Key length:", env.VITE_VM_API_KEY?.length);

  if (!stakeAddress) {
    return new Response(
      JSON.stringify({ error: "stakeAddress is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY === 'your_api_key_here' || env.VITE_VM_API_KEY.trim() === '') {
    return new Response(
      JSON.stringify({ 
        error: "API key not available in environment. Please set VITE_VM_API_KEY in .dev.vars file",
        details: "The API key is missing or set to a placeholder value"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("About to call getRewards with stakeAddress:", stakeAddress);
    const claimableTokens = await getRewards(stakeAddress, env);
    console.log("getRewards completed successfully, found", claimableTokens.length, "tokens");

    return new Response(
      JSON.stringify({ rewards: claimableTokens }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  } catch (error) {
    console.error("Full error object:", error);
    console.error("Error message:", error instanceof Error ? error.message : 'Unknown error');
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: `Failed to process request: ${errorMessage}`,
        details: errorStack || 'No additional error details available',
        stakeAddress: stakeAddress
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
};