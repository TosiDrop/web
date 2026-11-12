import { TokenCatalog } from '@/features/tokens/components/TokenCatalog';

export default function TokensPage() {
  return (
    <div className="space-y-8">
      <header>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Discover tokens</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">Explore approved token distribution programs and see how each one rewards qualifying delegators.</p>
        </div>
      </header>
      <TokenCatalog />
    </div>
  );
}
