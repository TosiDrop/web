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
                  'flex h-7 w-7 items-center justify-center rounded-full text-2xs font-semibold',
                  state === 'done' && 'bg-accent text-accent-contrast',
                  state === 'active' && 'bg-accent-soft text-accent-light ring-1 ring-accent',
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
                    ? 'border-accent-line bg-accent-soft'
                    : 'border-border-subtle bg-surface-inset hover:border-accent-line',
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-2xs uppercase text-text-secondary">
                  {o.ticker.slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{o.ticker}</span>
                  <span className="block font-mono text-2xs text-text-muted">{truncateHash(o.id, 12, 6)}</span>
                </span>
                <span className="font-mono text-2xs text-text-muted">{o.quantity}</span>
                {o.registered && (
                  <span className="rounded-full border border-status-success-line bg-status-success-soft px-2 py-0.5 text-2xs text-status-success-light">
                    Listed
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">No native tokens found in the connected wallet.</p>
      )}
      <label className="block">
        <span className="field-label">Or enter a token id</span>
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
      pushToast({ tone: 'success', title: 'Token submitted', message: 'We will review it shortly.' });
      void navigate('/projects');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    }
  };

  const ticker = tickerFor(normalized.tokenId, tokens?.[normalized.tokenId]);

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Register a token</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Tell us about your token and how you want to reward delegators. You sign the
          registration with your wallet; nothing leaves your wallet.
        </p>
      </header>

      <Stepper current={step} />

      <section className="card-premium px-6 py-6">
        <h2 className="mb-5 text-lg font-medium text-text-primary">{STEPS[step]}</h2>

        {step === 0 && (
          <div className="space-y-4">
            {walletReady ? (
              <p className="text-sm text-text-secondary">
                Connected as <span className="font-medium text-text-primary">{walletName}</span>{' '}
                <span className="font-mono text-xs text-text-muted">{truncateHash(stakeAddress!, 10, 6)}</span>
              </p>
            ) : (
              <p className="text-sm text-text-muted">Connect the wallet that owns the token.</p>
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
            <dt className="field-label">Owner</dt>
            <dd className="font-mono text-xs text-text-secondary">{stakeAddress}</dd>
            <dt className="field-label">Name</dt>
            <dd className="text-text-primary">{normalized.name}</dd>
            {normalized.website && (
              <>
                <dt className="field-label">Website</dt>
                <dd className="text-text-secondary">{normalized.website}</dd>
              </>
            )}
            <dt className="field-label">Token</dt>
            <dd className="text-text-secondary">
              {ticker} <span className="font-mono text-xs text-text-muted">{normalized.tokenId}</span>
            </dd>
            <dt className="field-label">Distribution</dt>
            <dd className="text-text-secondary">{describeDistribution(normalized, ticker)}</dd>
          </dl>
        )}

        {error && (
          <p role="alert" className="mt-4 flex items-center gap-2 text-xs text-status-error-light">
            <IconAlertCircle size={14} /> {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-xs text-text-muted transition hover:text-text-secondary disabled:invisible"
          >
            <IconArrowLeft size={14} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <GradientButton onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              Continue
            </GradientButton>
          ) : (
            <GradientButton onClick={finish} disabled={!canContinue || isPending}>
              {isPending ? 'Waiting for signature…' : 'Sign & submit'}
            </GradientButton>
          )}
        </div>
      </section>
    </div>
  );
}
