import { Link } from 'react-router-dom';
import {
  IconArrowRight,
  IconChartLine,
  IconChartBar,
  IconUserCircle,
} from '@tabler/icons-react';

const PUBLIC_SECTIONS = [
  {
    title: 'Pool comparison',
    description:
      'Compare reward pools on distribution volume, delegation, and the reward programs they support.',
    Icon: IconChartBar,
  },
  {
    title: 'Platform statistics',
    description:
      'Follow TosiDrop activity across pools, delivered rewards, and participating projects.',
    Icon: IconChartLine,
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
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

      <section className="grid gap-4 md:grid-cols-2" aria-label="Public analytics sections">
        {PUBLIC_SECTIONS.map(({ title, description, Icon }) => (
          <article key={title} className="card-premium overflow-hidden">
            <div className="h-px bg-gradient-to-r from-accent/70 via-accent/20 to-transparent" />
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent-light">
                  <Icon size={18} stroke={1.6} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  Public
                </span>
              </div>
              <h2 className="mt-7 text-lg font-medium text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="card-premium overflow-hidden">
        <div className="grid md:grid-cols-[1fr_auto] md:items-center">
          <div className="px-6 py-6 sm:px-7">
            <div className="flex items-center gap-3">
              <IconUserCircle size={20} stroke={1.5} className="text-cream" />
              <p className="label-eyebrow">Your wallet</p>
            </div>
            <h2 className="mt-4 text-lg font-medium text-white">
              Personal claim analytics
            </h2>
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
              <IconArrowRight
                size={16}
                stroke={1.8}
                className="transition group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
