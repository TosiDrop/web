import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { apiClient } from '@/api/client';
import { GradientButton } from '@/components/common/GradientButton';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { usePublicTokens } from '@/features/tokens/api/tokens.queries';
import { toHex } from '@/features/projects/utils/signProjectUpdate';
import { buildCalendarAnnouncementMessage, validateAnnouncement } from '@/shared/calendar';
import { networkFromId } from '@/shared/network';
import type { Project } from '@/shared/projects';
import { useWalletStore, type WalletInstance } from '@/store/wallet-state';

function localInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function initialStart(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return localInput(date);
}
function instant(input: string): string | null {
  const date = new Date(input);
  // Reject invalid local times, including a nonexistent clock time during a DST change.
  return Number.isFinite(date.getTime()) && localInput(date) === input ? date.toISOString() : null;
}
interface PublisherProps {
  ownerAddress: string;
  wallet: NonNullable<WalletInstance>;
  networkId: number;
  projects: Project[];
  onPublished: () => void;
}
function AnnouncementForm({ ownerAddress, wallet, networkId, projects, onPublished }: PublisherProps) {
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const alive = useRef(true);
  const revision = useRef(0);
  const inFlight = useRef(false);
  const [projectId, setProjectId] = useState(projects[0].id);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(initialStart);
  const [endsAt, setEndsAt] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'idle' | 'signing' | 'publishing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const sameWallet = () => {
    const current = useWalletStore.getState();
    return alive.current && current.connected && current.wallet === wallet && current.stakeAddress === ownerAddress && current.networkId === networkId;
  };
  const edit = (setter: (value: string) => void, value: string) => {
    revision.current += 1;
    setter(value);
    setSuccess(null);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || !sameWallet()) return;
    setError(null);
    setSuccess(null);
    const start = instant(startsAt);
    const end = endsAt ? instant(endsAt) : null;
    if (!projects.some((project) => project.id === projectId)) { setError('Choose one of your approved projects.'); return; }
    if (!start || (endsAt && !end)) { setError('Choose a valid local date and time.'); return; }
    const announcement = { title: title.trim(), startsAt: start, endsAt: end, description };
    const problem = validateAnnouncement(announcement);
    if (problem) { setError(problem); return; }
    if (description.length > 1000) { setError('Use a description of at most 1000 characters.'); return; }
    if (Date.parse(start) <= Date.now()) { setError('Choose a start date in the future.'); return; }
    const submittedRevision = revision.current;
    inFlight.current = true;
    setPhase('signing');
    let published = false;
    try {
      const message = await buildCalendarAnnouncementMessage({
        network: DEPLOYMENT_NETWORK, origin: window.location.origin, ownerAddress, projectId, eventId: null,
        announcement, signedAt: new Date().toISOString(),
      });
      if (!sameWallet()) return;
      const { signature, key } = await wallet.signData(ownerAddress, toHex(message));
      if (!sameWallet()) return;
      setPhase('publishing');
      const response = await apiClient.post<{ id: string }>('/api/rewardCalendar', { ownerAddress, projectId, eventId: null, announcement, signature, key, message });
      if (!sameWallet()) return;
      if (!response || typeof response.id !== 'string' || !response.id.startsWith('announcement:')) throw new Error('The server did not confirm the announcement. Refresh the calendar before trying again.');
      published = true;
      const unchanged = revision.current === submittedRevision;
      setSuccess(unchanged ? 'Date published. It is now an announced calendar event.' : 'Date published. Your newer draft edits are kept below.');
      if (unchanged) {
        setTitle(''); setDescription(''); setStartsAt(initialStart()); setEndsAt('');
        if (details.current) details.current.open = false;
      }
    } catch (failure) {
      if (sameWallet()) setError(failure instanceof Error ? failure.message : 'Publishing failed. Review your date and try again.');
    } finally {
      inFlight.current = false;
      if (alive.current) setPhase('idle');
    }
    if (published && sameWallet()) onPublished();
  };
  const control = 'min-h-11 w-full min-w-0 rounded-lg border border-border-default bg-surface-inset px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone';
  return (
    <div className="min-w-0">
      <details ref={details} className="rounded-xl border border-border-subtle bg-surface-raised/40">
        <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-accent-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Publish a date</summary>
        <form onSubmit={submit} className="space-y-4 border-t border-border-subtle p-4" noValidate>
          <p className="text-sm leading-relaxed text-text-secondary">Publish an announced date for your approved project. Your wallet signs the project, date and description before publication.</p>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-project`} className="text-sm text-text-secondary">Project</label>
            <select id={`${id}-project`} className={control} value={projectId} onChange={(event) => edit(setProjectId, event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-title`} className="text-sm text-text-secondary">Title</label>
            <input id={`${id}-title`} className={control} value={title} maxLength={120} required onChange={(event) => edit(setTitle, event.target.value)} />
          </div>
          <p id={`${id}-timezone`} className="text-xs text-text-muted">Dates and times use {timezone}. Published dates are saved as UTC instants.</p>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor={`${id}-start`} className="text-sm text-text-secondary">Start date and time</label>
              <input id={`${id}-start`} type="datetime-local" className={control} aria-describedby={`${id}-timezone`} required value={startsAt} onChange={(event) => edit(setStartsAt, event.target.value)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor={`${id}-end`} className="text-sm text-text-secondary">End date and time (optional)</label>
              <input id={`${id}-end`} type="datetime-local" className={control} aria-describedby={`${id}-timezone`} value={endsAt} onChange={(event) => edit(setEndsAt, event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-description`} className="text-sm text-text-secondary">Description</label>
            <textarea id={`${id}-description`} className={`${control} min-h-24 resize-y`} maxLength={1000} rows={3} value={description} onChange={(event) => edit(setDescription, event.target.value)} />
            <p className="text-xs text-text-muted">{description.length}/1000 characters</p>
          </div>
          {error && <p role="alert" className="break-words text-sm text-status-error-light">{error}</p>}
          <GradientButton type="submit" disabled={phase !== 'idle'} className="w-full sm:w-auto">{phase === 'signing' ? 'Waiting for wallet…' : phase === 'publishing' ? 'Publishing…' : 'Sign and publish'}</GradientButton>
        </form>
      </details>
      {success && <p role="status" className="mt-3 text-sm text-status-success-light">{success}</p>}
    </div>
  );
}

/** Public approved-project ownership gates this form; signing remains an explicit submit action. */
export function PublishAnnouncement({ onPublished }: { onPublished: () => void }) {
  const { connected, wallet, stakeAddress, networkId } = useWalletStore();
  const { data } = usePublicTokens();
  if (!connected || !wallet || !stakeAddress || networkId === null || networkFromId(networkId) !== DEPLOYMENT_NETWORK || data?.scope !== 'public') return null;
  const projects = data.projects.filter((project) => project.status === 'approved' && project.network === DEPLOYMENT_NETWORK && project.ownerAddress === stakeAddress);
  if (projects.length === 0) return null;
  return <AnnouncementForm key={`${stakeAddress}:${networkId}`} ownerAddress={stakeAddress} wallet={wallet} networkId={networkId} projects={projects} onPublished={onPublished} />;
}
