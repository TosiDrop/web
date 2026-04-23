import { Link, useLocation } from 'react-router-dom';
import { Dialog, DialogPanel } from '@headlessui/react';
import { IconGift, IconHistory, IconFileText, IconSettings, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { DiscordIcon, XIcon, GitHubIcon } from '@/components/icons/SocialIcons';
import TosiDropLogo from '@/assets/tosidrop_logo.png';

const NAV_LINKS = [
  { name: 'Claim', href: '/', icon: IconGift },
  { name: 'History', href: '/history', icon: IconHistory },
  { name: 'Settings', href: '/preferences', icon: IconSettings },
  { name: 'Docs', href: 'https://docs.tosidrop.me/', icon: IconFileText, external: true },
];

const SOCIAL_LINKS = [
  { label: 'Discord', href: 'https://discord.gg/tosidrop', icon: DiscordIcon },
  { label: 'Twitter', href: 'https://twitter.com/tosidrop', icon: XIcon },
  { label: 'GitHub', href: 'https://github.com/ADAIApool/tosidrop', icon: GitHubIcon },
];

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-surface-sidebar">
      <div className="px-5 pt-6 pb-8">
        <Link to="/" className="flex items-center gap-2.5" onClick={onLinkClick}>
          <img src={TosiDropLogo} alt="TosiDrop" className="h-8 w-auto" />
          <span className="text-base font-semibold text-white">TosiDrop</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
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
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-500 transition hover:text-slate-300"
              >
                <Icon size={18} stroke={1.5} />
                {link.name}
              </a>
            );
          }

          return (
            <Link
              key={link.name}
              to={link.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition',
                isActive
                  ? 'bg-surface-raised text-brand-cyan font-medium border-l-2 border-brand-cyan'
                  : 'text-slate-500 hover:text-slate-300 border-l-2 border-transparent'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} stroke={1.5} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-subtle px-5 py-4">
        <div className="flex items-center gap-3.5">
          {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 transition hover:text-gray-300"
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
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <DialogPanel className="fixed inset-y-0 left-0 w-56 shadow-xl">
          <div className="absolute right-2 top-2 z-10">
            <button onClick={close} aria-label="Close menu" className="rounded-md p-1 text-gray-400 hover:text-white">
              <IconX size={18} />
            </button>
          </div>
          <SidebarContent onLinkClick={close} />
        </DialogPanel>
      </Dialog>
    </>
  );
}
