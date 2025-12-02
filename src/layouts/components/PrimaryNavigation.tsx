import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import TosiDropLogo from '@/assets/tosidrop_logo.png';

const NAV_LINKS = [
  { name: 'Claim', href: '/' },
  { name: 'History', href: '/history' },
  { name: 'Preferences', href: '/preferences' },
];

export const PrimaryNavigation = () => {
  const location = useLocation();

  const links = NAV_LINKS.map((link) => ({
    ...link,
    current:
      link.href === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(link.href),
  }));

  return (
    <Disclosure
      as="nav"
      className="sticky top-0 z-30 border-b border-white/10 bg-gray-900/90 backdrop-blur"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={TosiDropLogo}
                alt="TosiDrop"
                className="h-8 w-auto"
              />
              <span className="hidden text-lg font-semibold text-white sm:inline">
                TosiDrop
              </span>
            </Link>

            <div className="hidden items-center gap-4 sm:flex">
              {links.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm transition',
                    link.current
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  )}
                  aria-current={link.current ? 'page' : undefined}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="sm:hidden">
            <DisclosureButton className="rounded-md p-2 text-gray-300 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white">
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="block size-6 data-open:hidden" />
              <XMarkIcon className="hidden size-6 data-open:block" />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-4 pb-4">
          {links.map((link) => (
            <DisclosureButton
              as={Link}
              key={link.name}
              to={link.href}
              className={cn(
                'block rounded-lg px-3 py-2 text-base font-medium',
                link.current
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
              aria-current={link.current ? 'page' : undefined}
            >
              {link.name}
            </DisclosureButton>
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
};

