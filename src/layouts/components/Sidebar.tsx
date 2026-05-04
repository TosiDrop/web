import { Link, useLocation } from 'react-router-dom';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
  IconGift,
  IconUserCircle,
  IconFileText,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { DiscordIcon, XIcon, GitHubIcon } from '@/components/icons/SocialIcons';
import { useWalletStore } from '@/store/wallet-state';
import { useNetworkStore, networkLabel } from '@/store/network-state';
import TosiDropLogo from '@/assets/tosidrop_logo.png';

const NAV_LINKS = [
  { name: 'Claim', href: '/', icon: IconGift },
  { name: 'Profile', href: '/profile', icon: IconUserCircle },
  { name: 'Docs', href: 'https://docs.tosidrop.me/', icon: IconFileText, external: true },
];

const SOCIAL_LINKS = [
  { label: 'Discord', href: 'https://discord.gg/tosidrop', icon: DiscordIcon },
  { label: 'Twitter', href: 'https://twitter.com/tosidrop', icon: XIcon },
  { label: 'GitHub', href: 'https://github.com/ADAIApool/tosidrop', icon: GitHubIcon },
];

function StatusDot() {
  const connected = useWalletStore((s) => s.connected);
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);

  if (!connected) {
    return (
      <span className="inline-flex items-center gap-2 text-[11px] text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        Disconnected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-slate-300">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.85)]" />
      </span>
      Online · {networkLabel(selectedNetwork)}
    </span>
  );
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const location = useLocation();

  return (
    <div className="relative flex h-full flex-col border-r border-border-subtle bg-surface-sidebar">
      {/* Brand */}
      <div className="px-5 pt-6 pb-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={onLinkClick}>
          <img src={TosiDropLogo} alt="" className="h-7 w-auto" />
          <span className="text-base font-semibold tracking-tight text-white">
            TosiDrop
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1.5 px-3">
        <p className="label-eyebrow px-3 pb-2">Workspace</p>
        <div className="space-y-0.5">
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
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-slate-400 transition hover:bg-white/[0.02] hover:text-slate-200"
                >
                  <Icon size={16} stroke={1.6} />
                  <span className="flex-1">{link.name}</span>
                  <IconExternalLink
                    size={11}
                    stroke={1.6}
                    className="opacity-40 transition group-hover:opacity-100"
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
                  'relative flex items-center gap-3 rounded-lg border px-3 py-2 text-[13px] transition',
                  isActive
                    ? 'border-border-default bg-surface-raised text-white'
                    : 'border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-slate-200',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -left-px top-2 bottom-2 w-[2px] rounded-full bg-brand-cyan"
                  />
                )}
                <Icon size={16} stroke={1.6} />
                <span className="flex-1 font-medium">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="space-y-3 border-t border-border-subtle px-5 py-4">
        <StatusDot />
        <div className="flex items-center gap-3.5">
          {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 transition hover:text-brand-cyan"
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 lg:block">
        <SidebarContent />
      </aside>

      <Dialog open={isOpen} onClose={close} className="relative z-50 lg:hidden">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />
        <DialogPanel className="fixed inset-y-0 left-0 w-56 shadow-2xl shadow-black/60">
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
