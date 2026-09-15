import { Link } from 'react-router-dom';
import { IconArrowRight, IconRocket } from '@tabler/icons-react';
import { TokenCatalog } from '@/features/tokens/components/TokenCatalog';
import { buttonClassName } from '@/lib/button';

export default function TokensPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label-eyebrow">Token programs</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Discover tokens</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">Explore approved token distribution programs and see how each one rewards qualifying delegators.</p>
        </div>
        <Link to="/projects" className={buttonClassName('secondary', 'sm')}>
          Manage your tokens <IconArrowRight size={15} stroke={1.8} />
        </Link>
      </header>
      <TokenCatalog />
      <section className="card-premium flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div>
          <p className="text-sm font-medium text-text-primary">Have a token to distribute?</p>
          <p className="mt-1 text-xs text-text-muted">Register its reward program for review by the TosiDrop team.</p>
        </div>
        <Link to="/projects/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-white"><IconRocket size={15} stroke={1.8} /> Register a token</Link>
      </section>
    </div>
  );
}
