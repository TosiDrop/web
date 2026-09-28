import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PoolComparisonTable } from '../components/PoolComparison';
import type { PoolComparisonRow } from '../utils/poolComparison';

describe('PoolComparisonTable', () => {
  it('does not expose an unknown delegator count as a zero-valued progressbar', () => {
    const rows: PoolComparisonRow[] = [
      {
        kind: 'pool',
        poolId: 'pool1known',
        ticker: 'KNOWN',
        name: 'Known Pool',
        delegators: 20,
        partner: false,
        offerings: [],
      },
      {
        kind: 'project',
        poolId: 'project_unknown',
        ticker: 'UNKNOWN',
        name: 'Unknown Project',
        delegators: null,
        partner: null,
        offerings: [],
      },
    ];

    render(<PoolComparisonTable rows={rows} />);

    expect(screen.getByRole('progressbar', { name: 'KNOWN relative delegator count' }))
      .toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByRole('progressbar', { name: 'UNKNOWN relative delegator count' }))
      .not.toBeInTheDocument();
  });
});
