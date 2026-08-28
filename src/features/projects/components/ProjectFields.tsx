import type { DistributionConfig, ProjectInput } from '@/shared/projects';

export const INPUT_CLASS =
  'w-full rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="label-eyebrow">{label}</span>
        <div className="mt-1.5">{children}</div>
      </label>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

interface DetailsProps {
  value: ProjectInput;
  onChange: (patch: Partial<ProjectInput>) => void;
}

export function ProjectDetailsFields({ value, onChange }: DetailsProps) {
  return (
    <div className="space-y-4">
      <Field label="Project name">
        <input
          className={INPUT_CLASS}
          value={value.name}
          maxLength={80}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. TosiDrop"
        />
      </Field>
      <Field label="Description" hint="Shown to delegators browsing reward programs.">
        <textarea
          className={`${INPUT_CLASS} min-h-[88px] resize-y`}
          value={value.description}
          maxLength={1000}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
      <Field label="Website">
        <input
          className={INPUT_CLASS}
          value={value.website}
          inputMode="url"
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="https://"
        />
      </Field>
      <Field label="Logo URL">
        <input
          className={INPUT_CLASS}
          value={value.logoUrl}
          inputMode="url"
          onChange={(e) => onChange({ logoUrl: e.target.value })}
          placeholder="https://…/logo.png"
        />
      </Field>
    </div>
  );
}

interface DistributionProps {
  value: DistributionConfig;
  poolId: string;
  onChange: (patch: Partial<ProjectInput>) => void;
}

export function DistributionFields({ value, poolId, onChange }: DistributionProps) {
  const set = (patch: Partial<DistributionConfig>) =>
    onChange({ distribution: { ...value, ...patch } });
  return (
    <div className="space-y-4">
      <Field label="Tokens per epoch" hint="Total distributed across qualifying delegators each epoch.">
        <input
          className={INPUT_CLASS}
          value={value.amountPerEpoch}
          inputMode="decimal"
          onChange={(e) => set({ amountPerEpoch: e.target.value })}
          placeholder="e.g. 10000"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum stake (ADA)">
          <input
            className={INPUT_CLASS}
            value={value.minStakeAda}
            inputMode="decimal"
            onChange={(e) => set({ minStakeAda: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Reward expiry (epochs)" hint="0 = never expires">
          <input
            className={INPUT_CLASS}
            type="number"
            min={0}
            value={value.expiryEpochs}
            onChange={(e) => set({ expiryEpochs: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="Stake pool (optional)" hint="Restrict rewards to delegators of one pool.">
        <input
          className={`${INPUT_CLASS} font-mono text-xs`}
          value={poolId}
          onChange={(e) => onChange({ poolId: e.target.value })}
          placeholder="pool1…"
        />
      </Field>
    </div>
  );
}
