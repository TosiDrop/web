import type { Env } from '../../types/env';
import {
  deploymentNetwork,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../../services/vmClient';
import {
  KoiosClient,
  type KoiosAccountAsset,
  type KoiosAssetInfo,
  type KoiosReward,
} from '../../services/koiosClient';
import { persistWalletSnapshot } from '../../services/walletSnapshots';
import { readMarketPrices, readValueHistory } from '../../services/marketPrices';
import { stakeAddressError } from '../../../src/shared/stakeAddress';

const MAX_METADATA_ASSETS = 100;
const MAX_PRICED_ASSETS = 25;

function unitFor(asset: KoiosAccountAsset): string | null {
  const policy = asset.asset_policy?.trim();
  const name = asset.asset_name?.trim();
  return policy && name ? `${policy}${name}` : null;
}

function metadataByUnit(rows: KoiosAssetInfo[]): Map<string, KoiosAssetInfo> {
  return new Map(
    rows
      .map((row) => {
        const unit = row.asset_policy && row.asset_name ? `${row.asset_policy}${row.asset_name}` : null;
        return unit ? [unit, row] as const : null;
      })
      .filter((entry): entry is readonly [string, KoiosAssetInfo] => entry !== null),
  );
}

function rewardTotal(rewards: KoiosReward[]): string {
  return rewards.reduce((total, reward) => {
    const amount = reward.amount ?? '0';
    return /^\d+$/.test(amount) ? (BigInt(total) + BigInt(amount)).toString() : total;
  }, '0');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakeAddress = new URL(request.url).searchParams.get('staking_address')?.trim() ?? '';
  const network = deploymentNetwork(env);

  const problem = stakeAddressError(stakeAddress, network);
  if (problem) return errorResponse(problem, 400, origin);

  try {
    const koios = new KoiosClient(env);
    const [accountResult, assetsResult, rewardsResult] = await Promise.allSettled([
      koios.accountInfo(stakeAddress),
      koios.accountAssets(stakeAddress),
      koios.accountRewards(stakeAddress),
    ]);
    const accounts = accountResult.status === 'fulfilled' ? accountResult.value : [];
    const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];
    const rewards = rewardsResult.status === 'fulfilled' ? rewardsResult.value : [];
    const degraded = accountResult.status === 'rejected' ||
      assetsResult.status === 'rejected' ||
      rewardsResult.status === 'rejected';
    const account = accounts[0] ?? {};
    const usableAssets = assets.filter((asset) => unitFor(asset));
    const units = usableAssets.map((asset) => unitFor(asset)!);
    let metadata: KoiosAssetInfo[] = [];
    if (units.length) {
      try {
        metadata = await koios.assetInfo(units.slice(0, MAX_METADATA_ASSETS));
      } catch (error) {
        console.error('wallet metadata error:', error);
      }
    }
    const metadataMap = metadataByUnit(metadata);
    const pricedAssets = usableAssets.slice(0, MAX_PRICED_ASSETS);
    const marketByUnit = await readMarketPrices(
      env,
      network,
      ['lovelace', ...pricedAssets.map((asset) => unitFor(asset)!)],
    );
    const adaMarket = marketByUnit.get('lovelace');
    const adaPriceUsd = adaMarket?.priceUsd ?? null;
    const adaPriceChange24h = adaMarket?.priceChange24h ?? null;
    const holdings = usableAssets.map((asset) => {
      const unit = unitFor(asset)!;
      const info = metadataMap.get(unit);
      const registry = info?.token_registry_metadata;
      const decimals = registry?.decimals ?? info?.decimals ?? null;
      const price = marketByUnit.get(unit)?.priceUsd ?? null;
      return {
        unit,
        policyId: asset.asset_policy,
        assetNameHex: asset.asset_name,
        quantity: asset.quantity ?? '0',
        name: registry?.name ?? info?.asset_name_ascii ?? null,
        ticker: registry?.ticker ?? null,
        decimals,
        logo: registry?.logo ?? null,
        metadataPending: !info,
        priceUsd: price,
        priceChange24h: marketByUnit.get(unit)?.priceChange24h ?? null,
        valueUsd: price === null || decimals === null
          ? null
          : Number(asset.quantity ?? 0) / 10 ** decimals * price,
        pricePending: price === null,
      };
    });
    const history = await readValueHistory(
      env,
      network,
      holdings.flatMap((holding) => {
        const decimals = holding.decimals;
        if (decimals === null) return [];
        const amount = Number(holding.quantity) / 10 ** decimals;
        return Number.isFinite(amount) ? [{ unit: holding.unit, amount }] : [];
      }),
      Number(account.utxo ?? account.total_balance ?? 0) / 1_000_000,
    );
    const observedAt = Math.floor(Date.now() / 1000);
    const payload = {
      network,
      stakeAddress,
      observedAt,
      degraded,
      balance: {
        accountLovelace: account.total_balance ?? '0',
        utxoLovelace: account.utxo ?? '0',
        rewardsAvailableLovelace: account.rewards_available ?? '0',
        adaPriceUsd,
        adaPriceChange24h,
        accountValueUsd: adaPriceUsd === null
          ? null
          : Number(account.total_balance ?? 0) / 1_000_000 * adaPriceUsd,
      },
      delegation: {
        poolId: account.delegated_pool ?? null,
        registered: account.status === 'registered',
      },
      rewards: {
        totalLovelace: rewardTotal(rewards),
        epochs: rewards.map((reward) => ({
          epoch: reward.earned_epoch ?? null,
          amountLovelace: reward.amount ?? '0',
          poolId: reward.pool_id ?? null,
          type: reward.type ?? null,
        })),
      },
      holdings,
      metadata: {
        returned: metadata.length,
        total: units.length,
        complete: metadata.length >= units.length,
      },
      market: {
        configured: env.DB !== undefined,
        priced: Math.max(0, marketByUnit.size - (marketByUnit.has('lovelace') ? 1 : 0)),
        requested: pricedAssets.length,
      },
      valueHistory: {
        points: history,
        basis: 'current-holdings',
        rangeDays: 30,
      },
    };

    const persist = persistWalletSnapshot(env, network, stakeAddress, observedAt, payload);
    if (persist) context.waitUntil(persist.then(() => undefined, (error) => console.error('wallet snapshot error:', error)));
    return jsonResponse(payload, 200, origin);
  } catch (error) {
    console.error('wallet summary error:', error);
    return errorResponse('Failed to fetch wallet summary', 502, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
