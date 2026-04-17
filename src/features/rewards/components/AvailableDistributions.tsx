import type { ClaimableToken } from '@/shared/rewards';
import { DistributionCard } from './DistributionCard';

interface AvailableDistributionsProps {
  tokens: ClaimableToken[];
  onClaim: (token: ClaimableToken) => void;
  claimDisabled?: boolean;
}

export function AvailableDistributions({ tokens, onClaim, claimDisabled }: AvailableDistributionsProps) {
  if (tokens.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-white">Claimable Tokens</h2>
        <p className="py-6 text-center text-sm text-slate-500">
          No rewards found for this address.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-white">
        Claimable Tokens
        <span className="ml-1.5 text-slate-500">{tokens.length}</span>
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tokens.map((token) => (
          <DistributionCard
            key={token.assetId}
            token={token}
            onClaim={() => onClaim(token)}
            disabled={claimDisabled}
          />
        ))}
      </div>
    </div>
  );
}
