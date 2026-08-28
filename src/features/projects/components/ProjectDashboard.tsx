import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAlertCircle, IconPencil, IconRocket } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useWalletStore } from '@/store/wallet-state';
import { tickerFor } from '@/features/history/api/history.queries';
import { truncateHash } from '@/utils/format';
import type { Project, ProjectInput, ProjectStatus } from '@/shared/projects';
import { useOwnerProjects, useTokenMap } from '@/features/projects/api/projects.queries';
import { useProjectSubmit } from '@/features/projects/hooks/useProjectSubmit';
import { describeDistribution } from '@/features/projects/utils/describeDistribution';
import { DistributionFields, ProjectDetailsFields } from './ProjectFields';

const STATUS_STYLE: Record<ProjectStatus, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
        STATUS_STYLE[status],
      )}
    >
      {status}
    </span>
  );
}

function StateMessage({ eyebrow, message, children }: { eyebrow: string; message: string; children?: React.ReactNode }) {
  return (
    <div className="card-premium px-6 py-14 text-center">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">{message}</p>
      {children}
    </div>
  );
}

function ProjectCard({ project, ticker }: { project: Project; ticker: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProjectInput>(project);
  const [error, setError] = useState<string | null>(null);
  const { submit, isPending } = useProjectSubmit();

  const patch = (p: Partial<ProjectInput>) => setDraft((d) => ({ ...d, ...p }));
  const startEdit = () => {
    setDraft(project);
    setError(null);
    setEditing(true);
  };
  const save = async () => {
    setError(null);
    try {
      await submit(draft, project.id);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <li className="card-premium overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4">
        {project.logoUrl ? (
          <img src={project.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border border-border-subtle object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-inset font-mono text-[11px] uppercase text-slate-300">
            {project.name.slice(0, 3)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-white">{project.name}</p>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-400">
            {ticker} · {truncateHash(project.tokenId, 10, 6)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{describeDistribution(project, ticker)}</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-white"
          >
            <IconPencil size={13} stroke={1.7} />
            Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="space-y-5 border-t border-border-subtle bg-surface-inset/30 px-5 py-5">
          <ProjectDetailsFields value={draft} onChange={patch} />
          <DistributionFields value={draft.distribution} poolId={draft.poolId} onChange={patch} />
          {error && (
            <p role="alert" className="flex items-center gap-2 text-xs text-rose-300">
              <IconAlertCircle size={14} /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {isPending ? 'Signing…' : 'Sign & save'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ProjectDashboard() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const { data, isLoading, error } = useOwnerProjects(stakeAddress);
  const projects = data?.projects;
  const { data: tokens } = useTokenMap();

  if (!stakeAddress) {
    return <StateMessage eyebrow="Not connected" message="Connect a wallet to manage your projects." />;
  }
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1].map((i) => <div key={i} className="skeleton-shimmer h-20 rounded-[13px]" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
        {error.message}
      </div>
    );
  }
  if (data?.degraded) {
    return (
      <StateMessage
        eyebrow="Project list unavailable"
        message="Project storage is not reachable right now, so your projects can't be shown. Nothing has been lost."
      />
    );
  }
  if (!projects?.length) {
    return (
      <StateMessage eyebrow="No projects yet" message="Register a token to start distributing rewards through TosiDrop.">
        <Link
          to="/projects/new"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent-light hover:text-white"
        >
          <IconRocket size={16} stroke={1.7} /> Register a project
        </Link>
      </StateMessage>
    );
  }

  return (
    <ul className="space-y-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} ticker={tickerFor(p.tokenId, tokens?.[p.tokenId])} />
      ))}
    </ul>
  );
}
