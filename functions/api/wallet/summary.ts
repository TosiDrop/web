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
import { stakeAddressError } from '../../../src/shared/stakeAddress';

const MAX_METADATA_ASSETS = 100;

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
    const [accounts, assets, rewards] = await Promise.all([
      koios.accountInfo(stakeAddress),
      koios.accountAssets(stakeAddress),
      koios.accountRewards(stakeAddress),
    ]);
    const account = accounts[0] ?? {};
    const usableAssets = assets.filter((asset) => unitFor(asset));
    const units = usableAssets.map((asset) => unitFor(asset)!);
    const metadata = units.length ? await koios.assetInfo(units.slice(0, MAX_METADATA_ASSETS)) : [];
    const metadataMap = metadataByUnit(metadata);
    const holdings = usableAssets.map((asset) => {
      const unit = unitFor(asset)!;
      const info = metadataMap.get(unit);
      const registry = info?.token_registry_metadata;
      return {
        unit,
        policyId: asset.asset_policy,
        assetNameHex: asset.asset_name,
        quantity: asset.quantity ?? '0',
        name: registry?.name ?? info?.asset_name_ascii ?? null,
        ticker: registry?.ticker ?? null,
        decimals: registry?.decimals ?? info?.decimals ?? null,
        logo: registry?.logo ?? null,
        metadataPending: !info,
      };
    });
    const observedAt = Math.floor(Date.now() / 1000);
    const payload = {
      network,
      stakeAddress,
      observedAt,
      balance: {
        lovelace: account.total_balance ?? '0',
        rewardsAvailableLovelace: account.rewards_available ?? '0',
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
