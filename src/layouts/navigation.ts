import {
  IconChartLine,
  IconCoins,
  IconFileText,
  IconGift,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react';

export const NAV_GROUPS = [
  {
    label: 'Your wallet',
    links: [
      { name: 'Portfolio', href: '/profile', icon: IconWallet },
      { name: 'Claim rewards', href: '/claim', icon: IconGift },
    ],
  },
  {
    label: 'Discover',
    links: [
      { name: 'Discover', href: '/tokens', icon: IconCoins },
      { name: 'Analytics', href: '/analytics', icon: IconChartLine },
    ],
  },
  {
    label: 'Participate',
    links: [{ name: 'Pools', href: '/team', icon: IconUsers }],
  },
  {
    label: 'Resources',
    links: [{ name: 'Docs', href: 'https://docs.tosidrop.me/', icon: IconFileText, external: true }],
  },
] as const;

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/claim': 'Claim rewards',
  '/profile': 'Portfolio',
  '/tokens': 'Discover',
  '/token': 'Discover',
  '/team': 'Pools',
  '/analytics': 'Analytics',
  '/deposit': 'Deposit',
};

export function pageTitle(pathname: string): string {
  if (pathname === '/') return PAGE_TITLES['/'];
  const match = Object.keys(PAGE_TITLES).find((path) => path !== '/' && pathname.startsWith(path));
  return match ? PAGE_TITLES[match] : '';
}
