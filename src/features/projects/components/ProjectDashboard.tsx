import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAlertCircle, IconPencil, IconRocket } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { tickerFor } from '@/features/history/api/history.queries';
import { truncateHash } from '@/utils/format';
import type { Project, ProjectInput, ProjectStatus } from '@/shared/projects';
import { useOwnerProjects, useTokenMap } from '@/features/projects/api/projects.queries';
import { useProjectSubmit } from '@/features/projects/hooks/useProjectSubmit';
import { describeDistribution } from '@/features/projects/utils/describeDistribution';
import { DistributionFields, ProjectDetailsFields } from './ProjectFields';
import { StateMessage } from '@/features/profile/components/StateMessage';

const STATUS_STYLE: Record<ProjectStatus, string> = {
  pending: 'border-status-pending-line bg-status-pending-soft text-status-pending-light',
  approved: 'border-status-success-line bg-status-success-soft text-status-success-light',
  rejected: 'border-status-error-line bg-status-error-soft text-status-error-light',
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium capitalize',
        STATUS_STYLE[status],
      )}
    >
      {status}
    </span>
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-inset text-2xs uppercase text-text-secondary">
            {project.name.slice(0, 3)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-text-primary">{project.name}</p>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 font-mono text-2xs text-text-muted">
            {ticker} · {truncateHash(project.tokenId, 10, 6)}
          </p>
          <p className="mt-1 text-xs text-text-muted">{describeDistribution(project, ticker)}</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs text-text-muted transition hover:text-text-primary"
          >
            <IconPencil size={13} stroke={1.7} />
            Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="space-y-5 border-t border-border-subtle bg-surface-inset px-5 py-5">
          <ProjectDetailsFields value={draft} onChange={patch} />
          <DistributionFields value={draft.distribution} poolId={draft.poolId} onChange={patch} />
          {error && (
            <p role="alert" className="flex items-center gap-2 text-xs text-status-error-light">
              <IconAlertCircle size={14} /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <GradientButton variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </GradientButton>
            <GradientButton size="sm" onClick={save} disabled={isPending}>
              {isPending ? 'Signing…' : 'Sign & save'}
            </GradientButton>
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
    return <StateMessage title="Not connected" message="Connect a wallet to manage your tokens." />;
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
      <div role="alert" className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-status-error-light">
        <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
        {error.message}
      </div>
    );
  }
  if (data?.degraded) {
    return (
      <StateMessage
        title="Token list unavailable"
        message="Token storage is not reachable right now, so your tokens can't be shown. Nothing has been lost."
      />
    );
  }
  if (!projects?.length) {
    return (
      <StateMessage title="No tokens yet" message="Register a token to start distributing rewards through TosiDrop.">
        <Link
          to="/projects/new"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent-light hover:text-text-primary"
        >
          <IconRocket size={16} stroke={1.7} /> Register a token
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
