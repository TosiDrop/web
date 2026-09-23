import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, pageTitle } from '@/layouts/navigation';

describe('application navigation', () => {
  it('keeps sidebar destinations and page titles in one contract', () => {
    const destinations = NAV_GROUPS.flatMap((group) => [...group.links]) as Array<{ href: string }>;

    expect(destinations.map((link) => link.href)).toEqual([
      '/profile',
      '/claim',
      '/tokens',
      '/analytics',
      '/team',
      'https://docs.tosidrop.me/',
    ]);
    expect(pageTitle('/profile')).toBe('Portfolio');
    expect(pageTitle('/analytics/pools')).toBe('Analytics');
    expect(pageTitle('/unknown')).toBe('');
  });
});
