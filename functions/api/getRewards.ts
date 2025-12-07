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

  // Accumulate regular rewards from consolidated_promises and consolidated_rewards
  const addToConsolidated = (target: { [key: string]: number }, source: Record<string, number> | undefined) => {
    if (!source) return;
    Object.entries(source).forEach(([assetId, amount]) => {
      const numAmount = Number(amount);
      if (!isNaN(numAmount)) {
        target[assetId] = (target[assetId] || 0) + numAmount;
      }
    });
  };

  addToConsolidated(consolidatedAvailableReward, getRewardsResponse.consolidated_promises);
  addToConsolidated(consolidatedAvailableReward, getRewardsResponse.consolidated_rewards);

  // Accumulate premium rewards from project_locked counterparts
  if (getRewardsResponse.project_locked_rewards) {
    addToConsolidated(consolidatedAvailableRewardPremium, getRewardsResponse.project_locked_rewards.consolidated_promises);
    addToConsolidated(consolidatedAvailableRewardPremium, getRewardsResponse.project_locked_rewards.consolidated_rewards);
  }

  const allAssetIds = [
    ...Object.keys(consolidatedAvailableReward),
    ...Object.keys(consolidatedAvailableRewardPremium),
  ];

  let hasMissingToken = false;
  if (tokens) {
    hasMissingToken = allAssetIds.some((id) => !(tokens as Record<string, TokenInfo>)[id]);
  } else {
    hasMissingToken = true;
  }
  if (hasMissingToken) {
    const refreshedTokens = await getTokensFromVM();
    tokens = refreshedTokens as unknown as Record<string, TokenInfo> | null;
    if (tokens == null) return claimableTokens;
  }

  const addTokensToClaimable = (rewardsByAsset: Record<string, number>, premium: boolean) => {
    Object.keys(rewardsByAsset).forEach((assetId) => {
      const token = tokens[assetId];
      if (!token) {
        console.warn(`Token metadata missing for asset: ${assetId}`);
        return;
      }
      const { decimals: tokenDecimals = 0, logo = "", ticker = "" } = token || {};
      const decimals = Number(tokenDecimals);
      const amount = rewardsByAsset[assetId] / Math.pow(10, decimals);
      // TODO: Integrate real pricing when available - currently using empty prices map for minimal implementation
      const { price, total } = getTokenValue(assetId, amount, {});

      claimableTokens.push({
        assetId,
        ticker: ticker as string,
        logo: logo as string,
        decimals,
        amount,
        premium,
        native: isNativeToken(assetId),
        price,
        total,
      });
    });
  };

  addTokensToClaimable(consolidatedAvailableReward, false);
  addTokensToClaimable(consolidatedAvailableRewardPremium, true);

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
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        } 
      }
    );
  }

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY === 'your_api_key_here' || env.VITE_VM_API_KEY.trim() === '') {
    return new Response(
      JSON.stringify({ 
        error: "API key not available in environment. Please set VITE_VM_API_KEY in .dev.vars file",
        details: "The API key is missing or set to a placeholder value"
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        } 
      }
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
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: 'Internal server error',
        stakeAddress: stakeAddress
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        } 
      }
    );
  }
};