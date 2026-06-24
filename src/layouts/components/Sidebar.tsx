import { Link, useLocation } from 'react-router-dom';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
  IconGift,
  IconUserCircle,
  IconUsers,
  IconFileText,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { DiscordIcon, XIcon, GitHubIcon } from '@/components/icons/SocialIcons';
import { useWalletStore } from '@/store/wallet-state';
import { useNetworkStore, networkLabel } from '@/store/network-state';
import { truncateHash, getNetworkLabel } from '@/utils/format';
import TosiDropLogo from '@/assets/tosidrop_logo.png';

const NAV_LINKS = [
  { name: 'Claim', href: '/', icon: IconGift },
  { name: 'Profile', href: '/profile', icon: IconUserCircle },
  { name: 'Team', href: '/team', icon: IconUsers },
  { name: 'Docs', href: 'https://docs.tosidrop.me/', icon: IconFileText, external: true },
];

const SOCIAL_LINKS = [
  { label: 'Discord', href: 'https://discord.gg/tosidrop', icon: DiscordIcon },
  { label: 'Twitter', href: 'https://twitter.com/tosidrop', icon: XIcon },
  { label: 'GitHub', href: 'https://github.com/ADAIApool/tosidrop', icon: GitHubIcon },
];

function ConnectedWalletCard() {
  const { connected, stakeAddress, networkId } = useWalletStore();
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);

  if (!connected || !stakeAddress) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-3.5">
        <div className="text-[12px] text-[#8A8E9A]">No wallet connected</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#A9ADBA] rounded-[5px] border border-border-default px-1.5 py-[3px]">
            {networkLabel(selectedNetwork)}
          </span>
          <span className="text-[12px] text-[#6B6F7B]">Target</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-3.5">
      <div className="text-[12px] text-[#8A8E9A]">Connected wallet</div>
      <div className="mt-1.5 font-mono text-[12px] text-[#D7D9E0]">
        {truncateHash(stakeAddress, 10, 6)}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#A9ADBA] rounded-[5px] border border-border-default px-1.5 py-[3px]">
          {getNetworkLabel(networkId)}
        </span>
        <span className="text-[12px] text-[#6B6F7B]">Synced</span>
      </div>
    </div>
  );
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const location = useLocation();

  return (
    <div className="relative flex h-full flex-col border-r border-white/[0.06] bg-[linear-gradient(180deg,#0A0C12,#080A0E)]">
      {/* Brand */}
      <div className="px-6 pt-7 pb-7">
        <Link to="/" className="flex items-center gap-2.5" onClick={onLinkClick}>
          <img src={TosiDropLogo} alt="" className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight text-[#F4F5F7]">
            Tosi<span className="text-cream">Drop</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4">
        <p className="label-eyebrow px-2.5 pb-3">Workspace</p>
        <div className="space-y-[3px]">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.href);
            const Icon = link.icon;

            if (link.external) {
              return (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onLinkClick}
                  className="group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] text-[#8A8E9A] transition hover:bg-white/[0.03] hover:text-[#D7D9E0]"
                >
                  <Icon size={18} stroke={1.6} />
                  <span className="flex-1">{link.name}</span>
                  <IconExternalLink
                    size={12}
                    stroke={1.7}
                    className="opacity-45 transition group-hover:opacity-100"
                  />
                </a>
              );
            }

            return (
              <Link
                key={link.name}
                to={link.href}
                onClick={onLinkClick}
                className={cn(
                  'relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] transition',
                  isActive
                    ? 'bg-accent/[0.13] text-[#EDEEF2] font-medium'
                    : 'text-[#8A8E9A] hover:bg-white/[0.03] hover:text-[#D7D9E0]',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-[9px] bottom-[9px] w-[2.5px] rounded-full bg-accent"
                  />
                )}
                <Icon
                  size={18}
                  stroke={1.7}
                  className={isActive ? 'text-accent-light' : ''}
                />
                <span className="flex-1">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="space-y-3.5 px-4 pb-5 pt-4">
        <ConnectedWalletCard />
        <div className="flex items-center gap-4 px-1">
          {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#54565F] transition hover:text-accent-light"
              aria-label={label}
            >
              <Icon />
            </a>
          ))}
        </div>
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
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />
        <DialogPanel className="fixed inset-y-0 left-0 w-60 shadow-2xl shadow-black/60">
          <div className="absolute right-2 top-2 z-10">
            <button
              onClick={close}
              aria-label="Close menu"
              className="rounded-md p-1 text-slate-400 hover:text-white"
            >
              <IconX size={18} />
            </button>
          </div>
          <SidebarContent onLinkClick={close} />
        </DialogPanel>
      </Dialog>
    </>
  );
}
