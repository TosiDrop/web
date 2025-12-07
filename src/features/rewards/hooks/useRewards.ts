import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { getRewards } from '../api/getRewards';

interface UseRewardsResult {
  addressInput: string;
  setAddressInput: (value: string) => void;
  rewards: ClaimableToken[];
  isLoading: boolean;
  error: string | null;
  fetchRewards: (explicitAddress?: string) => Promise<void>;
  hasResults: boolean;
}

export function useRewards(initialAddress?: string): UseRewardsResult {
  const [addressInput, setAddressInput] = useState(initialAddress ?? '');
  const [rewards, setRewards] = useState<ClaimableToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialAddress) return;
    setAddressInput((current) => (current ? current : initialAddress));
  }, [initialAddress]);

  useEffect(() => {
    if (initialAddress && !addressInput) {
      setAddressInput(initialAddress);
    }
  }, [initialAddress, addressInput]);

  const fetchRewards = useCallback(
    async (explicitAddress?: string) => {
      const targetAddress =
        explicitAddress?.trim() ||
        addressInput.trim() ||
        initialAddress?.trim() ||
        '';

      if (!targetAddress) {
        setError('Wallet address is not available.');
        return;
      }

      setIsLoading(true);
      setError(null);
      setRewards([]);

      try {
        const fetchedRewards = await getRewards(targetAddress);
        setRewards(fetchedRewards);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [addressInput, initialAddress]
  );

  const hasResults = useMemo(() => rewards.length > 0, [rewards]);

  return {
    addressInput,
    setAddressInput,
    rewards,
    isLoading,
    error,
    fetchRewards,
    hasResults,
  };
}

