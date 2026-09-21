import { Link, useLocation } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  IconGift,
  IconUsers,
  IconFileText,
  IconRocket,
  IconChartLine,
  IconHome2,
  IconCoins,
  IconWallet,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { DiscordIcon, XIcon, GitHubIcon } from '@/components/icons/SocialIcons';
import TosiDropLogo from '@/assets/tosidrop_logo.png';

const NAV_GROUPS = [
  {
    label: 'Your wallet',
    links: [
      { name: 'Home', href: '/', icon: IconHome2 },
      { name: 'Wallet', href: '/profile?tab=overview', icon: IconWallet },
      { name: 'Claim rewards', href: '/claim', icon: IconGift },
    ],
  },
  {
    label: 'Discover',
    links: [
      { name: 'Token programs', href: '/tokens', icon: IconCoins },
      { name: 'Network', href: '/network', icon: IconChartLine },
    ],
  },
  {
    label: 'Build',
    links: [
      { name: 'My projects', href: '/projects', icon: IconRocket },
      { name: 'Team', href: '/team', icon: IconUsers },
    ],
  },
  {
    label: 'Resources',
    links: [{ name: 'Docs', href: 'https://docs.tosidrop.me/', icon: IconFileText, external: true }],
  },
];

const SOCIAL_LINKS = [
  { label: 'Discord', href: 'https://discord.gg/tosidrop', icon: DiscordIcon },
  { label: 'X', href: 'https://x.com/tosidrop', icon: XIcon },
  { label: 'GitHub', href: 'https://github.com/TosiDrop', icon: GitHubIcon },
];

const LINK_BASE = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition';
const LINK_IDLE = 'text-text-muted hover:bg-white/[0.03] hover:text-text-primary';

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col border-r border-border-subtle bg-surface-sidebar">
      <div className="px-6 pb-7 pt-7">
        <Link to="/" className="flex items-center gap-2.5 rounded-md" onClick={onLinkClick}>
          <img src={TosiDropLogo} alt="" className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            Tosi<span className="text-cream">Drop</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-2xs font-medium uppercase tracking-[0.16em] text-text-faint">{group.label}</p>
            <ul className="space-y-0.5">
              {group.links.map((link) => {
            const Icon = link.icon;
            if ('external' in link && link.external) {
              return (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onLinkClick}
                    className={cn('group', LINK_BASE, LINK_IDLE)}
                  >
                    <Icon size={18} stroke={1.6} />
                    <span className="flex-1">
                      {link.name}
                      <span className="sr-only"> (opens in new tab)</span>
                    </span>
                    <IconExternalLink
                      size={12}
                      stroke={1.7}
                      className="opacity-50 transition group-hover:opacity-100"
                    />
                  </a>
                </li>
              );
            }
            const [linkPath, linkQuery] = link.href.split('?');
            const requiredTab = new URLSearchParams(linkQuery).get('tab');
            const currentTab = new URLSearchParams(location.search).get('tab');
            const isActive = link.href === '/'
              ? location.pathname === '/'
              : requiredTab
                ? location.pathname === linkPath && currentTab === requiredTab
                : location.pathname.startsWith(linkPath);
            return (
              <li key={link.name}>
                <Link
                  to={link.href}
                  onClick={onLinkClick}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    LINK_BASE,
                    isActive ? 'bg-accent/[0.12] font-medium text-text-primary' : LINK_IDLE,
                  )}
                >
                  <Icon size={18} stroke={1.7} className={isActive ? 'text-accent-light' : undefined} />
                  <span className="flex-1">{link.name}</span>
                </Link>
              </li>
            );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-1 px-4 pb-4 pt-4">
        {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} (opens in new tab)`}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/[0.03] hover:text-accent-light"
          >
            <Icon />
          </a>
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isOpen, close } = useMobileMenu();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
        <SidebarContent />
      </aside>

      <Dialog open={isOpen} onClose={close} className="relative z-50 lg:hidden">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
        <DialogPanel className="fixed inset-y-0 left-0 w-60 shadow-pop">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="absolute right-2 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/[0.04] hover:text-text-primary"
          >
            <IconX size={18} />
          </button>
          <SidebarContent onLinkClick={close} />
        </DialogPanel>
      </Dialog>
    </>
  );
}
