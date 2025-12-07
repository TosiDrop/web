import {
  isNativeToken,
  getTokenValue,
  type ClaimableToken,
  type GetRewardsDto,
  type TokenInfo,
} from '../../src/shared/rewards';

interface Env {
  VITE_VM_API_KEY: string;
}

async function getRewards(stakeAddress: string, env: Env): Promise<ClaimableToken[]> {
  const { getRewards: getRewardsFromVM, getTokens: getTokensFromVM, setApiToken } = await import('vm-sdk');
  setApiToken(env.VITE_VM_API_KEY);

  const [getRewardsResponse, tokensRaw] = await Promise.all([
    getRewardsFromVM(stakeAddress) as Promise<GetRewardsDto | null>,
    getTokensFromVM(),
  ]);

  let tokens = tokensRaw as unknown as Record<string, TokenInfo> | null;

  const claimableTokens: ClaimableToken[] = [];

  if (getRewardsResponse == null) return claimableTokens;
  if (tokens == null) return claimableTokens;

  const consolidatedAvailableReward: { [key: string]: number } = {};
  const consolidatedAvailableRewardPremium: { [key: string]: number } = {};

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
    const { decimals: tokenDecimals = 0, logo = "", ticker = "" } = token || {};
    const decimals = Number(tokenDecimals);
    const amount = consolidatedAvailableReward[assetId] / Math.pow(10, decimals);
    const { price, total } = getTokenValue(assetId, amount, {});

    if (token) {
      claimableTokens.push({
        assetId,
        ticker: ticker as string,
        logo: logo as string,
        decimals,
        amount,
        premium: false,
        native: isNativeToken(assetId),
        price,
        total,
      });
    }
  });

  Object.keys(consolidatedAvailableRewardPremium).forEach((assetId) => {
    const token = tokens[assetId];
    const { decimals: tokenDecimals = 0, logo = "", ticker = "" } = token || {};
    const decimals = Number(tokenDecimals);
    const amount = consolidatedAvailableRewardPremium[assetId] / Math.pow(10, decimals);
    const { price, total } = getTokenValue(assetId, amount, {});

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
    
    return new Response(
      JSON.stringify({ 
        error: `Failed to process request: ${errorMessage}`,
        details: 'Internal server error',
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