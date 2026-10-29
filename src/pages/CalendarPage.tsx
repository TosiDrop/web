import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconCalendarMonth, IconChevronDown, IconChevronLeft, IconChevronRight, IconDownload, IconList, IconRefresh } from '@tabler/icons-react';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { useRewardCalendar } from '@/features/calendar/api/calendar.queries';
import { EventReminder } from '@/features/calendar/components/EventReminder';
import { PublishAnnouncement } from '@/features/calendar/components/PublishAnnouncement';
import { dayKey, downloadCalendar, groupCalendarEvents, monthDays } from '@/features/calendar/utils/calendar';
import type { CalendarEvent } from '@/shared/calendar';
import { cn } from '@/lib/utils';

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-default px-3 text-sm font-medium text-text-secondary transition hover:border-border-strong hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-50';
const field = 'min-h-11 rounded-lg border border-border-default bg-surface-inset px-3 text-sm text-text-primary';

function monthFrom(value: string | null, eventDate: string | null): Date {
  if (value && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) return new Date(Number(value.slice(0, 4)), Number(value.slice(5)) - 1, 1);
  if (eventDate && /^20\d{2}-/.test(eventDate) && Number.isFinite(Date.parse(eventDate))) {
    const date = new Date(eventDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function EventRow({ event, expanded, onToggle }: { event: CalendarEvent; expanded: boolean; onToggle: () => void }) {
  const detailId = `calendar-detail-${event.id}`;
  const safeUrl = event.url.startsWith('/') && !event.url.startsWith('//') ? event.url : '/calendar';
  return (
    <li className="border-t border-border-subtle first:border-t-0">
      <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailId} aria-label={`View ${event.title}`} className="group flex min-h-20 w-full items-start gap-3 rounded-lg px-3 py-4 text-left transition hover:bg-surface-inset sm:gap-5 sm:px-4">
        <time dateTime={event.startsAt} className="w-16 shrink-0 pt-0.5 text-sm tabular-nums text-text-muted">{new Date(event.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">{event.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
            <span className={event.certainty === 'confirmed' ? 'text-cream-light' : 'text-status-pending-light'}>{event.certainty === 'confirmed' ? 'Announced date' : 'Epoch estimate'}</span>
            {event.projectName && <span>{event.projectName}</span>}
          </span>
        </span>
        <IconChevronDown size={17} stroke={1.7} aria-hidden className={cn('mt-1 shrink-0 text-text-muted transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && <div id={detailId} className="space-y-4 px-3 pb-5 sm:pl-[6.25rem] sm:pr-5">
        {event.description && <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">{event.description}</p>}
        {event.certainty === 'estimated' && <p className="max-w-prose text-sm leading-6 text-text-muted">This date is an estimate based on epoch timing. The project determines when rewards become available.</p>}
        {event.endsAt && <p className="text-xs text-text-muted">Ends {new Date(event.endsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => downloadCalendar([event])}><IconDownload size={16} aria-hidden />Add this date to calendar</button>
          <Link to={safeUrl} className={button}>{event.tokenId ? 'View token' : 'View rewards'}</Link>
        </div>
        <EventReminder event={event} />
      </div>}
    </li>
  );
}

export default function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const month = monthFrom(params.get('month'), params.get('date'));
  const project = params.get('project') ?? '';
  const certainty = params.get('dates') === 'confirmed' || params.get('dates') === 'estimated' ? params.get('dates')! : '';
  const view = params.get('view') === 'month' ? 'month' : 'agenda';
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(() => params.get('event'));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, isLoading, error, refetch } = useRewardCalendar(month);
  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    setParams(next); setSelectedDay(null); setExpanded(null);
  };
  const changeMonth = (date: Date) => update('month', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  const monthKey = dayKey(month, timeZone).slice(0, 7);
  const events = useMemo(() => (data?.events ?? []).filter((event) =>
    dayKey(new Date(event.startsAt), timeZone).startsWith(monthKey) && (!project || event.projectId === project) && (!certainty || event.certainty === certainty)), [data?.events, monthKey, timeZone, project, certainty]);
  const groups = useMemo(() => groupCalendarEvents(events, timeZone), [events, timeZone]);
  const byDay = new Map(groups.map((group) => [group.key, group.events]));
  const projects = Array.from(new Map((data?.events ?? []).filter((event) => event.projectId && event.projectName).map((event) => [event.projectId!, event.projectName!]))).sort((a, b) => a[1].localeCompare(b[1]));
  const visibleGroups = selectedDay ? groups.filter((group) => group.key === selectedDay) : groups;
  const exportEvents = selectedDay ? events.filter((event) => dayKey(new Date(event.startsAt), timeZone) === selectedDay) : events;
  const filtered = Boolean(project || certainty || selectedDay);
  const clearFilters = () => { const next = new URLSearchParams(params); next.delete('project'); next.delete('dates'); setParams(next); setSelectedDay(null); };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Reward calendar</h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-text-muted">Keep track of announced rewards and upcoming epochs. Pick a date to see the details and set a reminder.</p>
        </div>
        <button type="button" className={button} disabled={!exportEvents.length} onClick={() => downloadCalendar(exportEvents)}><IconDownload size={17} stroke={1.7} aria-hidden />Add dates to calendar</button>
      </div>

      <section aria-label="Calendar controls" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button type="button" className={cn(button, 'w-11 px-0')} aria-label="Previous month" onClick={() => changeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><IconChevronLeft size={18} aria-hidden /></button>
              <button type="button" className={cn(button, 'w-11 px-0')} aria-label="Next month" onClick={() => changeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><IconChevronRight size={18} aria-hidden /></button>
            </div>
            <h2 className="min-w-40 text-xl font-semibold text-text-primary">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <button type="button" className={button} onClick={() => changeMonth(new Date())}>Today</button>
          </div>
          <div className="hidden items-center rounded-lg border border-border-default p-1 md:flex" aria-label="Calendar view">
            {([{ value: 'agenda', label: 'Agenda', icon: IconList }, { value: 'month', label: 'Month', icon: IconCalendarMonth }] as const).map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={view === value} onClick={() => update('view', value)} className={cn('inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm', view === value ? 'bg-accent/[0.12] text-accent-light' : 'text-text-muted hover:text-text-primary')}><Icon size={17} stroke={1.7} aria-hidden />{label}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-text-muted sm:max-w-64">Project<select aria-label="Project" value={project} onChange={(event) => update('project', event.target.value)} className={field}><option value="">All projects</option>{projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <div className="flex min-h-11 flex-wrap items-center gap-1" aria-label="Date type">
            {([{ value: '', label: 'All dates' }, { value: 'confirmed', label: 'Announced' }, { value: 'estimated', label: 'Estimates' }] as const).map(({ value, label }) => <button key={value} type="button" aria-pressed={certainty === value} onClick={() => update('dates', value)} className={cn('min-h-11 rounded-lg px-3 text-sm transition', certainty === value ? 'bg-accent/[0.12] font-medium text-accent-light' : 'text-text-muted hover:bg-surface-inset hover:text-text-primary')}>{label}</button>)}
          </div>
          {filtered && <button type="button" className="min-h-11 px-2 text-sm font-medium text-accent-light hover:underline" onClick={clearFilters}>Clear filters</button>}
        </div>
        <p className="text-xs leading-5 text-text-muted">Times shown in {timeZone.replaceAll('_', ' ')}. Announced dates come from projects; epoch estimates can change.</p>
      </section>

      {isLoading ? <div role="status" aria-label="Loading reward calendar" className="space-y-3">{[0, 1, 2].map((id) => <div key={id} className="skeleton-shimmer h-24 rounded-xl" />)}</div>
        : error ? <DataUnavailable title="Calendar dates are unavailable" message="Your calendar could not be loaded. Please try again." onRetry={() => { void refetch(); }} />
          : <>
            {data && (data.sources.announcements === 'unavailable' || data.sources.epochs === 'unavailable') && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-surface-inset px-4 py-3"><p className="max-w-prose text-sm leading-6 text-text-muted">Some calendar sources are temporarily unavailable. The dates below are the ones we could retrieve.</p><button type="button" className={button} onClick={() => { void refetch(); }}><IconRefresh size={15} aria-hidden />Retry sources</button></div>}
            {view === 'month' && <div className="hidden overflow-hidden rounded-xl border border-border-default md:block" aria-label="Month calendar">
              <div className="grid grid-cols-7 border-b border-border-subtle bg-surface-inset">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day} className="px-3 py-3 text-center text-xs font-medium text-text-muted">{day}</span>)}</div>
              <div className="grid grid-cols-7">{monthDays(month).map((date) => {
                const key = dayKey(date, timeZone); const items = byDay.get(key) ?? []; const inMonth = date.getMonth() === month.getMonth(); const today = key === dayKey(new Date(), timeZone);
                return <button key={key} type="button" disabled={!inMonth} aria-pressed={selectedDay === key} aria-label={`${date.toLocaleDateString(undefined, { dateStyle: 'full' })}, ${items.length} dates`} onClick={() => { setSelectedDay(selectedDay === key ? null : key); setExpanded(null); }} className={cn('min-h-24 min-w-0 border-b border-r border-border-subtle p-2 text-left transition last:border-r-0 hover:bg-surface-inset disabled:cursor-default disabled:opacity-30', selectedDay === key && 'bg-accent/[0.09]')}><span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full text-xs tabular-nums', today ? 'bg-accent font-semibold text-accent-contrast' : 'text-text-secondary')}>{date.getDate()}</span>{items.length > 0 && <span className="mt-1 block truncate rounded-md bg-surface-inset px-1.5 py-1 text-xs text-text-secondary">{items[0]!.title}</span>}{items.length > 1 && <span className="mt-1 block text-xs text-text-muted">+{items.length - 1} more</span>}</button>;
              })}</div>
            </div>}

            {visibleGroups.length ? <div className="space-y-6" aria-label="Upcoming reward dates">{visibleGroups.map(({ key, events: items }) => <section key={key} aria-label={key}>
              <h3 className="mb-2 text-sm font-semibold text-text-secondary">{new Date(items[0]!.startsAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}{key === dayKey(new Date(), timeZone) && <span className="ml-2 text-xs text-accent-light">Today</span>}</h3>
              <ul className="overflow-hidden rounded-xl border border-border-default bg-surface-raised">{items.map((event) => <EventRow key={event.id} event={event} expanded={expanded === event.id} onToggle={() => setExpanded(expanded === event.id ? null : event.id)} />)}</ul>
            </section>)}</div> : <div className="rounded-xl border border-border-default px-5 py-10 text-center sm:py-14"><IconCalendarMonth size={30} stroke={1.5} className="mx-auto text-text-muted" aria-hidden /><h3 className="mt-4 text-lg font-semibold text-text-primary">{filtered ? 'No dates match these filters' : 'No dates to show yet'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">{filtered ? 'Clear the filters or choose another month to see more dates.' : 'Project announcements and epoch estimates will appear here when they are available.'}</p>{filtered && <button type="button" className={cn(button, 'mt-5')} onClick={clearFilters}>Show all dates</button>}</div>}
          </>}
      <PublishAnnouncement onPublished={() => { void refetch(); }} />
    </div>
  );
}
