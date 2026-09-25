import { PoolComparison } from '@/features/analytics/components/PoolComparison';
import { PlatformStats } from '@/features/analytics/components/PlatformStats';
import { PlatformAudience } from '@/features/analytics/components/PlatformAudience';
import { PersonalAnalytics } from '@/features/profile/components/PersonalAnalytics';
import { useWalletStore } from '@/store/wallet-state';

export default function AnalyticsPage() {
  const connected = useWalletStore((state) => state.connected);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label-eyebrow">Signals, trends, and context</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Explore your claim history, platform usage, network activity, and participating pools.
          </p>
        </div>
        <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1.5 text-2xs font-medium uppercase tracking-[0.14em] text-accent-light">
          Indexed snapshots
        </span>
      </header>

      {connected && (
        <section aria-labelledby="wallet-insights">
          <div className="mb-4">
            <p className="label-eyebrow">Your wallet</p>
            <h2 id="wallet-insights" className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
              Personal insights
            </h2>
          </div>
          <PersonalAnalytics />
        </section>
      )}

      <section className="space-y-5" aria-labelledby="platform-stats">
        <div>
          <p className="label-eyebrow">The network</p>
          <h2 id="platform-stats" className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
            Platform pulse
          </h2>
          <p className="mt-1 text-sm text-text-muted">Latest counters from the reward distributor.</p>
        </div>
        <PlatformStats />
      </section>

      <section className="space-y-5" aria-labelledby="platform-usage">
        <div>
          <h2 id="platform-usage" className="text-2xl font-semibold tracking-tight text-text-primary">Platform usage</h2>
          <p className="mt-1 text-sm text-text-muted">Delivered claims observed in the synced wallet archive.</p>
        </div>
        <PlatformAudience />
      </section>

      <section className="space-y-5" aria-labelledby="pool-comparison">
        <div>
          <p className="label-eyebrow">Delegation and distribution</p>
          <h2 id="pool-comparison" className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
            Pool performance
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Token programs, delegation size, partner status, and claim volume per pool.
          </p>
        </div>
        <PoolComparison />
      </section>
    </div>
  );
}
