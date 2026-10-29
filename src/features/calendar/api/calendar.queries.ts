import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { CalendarEvent, CalendarResponse } from '@/shared/calendar';
import { monthRange } from '../utils/calendar';

export function useRewardCalendar(month: Date) {
  const range = monthRange(month);
  return useQuery<CalendarResponse, Error>({
    queryKey: ['reward-calendar', DEPLOYMENT_NETWORK, range.from, range.to],
    queryFn: async () => {
      const data = await apiClient.get<CalendarResponse>(`/api/rewardCalendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
      if (!data || data.network !== DEPLOYMENT_NETWORK || !Array.isArray(data.events) || !data.sources) throw new Error('Calendar dates are temporarily unavailable. Please try again.');
      const events = data.events.filter((event): event is CalendarEvent => Boolean(event && typeof event.id === 'string' && typeof event.title === 'string' && Number.isFinite(Date.parse(event.startsAt)) && (event.certainty === 'confirmed' || event.certainty === 'estimated')));
      return { ...data, events };
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useReminderConfig() {
  return useQuery<{ available: boolean; publicKey: string | null }, Error>({
    queryKey: ['reward-reminder-config', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get('/api/rewardReminders'), staleTime: 60_000,
  });
}
