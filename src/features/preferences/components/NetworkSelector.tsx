import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { useNetworkStore, networkLabel, type Network } from '@/store/network-state';
import { useNetworks } from '@/features/preferences/api/networks.queries';

interface Option {
  value: Network;
  description: string;
}

const OPTIONS: Option[] = [
  { value: 'mainnet', description: 'Real ADA. Real rewards.' },
  { value: 'preview', description: 'Test network for development.' },
];

export function NetworkSelector() {
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);
  const setNetwork = useNetworkStore((s) => s.setNetwork);
  const { data: networks } = useNetworks();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-slate-200">Network</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Wallets and API calls run on the selected network.
        </p>
      </div>
      <Listbox value={selectedNetwork} onChange={setNetwork}>
        <ListboxButton className="group flex min-w-[148px] items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-inset/80 px-3 py-2 text-xs text-white transition hover:bg-white/[0.04] focus:outline-none data-[open]:bg-white/[0.04]">
          {networkLabel(selectedNetwork)}
          <IconChevronDown
            size={13}
            stroke={1.6}
            className="text-slate-500 transition group-data-[open]:rotate-180"
          />
        </ListboxButton>
        <ListboxOptions
          anchor={{ to: 'bottom end', gap: 8 }}
          transition
          className="z-50 w-[240px] rounded-xl border border-border-subtle bg-surface-overlay/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-md focus:outline-none origin-top transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {OPTIONS.map(({ value, description }) => {
            const available = networks?.[value] ?? true;
            return (
              <ListboxOption
                key={value}
                value={value}
                disabled={available ? undefined : true}
                className="group flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-slate-300 transition data-[focus]:bg-surface-inset data-[selected]:text-white data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
              >
                <div>
                  <p className="text-xs font-medium">{networkLabel(value)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {description}
                    {!available && <span className="text-slate-600"> · not yet available</span>}
                  </p>
                </div>
                <IconCheck
                  size={13}
                  stroke={2}
                  className="mt-0.5 shrink-0 text-accent-light opacity-0 transition group-data-[selected]:opacity-100"
                />
              </ListboxOption>
            );
          })}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
