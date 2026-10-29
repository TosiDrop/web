import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarResponse } from '@/shared/calendar';
import * as calendarUtils from '@/features/calendar/utils/calendar';

const state = vi.hoisted(() => ({ data: undefined as CalendarResponse | undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() }));
vi.mock('@/features/calendar/api/calendar.queries', () => ({
  useRewardCalendar: () => state,
  useReminderConfig: () => ({ data: { available: false, publicKey: null } }),
}));
vi.mock('@/features/tokens/api/tokens.queries', () => ({ usePublicTokens: () => ({ data: { projects: [] } }) }));
import CalendarPage from '../CalendarPage';

function page() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/calendar?month=2026-11']}><CalendarPage /></MemoryRouter></QueryClientProvider>);
}

describe('reward calendar', () => {
  beforeEach(() => {
    state.isLoading = false; state.error = null; state.refetch.mockReset();
    state.data = {
      network: 'preview', generatedAt: '2026-10-29T12:00:00Z', sources: { announcements: 'available', epochs: 'available' },
      events: [
        { id: 'a', title: 'TOSI weekly rewards', startsAt: '2026-11-04T15:00:00Z', endsAt: null, certainty: 'confirmed', kind: 'distribution', projectId: 'p1', projectName: 'TosiDrop', tokenId: 'tosi', description: 'Published by the project.', url: '/tokens/tosi' },
        { id: 'b', title: 'Epoch 1500 begins', startsAt: '2026-11-05T21:00:00Z', endsAt: null, certainty: 'estimated', kind: 'epoch', projectId: null, projectName: null, tokenId: null, description: 'A planning estimate.', url: '/claim' },
      ],
    };
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows announced and estimated events with a visible timezone', () => {
    page();
    expect(screen.getByRole('heading', { name: 'Reward calendar', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('TOSI weekly rewards')).toBeInTheDocument();
    expect(screen.getByText('Epoch 1500 begins')).toBeInTheDocument();
    expect(screen.getByText(/Times shown in/)).toBeInTheDocument();
    expect(screen.getByText('Announced date')).toBeInTheDocument();
    expect(screen.getByText('Epoch estimate')).toBeInTheDocument();
  });

  it('combines project and certainty filters and clears them', () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Announced' }));
    expect(screen.queryByText('Epoch 1500 begins')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p1' } });
    expect(screen.getByText('TOSI weekly rewards')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Epoch 1500 begins')).toBeInTheDocument();
  });

  it('navigates months and provides an accessible event detail action', () => {
    page();
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'View TOSI weekly rewards' }));
    expect(screen.getByText('Published by the project.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add this date to calendar' })).toBeInTheDocument();
  });

  it('gives a retry action when calendar retrieval fails', () => {
    state.error = new Error('Temporary failure'); state.data = undefined;
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });

  it('exports the selected day rather than other dates in the month', () => {
    const download = vi.spyOn(calendarUtils, 'downloadCalendar').mockImplementation(() => {});
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    fireEvent.click(screen.getByRole('button', { name: /Wednesday, November 4, 2026, 1 date/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add dates to calendar' }));
    expect(download).toHaveBeenCalledWith([state.data!.events[0]]);
  });

  it('labels certainty inside month cells before a date is opened', () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    const announced = screen.getByRole('button', { name: /Wednesday, November 4, 2026, 1 date/ });
    const estimated = screen.getByRole('button', { name: /Thursday, November 5, 2026, 1 date/ });
    expect(within(announced).getByText('Announced')).toBeInTheDocument();
    expect(within(estimated).getByText('Estimate')).toBeInTheDocument();
  });

  it('explains empty and unavailable sources without inventing dates', () => {
    state.data = { ...state.data!, events: [], sources: { announcements: 'unavailable', epochs: 'unavailable' } };
    page();
    expect(screen.getByText('No dates to show yet')).toBeInTheDocument();
    expect(screen.getByText(/Some calendar sources are temporarily unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add dates to calendar' })).toBeDisabled();
  });
});
