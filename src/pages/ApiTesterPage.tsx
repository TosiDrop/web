import { useState } from 'react';
import { useWalletStore } from '@/store/wallet-state';
import { apiClient } from '@/api/client';

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
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">API Tester</h1>
        <p className="text-sm text-gray-400">
          Wallet: {connected ? stakeAddress : 'Not connected'}
        </p>
      </header>

      <div className="grid gap-4">
        {apis.map((api) => {
          const disabled = api.requiresWallet && (!connected || !stakeAddress);
          return (
            <div
              key={api.name}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">{api.name}</p>
                  <p className="truncate text-xs text-gray-500">{api.endpoint}</p>
                </div>
                <button
                  onClick={api.action}
                  disabled={disabled || api.result.status === 'loading'}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                >
                  {api.result.status === 'loading' ? 'Fetching...' : 'Fetch'}
                </button>
              </div>

              {api.result.status !== 'idle' && (
                <div className="mt-3">
                  {api.result.status === 'loading' && (
                    <p className="animate-pulse text-sm text-gray-400">Loading...</p>
                  )}
                  {api.result.status === 'error' && (
                    <pre className="overflow-auto rounded-lg bg-red-950/50 p-3 text-xs text-red-300">
                      {api.result.error}
                    </pre>
                  )}
                  {api.result.status === 'success' && (
                    <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-green-300">
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
