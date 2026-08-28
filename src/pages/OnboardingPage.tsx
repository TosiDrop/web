import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssets } from '@meshsdk/react';
import { IconAlertCircle, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { GradientButton } from '@/components/common/GradientButton';
import { useOnboardingStore } from '@/store/onboarding-state';
import { useWalletStore } from '@/store/wallet-state';
import { useToastStore } from '@/store/toast-state';
import { tickerFor } from '@/features/history/api/history.queries';
import { truncateHash } from '@/utils/format';
import { EMPTY_DISTRIBUTION, validateProjectInput, normalizeProjectInput, type ProjectInput } from '@/shared/projects';
import { useTokenMap } from '@/features/projects/api/projects.queries';
import { useProjectSubmit } from '@/features/projects/hooks/useProjectSubmit';
import { describeDistribution } from '@/features/projects/utils/describeDistribution';
import { DistributionFields, INPUT_CLASS, ProjectDetailsFields } from '@/features/projects/components/ProjectFields';

const STEPS = ['Connect', 'Details', 'Token', 'Distribution', 'Review'] as const;

const EMPTY: ProjectInput = {
  name: '',
  description: '',
  website: '',
  logoUrl: '',
  tokenId: '',
  poolId: '',
  distribution: EMPTY_DISTRIBUTION,
};

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-3" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <Fragment key={label}>
            <li className="flex items-center gap-2" aria-current={state === 'active' ? 'step' : undefined}>
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold',
                  state === 'done' && 'bg-accent text-accent-contrast',
                  state === 'active' && 'bg-accent/15 text-accent-light ring-1 ring-accent/50',
                  state === 'todo' && 'bg-surface-inset text-[#5A6075] ring-1 ring-[rgba(56,78,128,0.4)]',
                )}
              >
                {state === 'done' ? <IconCheck size={13} stroke={3} /> : i + 1}
              </span>
              <span className={cn('text-xs font-medium', state === 'todo' ? 'text-[#5A6075]' : 'text-[#C5C8D2]')}>
                {label}
              </span>
            </li>
            {i < STEPS.length - 1 && (
              <span
                className="mx-3 h-px w-8"
                style={{ background: i < current ? '#22D3EE' : 'rgba(56,78,128,0.5)' }}
                aria-hidden="true"
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

function decodeHex(hex: string): string {
  try {
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return hex.slice(0, 8);
  }
}

function TokenStep({ value, onChange }: { value: string; onChange: (tokenId: string) => void }) {
  const assets = useAssets();
  const { data: tokens } = useTokenMap();
  const options = useMemo(
    () =>
      (assets ?? []).map((a) => {
        const id = `${a.policyId}.${a.assetName}`;
        const info = tokens?.[id];
        return {
          id,
          ticker: info ? tickerFor(id, info) : decodeHex(a.assetName) || a.assetName.slice(0, 8),
          registered: !!info,
          quantity: a.quantity,
        };
      }),
    [assets, tokens],
  );

  return (
    <div className="space-y-4">
      {options.length > 0 ? (
        <ul className="space-y-2" aria-label="Wallet tokens">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onChange(o.id)}
                aria-pressed={value === o.id}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                  value === o.id
                    ? 'border-accent/50 bg-accent/[0.08]'
                    : 'border-border-subtle bg-surface-inset hover:border-brand-cyan/40',
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle font-mono text-[10px] uppercase text-slate-300">
                  {o.ticker.slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{o.ticker}</span>
                  <span className="block font-mono text-[10px] text-slate-500">{truncateHash(o.id, 12, 6)}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">{o.quantity}</span>
                {o.registered && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                    Listed
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No native tokens found in the connected wallet.</p>
      )}
      <label className="block">
        <span className="label-eyebrow">Or enter a token id</span>
        <input
          className={`${INPUT_CLASS} mt-1.5 font-mono text-xs`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="policyId.assetNameHex"
        />
      </label>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { connected, stakeAddress, walletName } = useWalletStore();
  const openModal = useOnboardingStore((s) => s.openModal);
  const pushToast = useToastStore((s) => s.push);
  const { submit, isPending } = useProjectSubmit();
  const { data: tokens } = useTokenMap();

  const [step, setStep] = useState(0);
  const [input, setInput] = useState<ProjectInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<ProjectInput>) => setInput((v) => ({ ...v, ...p }));

  const walletReady = connected && !!stakeAddress;
  const normalized = normalizeProjectInput(input);
  const problem = validateProjectInput(normalized);
  const canContinue = [
    walletReady,
    !!normalized.name && (!normalized.website || /^https?:\/\//i.test(normalized.website)),
    !!normalized.tokenId,
    !problem,
    !problem,
  ][step];

  const finish = async () => {
    setError(null);
    try {
      await submit(normalized);
      pushToast({ tone: 'success', title: 'Project submitted', message: 'We will review it shortly.' });
      navigate('/projects');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    }
  };

  const ticker = tickerFor(normalized.tokenId, tokens?.[normalized.tokenId]);

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <header>
        <p className="label-eyebrow">Project onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Register a project</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Tell us about your token and how you want to reward delegators. You sign the
          registration with your wallet; nothing leaves your wallet.
        </p>
      </header>

      <Stepper current={step} />

      <section className="card-premium px-6 py-6">
        <h2 className="mb-5 text-lg font-medium text-white">{STEPS[step]}</h2>

        {step === 0 && (
          <div className="space-y-4">
            {walletReady ? (
              <p className="text-sm text-slate-300">
                Connected as <span className="font-medium text-white">{walletName}</span>{' '}
                <span className="font-mono text-xs text-slate-500">{truncateHash(stakeAddress!, 10, 6)}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400">Connect the wallet that owns the project token.</p>
            )}
            {!walletReady && (
              <GradientButton size="sm" onClick={openModal}>
                Connect wallet
              </GradientButton>
            )}
          </div>
        )}
        {step === 1 && <ProjectDetailsFields value={input} onChange={patch} />}
        {step === 2 && <TokenStep value={input.tokenId} onChange={(tokenId) => patch({ tokenId })} />}
        {step === 3 && (
          <DistributionFields value={input.distribution} poolId={input.poolId} onChange={patch} />
        )}
        {step === 4 && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="label-eyebrow">Owner</dt>
            <dd className="font-mono text-xs text-slate-300">{stakeAddress}</dd>
            <dt className="label-eyebrow">Name</dt>
            <dd className="text-white">{normalized.name}</dd>
            {normalized.website && (
              <>
                <dt className="label-eyebrow">Website</dt>
                <dd className="text-slate-300">{normalized.website}</dd>
              </>
            )}
            <dt className="label-eyebrow">Token</dt>
            <dd className="text-slate-300">
              {ticker} <span className="font-mono text-xs text-slate-500">{normalized.tokenId}</span>
            </dd>
            <dt className="label-eyebrow">Distribution</dt>
            <dd className="text-slate-300">{describeDistribution(normalized, ticker)}</dd>
          </dl>
        )}

        {error && (
          <p role="alert" className="mt-4 flex items-center gap-2 text-xs text-rose-300">
            <IconAlertCircle size={14} /> {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300 disabled:invisible"
          >
            <IconArrowLeft size={14} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={!canContinue || isPending}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? 'Waiting for signature…' : 'Sign & submit'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
