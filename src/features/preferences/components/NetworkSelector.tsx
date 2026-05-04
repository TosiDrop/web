import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { useNetworkStore, networkLabel, type Network } from '@/store/network-state';

interface Option {
  value: Network;
  description: string;
}

const OPTIONS: Option[] = [
  { value: 'mainnet', description: 'Real ADA. Real rewards.' },
  { value: 'preview', description: 'Test network for development.' },
];

function NetworkDot({ network }: { network: Network }) {
  const isMainnet = network === 'mainnet';
  return (
    <span
      className={
        'h-1.5 w-1.5 rounded-full ' +
        (isMainnet
          ? 'bg-brand-cyan shadow-[0_0_6px_rgba(94,234,212,0.85)]'
          : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]')
      }
    />
  );
}

export function NetworkSelector() {
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);
  const setNetwork = useNetworkStore((s) => s.setNetwork);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-slate-200">Network</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Wallets and API calls run on the selected network.
        </p>
      </div>
      <Listbox value={selectedNetwork} onChange={setNetwork}>
        <ListboxButton className="group flex min-w-[148px] items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-inset/80 px-3 py-1.5 text-xs text-white transition hover:border-brand-cyan/40 focus:outline-none data-[open]:border-brand-cyan/50 data-[open]:shadow-[0_0_0_1px_rgba(94,234,212,0.2)]">
          <span className="flex items-center gap-2">
            <NetworkDot network={selectedNetwork} />
            {networkLabel(selectedNetwork)}
          </span>
          <IconChevronDown
            size={13}
            stroke={1.6}
            className="text-slate-500 transition group-data-[open]:rotate-180 group-data-[open]:text-brand-cyan"
          />
        </ListboxButton>
        <ListboxOptions
          anchor={{ to: 'bottom end', gap: 8 }}
          transition
          className="z-50 w-[240px] rounded-xl border border-border-subtle bg-surface-overlay/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-md focus:outline-none origin-top transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {OPTIONS.map(({ value, description }) => (
            <ListboxOption
              key={value}
              value={value}
              className="group flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-slate-300 transition data-[focus]:bg-surface-inset data-[selected]:text-white"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5">
                  <NetworkDot network={value} />
                </span>
                <div>
                  <p className="text-xs font-medium">{networkLabel(value)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
                </div>
              </div>
              <IconCheck
                size={13}
                stroke={2}
                className="mt-1 shrink-0 text-brand-cyan opacity-0 transition group-data-[selected]:opacity-100"
              />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
