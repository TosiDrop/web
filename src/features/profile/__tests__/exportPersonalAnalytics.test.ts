import { describe, expect, it } from 'vitest';
import { personalAnalyticsCsvRows } from '../utils/exportPersonalAnalytics';

describe('personalAnalyticsCsvRows', () => {
  it('separates claim counts from per-token rewards so sums stay accurate', () => {
    const data = {
      claimsByMonth: [{ month: '2026-06', label: 'Jun 2026', claims: 2 }],
      seriesByToken: {
        a: { token: 'a', ticker: 'AAA', points: [{ month: '2026-06', label: 'Jun 2026', amount: 5, cumulative: 5 }] },
        b: { token: 'b', ticker: 'BBB', points: [{ month: '2026-06', label: 'Jun 2026', amount: 7, cumulative: 7 }] },
      },
    };
    expect(personalAnalyticsCsvRows(data)).toEqual([
      ['record_type', 'month', 'token_id', 'ticker', 'claims', 'reward_amount', 'cumulative_reward'],
      ['claims', '2026-06', '', '', 2, '', ''],
      ['reward', '2026-06', 'a', 'AAA', '', 5, 5],
      ['reward', '2026-06', 'b', 'BBB', '', 7, 7],
    ]);
  });
});
