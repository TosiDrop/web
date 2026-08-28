import { useState } from 'react';
import { useWalletStore } from '@/store/wallet-state';
import { apiClient } from '@/api/client';
import { GradientButton } from '@/components/common/GradientButton';

interface ApiResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: unknown;
  error?: string;
}

const initialResult: ApiResult = { status: 'idle' };

export default function ApiTesterPage() {
  const { stakeAddress, connected } = useWalletStore();

  const [rewards, setRewards] = useState<ApiResult>(initialResult);
  const [profile, setProfile] = useState<ApiResult>(initialResult);
  const [claimValidate, setClaimValidate] = useState<ApiResult>(initialResult);
  const [settings, setSettings] = useState<ApiResult>(initialResult);
  const [tokens, setTokens] = useState<ApiResult>(initialResult);
  const [pools, setPools] = useState<ApiResult>(initialResult);
  const [distributions, setDistributions] = useState<ApiResult>(initialResult);
  const [resolveHandle, setResolveHandle] = useState<ApiResult>(initialResult);
  const [statistics, setStatistics] = useState<ApiResult>(initialResult);
  const [systemInfo, setSystemInfo] = useState<ApiResult>(initialResult);
  const [handleInput, setHandleInput] = useState('');

  const fetchApi = async (
    setter: (r: ApiResult) => void,
    fn: () => Promise<unknown>,
  ) => {
    setter({ status: 'loading' });
    try {
      const data = await fn();
      setter({ status: 'success', data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setter({ status: 'error', error: msg });
    }
  };

  const apis = [
    {
      name: 'Get Rewards',
      endpoint: `/api/getRewards?walletId=${stakeAddress ?? ''}`,
      requiresWallet: true,
      result: rewards,
      action: () =>
        fetchApi(setRewards, () =>
          apiClient.get(`/api/getRewards?walletId=${encodeURIComponent(stakeAddress!)}`)
        ),
    },
    {
      name: 'Get Profile',
      endpoint: `/api/profileData?walletId=${stakeAddress ?? ''}`,
      requiresWallet: true,
      result: profile,
      action: () =>
        fetchApi(setProfile, () =>
          apiClient.get(`/api/profileData?walletId=${encodeURIComponent(stakeAddress!)}`)
        ),
    },
    {
      name: 'Claim Validate',
      endpoint: '/api/claim/validate',
      requiresWallet: true,
      result: claimValidate,
      action: () =>
        fetchApi(setClaimValidate, () =>
          apiClient.post('/api/claim/validate', {
            stakeAddress,
            assets: ['lovelace'],
          })
        ),
    },
    {
      name: 'Get Settings',
      endpoint: '/api/getSettings',
      requiresWallet: false,
      result: settings,
      action: () =>
        fetchApi(setSettings, () => apiClient.get('/api/getSettings')),
    },
    {
      name: 'Get Tokens',
      endpoint: '/api/getTokens',
      requiresWallet: false,
      result: tokens,
      action: () =>
        fetchApi(setTokens, () => apiClient.get('/api/getTokens')),
    },
    {
      name: 'Get Pools',
      endpoint: '/api/getPools',
      requiresWallet: false,
      result: pools,
      action: () =>
        fetchApi(setPools, () => apiClient.get('/api/getPools')),
    },
    {
      name: 'Get Distributions',
      endpoint: '/api/getDistributions',
      requiresWallet: false,
      result: distributions,
      action: () =>
        fetchApi(setDistributions, () => apiClient.get('/api/getDistributions')),
    },
    {
      name: 'Resolve Handle',
      endpoint: `/api/resolveHandle?handle=${handleInput || '$handle'}`,
      requiresWallet: false,
      result: resolveHandle,
      action: () =>
        fetchApi(setResolveHandle, () =>
          apiClient.get(`/api/resolveHandle?handle=${encodeURIComponent(handleInput || '$handle')}`)
        ),
    },
    {
      name: 'Get Statistics',
      endpoint: '/api/getStatistics',
      requiresWallet: false,
      result: statistics,
      action: () =>
        fetchApi(setStatistics, () => apiClient.get('/api/getStatistics')),
    },
    {
      name: 'Get System Info',
      endpoint: '/api/getSystemInfo',
      requiresWallet: false,
      result: systemInfo,
      action: () =>
        fetchApi(setSystemInfo, () => apiClient.get('/api/getSystemInfo')),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">API Tester</h1>
        <p className="text-sm text-text-muted">
          Wallet: {connected ? stakeAddress : 'Not connected'}
        </p>
      </header>

      <div className="grid gap-4">
        {apis.map((api) => {
          const disabled = api.requiresWallet && (!connected || !stakeAddress);
          return (
            <div
              key={api.name}
              className="card-premium p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{api.name}</p>
                  <p className="truncate text-xs text-text-muted">{api.endpoint}</p>
                  {api.name === 'Resolve Handle' && (
                    <input
                      type="text"
                      aria-label="ADA handle"
                      placeholder="$handle (e.g. $adahandle)"
                      value={handleInput}
                      onChange={(e) => setHandleInput(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-border-default bg-surface-inset px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent"
                    />
                  )}
                </div>
                <GradientButton
                  size="sm"
                  onClick={api.action}
                  disabled={disabled || api.result.status === 'loading'}
                >
                  {api.result.status === 'loading' ? 'Fetching...' : 'Fetch'}
                </GradientButton>
              </div>

              {api.result.status !== 'idle' && (
                <div className="mt-3">
                  {api.result.status === 'loading' && (
                    <p className="animate-pulse text-sm text-text-muted">Loading...</p>
                  )}
                  {api.result.status === 'error' && (
                    <pre className="overflow-auto rounded-lg bg-status-error/10 p-3 text-xs text-status-error-light">
                      {api.result.error}
                    </pre>
                  )}
                  {api.result.status === 'success' && (
                    <pre className="max-h-64 overflow-auto rounded-lg bg-surface-inset p-3 text-xs text-status-success-light">
                      {JSON.stringify(api.result.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
