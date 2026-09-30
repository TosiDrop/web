import type { Env } from '../types/env';
import { deploymentNetwork } from './vmClient';

export interface KoiosAccountInfo {
  stake_address?: string;
  status?: string;
  total_balance?: string;
  utxo?: string;
  rewards?: string;
  withdrawals?: string;
  deposit?: string;
  rewards_available?: string;
  delegated_pool?: string | null;
  delegated_drep?: string | null;
}

export interface KoiosAccountAsset {
  decimals?: number | null;
  policy_id?: string;
  asset_name?: string;
  quantity?: string;
}

export interface KoiosAssetInfo {
  policy_id?: string;
  asset_name?: string;
  decimals?: number | null;
  asset_name_ascii?: string | null;
  token_registry_metadata?: {
    name?: string;
    ticker?: string;
    decimals?: number;
    logo?: string;
  } | null;
}

export interface KoiosReward {
  earned_epoch?: number;
  spendable_epoch?: number;
  amount?: string;
  pool_id_bech32?: string | null;
  type?: string | null;
}

const DEFAULT_BASES = {
  mainnet: 'https://api.koios.rest/api/v1',
  preview: 'https://preview.koios.rest/api/v1',
} as const;

export interface KoiosConfig {
  baseUrl: string;
  apiKey?: string;
  network: 'mainnet' | 'preview';
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/(?:api\/v1|api)$/i, '');
}

function validateAuthenticatedBaseUrl(baseUrl: string, apiKey?: string): void {
  if (!apiKey) return;
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('KOIOS_BASE_URL must be a valid URL when an API key is configured');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('KOIOS_BASE_URL must use HTTPS when an API key is configured');
  }
}

export function koiosConfig(env: Pick<Env, 'VITE_NETWORK' | 'KOIOS_BASE_URL_MAINNET' | 'KOIOS_BASE_URL_PREVIEW' | 'KOIOS_API_KEY_MAINNET' | 'KOIOS_API_KEY_PREVIEW'>): KoiosConfig {
  const network = deploymentNetwork(env);
  const configured = network === 'mainnet' ? env.KOIOS_BASE_URL_MAINNET : env.KOIOS_BASE_URL_PREVIEW;
  const key = network === 'mainnet' ? env.KOIOS_API_KEY_MAINNET : env.KOIOS_API_KEY_PREVIEW;
  const baseUrl = `${normalizeBaseUrl(configured || DEFAULT_BASES[network])}/api/v1`;
  const apiKey = key?.trim() || undefined;
  validateAuthenticatedBaseUrl(baseUrl, apiKey);
  return {
    network,
    baseUrl,
    apiKey,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validatePayload(endpoint: string, payload: unknown): unknown {
  if (!Array.isArray(payload)) throw new Error(`Koios ${endpoint} returned an invalid response`);
  for (const row of payload) {
    if (!isRecord(row)) throw new Error(`Koios ${endpoint} returned an invalid row`);
  }
  if (endpoint === 'account_assets') {
    for (const row of payload) {
      if (typeof row.policy_id !== 'string' || typeof row.asset_name !== 'string' || typeof row.quantity !== 'string') {
        throw new Error('Koios account_assets returned an incomplete asset row');
      }
      if (!/^\d+$/.test(row.quantity)) throw new Error('Koios account_assets returned an invalid quantity');
    }
  }
  if (endpoint === 'asset_info') {
    for (const row of payload) {
      if (typeof row.policy_id !== 'string' || typeof row.asset_name !== 'string') {
        throw new Error('Koios asset_info returned an incomplete asset row');
      }
      if ('decimals' in row && row.decimals !== null && typeof row.decimals !== 'number') {
        throw new Error('Koios asset_info returned an invalid decimals field');
      }
    }
  }
  if (endpoint === 'asset_nft_address') {
    for (const row of payload) {
      if (typeof row.payment_address !== 'string') {
        throw new Error('Koios asset_nft_address returned an incomplete address row');
      }
    }
  }
  if (endpoint === 'address_info') {
    for (const row of payload) {
      if (!('stake_address' in row) || (row.stake_address !== null && typeof row.stake_address !== 'string')) {
        throw new Error('Koios address_info returned an incomplete address row');
      }
    }
  }
  if (endpoint === 'account_info') {
    for (const row of payload) {
      for (const field of ['total_balance', 'utxo', 'rewards_available']) {
        if (field in row && typeof row[field] !== 'string') throw new Error(`Koios account_info returned an invalid ${field}`);
      }
    }
  }
  if (endpoint === 'account_reward_history') {
    for (const row of payload) {
      if (typeof row.amount !== 'string' || !/^\d+$/.test(row.amount)) throw new Error('Koios account_reward_history returned an invalid amount');
      if (!Number.isSafeInteger(row.earned_epoch) || Number(row.earned_epoch) < 0) throw new Error('Koios account_reward_history returned an invalid epoch');
    }
  }
  return payload;
}

export class KoiosClient {
  readonly config: KoiosConfig;

  constructor(env: Pick<Env, 'VITE_NETWORK' | 'KOIOS_BASE_URL_MAINNET' | 'KOIOS_BASE_URL_PREVIEW' | 'KOIOS_API_KEY_MAINNET' | 'KOIOS_API_KEY_PREVIEW'>) {
    this.config = koiosConfig(env);
  }

  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(`${this.config.baseUrl}/${endpoint.replace(/^\/+/, '')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
        continue;
      }
      if (response.ok) return validatePayload(endpoint, await response.json()) as T;
      const error = new Error(`Koios ${endpoint} failed (${response.status})`);
      if (response.status < 500 && response.status !== 408 && response.status !== 429) throw error;
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
    throw lastError instanceof Error ? lastError : new Error(`Koios ${endpoint} failed`);
  }

  accountInfo(stakeAddress: string) {
    return this.post<KoiosAccountInfo[]>('account_info', { _stake_addresses: [stakeAddress] });
  }

  accountAssets(stakeAddress: string) {
    return this.post<KoiosAccountAsset[]>('account_assets', { _stake_addresses: [stakeAddress] });
  }

  accountRewards(stakeAddress: string) {
    return this.post<KoiosReward[]>('account_reward_history', { _stake_addresses: [stakeAddress] });
  }

  assetInfo(units: string[]) {
    return this.post<KoiosAssetInfo[]>('asset_info', { _asset_list: units.map((unit) => [unit.slice(0, 56), unit.slice(56)]) });
  }
}
