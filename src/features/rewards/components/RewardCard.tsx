import type { ClaimableToken } from '@/shared/rewards';

interface RewardCardProps {
  token: ClaimableToken;
}

export const RewardCard = ({ token }: RewardCardProps) => {
  const hasValue = token.price > 0 && token.total > 0;

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-4 ${
        token.premium
          ? 'border-purple-500/70 bg-purple-500/5'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <header className="flex items-center gap-3">
        {token.logo && (
          <img
            src={token.logo}
            alt={token.ticker}
            className="size-10 rounded-full border border-white/10 bg-black/30 object-contain"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-white">
              {token.ticker || token.assetId.slice(0, 8)}
            </span>
            {token.premium && (
              <span className="rounded-full bg-purple-600/20 px-2 py-0.5 text-xs font-semibold text-purple-200">
                Premium
              </span>
            )}
            {token.native && (
              <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-200">
                Native
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 break-all">{token.assetId}</p>
        </div>
      </header>

      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-gray-400">Amount</dt>
          <dd className="font-semibold text-white">
            {token.amount.toLocaleString()}
          </dd>
        </div>
        {hasValue && (
          <>
            <div className="flex items-center justify-between">
              <dt className="text-gray-400">Price</dt>
              <dd className="text-gray-200">{token.price.toFixed(6)} ADA</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-400">Total</dt>
              <dd className="font-semibold text-green-400">
                {token.total.toFixed(6)} ADA
              </dd>
            </div>
          </>
        )}
      </dl>
    </article>
  );
};

