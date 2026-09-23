import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DistributionCard } from '../DistributionCard';

const TOKEN = {
  assetId: 'asset1', ticker: 'TOSI', logo: '', decimals: 2, amount: 10, premium: false, native: false,
};

describe('DistributionCard', () => {
  afterEach(cleanup);

  it('shows the claim estimate and keeps actions in their own row when priced', () => {
    render(
      <DistributionCard
        token={TOKEN}
        selected
        onToggle={() => undefined}
        favorite={{ active: false, onToggle: () => undefined }}
        dislike={{ active: false, onToggle: () => undefined }}
        marketPrice={{ priceUsd: 2, priceAda: 1, priceChange24h: null, source: 'index', sourceCount: 1, observedAt: 1 }}
      />,
    );
    expect(screen.getByText('Est. claim value')).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favorite TOSI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide TOSI' })).toBeInTheDocument();
  });

  it('does not reserve an empty market block for unpriced tokens', () => {
    render(<DistributionCard token={TOKEN} selected={false} onToggle={() => undefined} />);
    expect(screen.queryByText('Est. claim value')).not.toBeInTheDocument();
    expect(screen.queryByText('Market estimate')).not.toBeInTheDocument();
  });
});
