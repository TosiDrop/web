import { Link } from 'react-router-dom';
import { IconArrowRight, IconUserCircle } from '@tabler/icons-react';
import { PoolComparison } from '@/features/analytics/components/PoolComparison';
import { PlatformStats } from '@/features/analytics/components/PlatformStats';

export default function AnalyticsPage() {
  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="label-eyebrow">Network intelligence</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Public analytics
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          TosiDrop&apos;s shared network view lives here. Pool comparisons and
          platform-wide activity stay public; wallet-specific claim history
          remains private to your Profile.
        </p>
      </header>

      <section className="space-y-5" aria-labelledby="platform-stats">
        <div>
          <h2 id="platform-stats" className="text-xl font-light tracking-tight text-white">
            Platform <span className="font-semibold">statistics</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">Live counters from the reward distributor.</p>
        </div>
        <PlatformStats />
      </section>

      <section className="space-y-5" aria-labelledby="pool-comparison">
        <div>
          <h2 id="pool-comparison" className="text-xl font-light tracking-tight text-white">
            Pool <span className="font-semibold">comparison</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Token programs, delegation size, whitelist status, and claim volume per pool.
          </p>
        </div>
        <PoolComparison />
      </section>

      <section className="card-premium overflow-hidden">
        <div className="grid md:grid-cols-[1fr_auto] md:items-center">
          <div className="px-6 py-6 sm:px-7">
            <div className="flex items-center gap-3">
              <IconUserCircle size={20} stroke={1.5} className="text-cream" />
              <p className="label-eyebrow">Your wallet</p>
            </div>
            <h2 className="mt-4 text-lg font-medium text-white">Personal claim analytics</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Claims, token mix, reward accumulation, and fee history are tied
              to your connected stake address and stay in Profile.
            </p>
          </div>
          <div className="border-t border-border-subtle px-6 py-5 md:border-l md:border-t-0 md:px-7">
            <Link
              to="/profile?tab=analytics"
              className="group inline-flex items-center gap-2 text-sm font-medium text-accent-light transition hover:text-white"
            >
              Open personal analytics
              <IconArrowRight size={16} stroke={1.8} className="transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
