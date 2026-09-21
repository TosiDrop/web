import type { Env } from '../types/env';
import { deploymentNetwork } from './vmClient';

export interface KoiosAccountInfo {
  stake_address?: string;
  status?: string;
  total_balance?: string;
  rewards_available?: string;
  delegated_pool?: string | null;
}

export interface KoiosAccountAsset {
  asset_policy?: string;
  asset_name?: string;
  quantity?: string;
}

export interface KoiosAssetInfo {
  asset_policy?: string;
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
  amount?: string;
  pool_id?: string | null;
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

export function koiosConfig(env: Pick<Env, 'VITE_NETWORK' | 'KOIOS_BASE_URL_MAINNET' | 'KOIOS_BASE_URL_PREVIEW' | 'KOIOS_API_KEY_MAINNET' | 'KOIOS_API_KEY_PREVIEW'>): KoiosConfig {
  const network = deploymentNetwork(env);
  const configured = network === 'mainnet' ? env.KOIOS_BASE_URL_MAINNET : env.KOIOS_BASE_URL_PREVIEW;
  const key = network === 'mainnet' ? env.KOIOS_API_KEY_MAINNET : env.KOIOS_API_KEY_PREVIEW;
  return {
    network,
    baseUrl: `${normalizeBaseUrl(configured || DEFAULT_BASES[network])}/api/v1`,
    apiKey: key?.trim() || undefined,
  };
}

export class KoiosClient {
  readonly config: KoiosConfig;

  constructor(env: Pick<Env, 'VITE_NETWORK' | 'KOIOS_BASE_URL_MAINNET' | 'KOIOS_BASE_URL_PREVIEW' | 'KOIOS_API_KEY_MAINNET' | 'KOIOS_API_KEY_PREVIEW'>) {
    this.config = koiosConfig(env);
  }

  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}/${endpoint.replace(/^\/+/, '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Koios ${endpoint} failed (${response.status})`);
    return (await response.json()) as T;
  }

  accountInfo(stakeAddress: string) {
    return this.post<KoiosAccountInfo[]>('account_info', { _stake_addresses: [stakeAddress] });
  }

  accountAssets(stakeAddress: string) {
    return this.post<KoiosAccountAsset[]>('account_assets', { _stake_addresses: [stakeAddress] });
  }

  accountRewards(stakeAddress: string) {
    return this.post<KoiosReward[]>('account_rewards', { _stake_addresses: [stakeAddress] });
  }

  assetInfo(units: string[]) {
    return this.post<KoiosAssetInfo[]>('asset_info', { _asset_list: units });
  }
}
