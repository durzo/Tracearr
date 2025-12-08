import { useQuery } from '@tanstack/react-query';
import '@tracearr/shared';
import { api } from '@/lib/api';

export type StatsPeriod = 'day' | 'week' | 'month' | 'year';

export function useDashboardStats(serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'dashboard', serverId],
    queryFn: () => api.stats.dashboard(serverId ?? undefined),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}

export function usePlaysStats(period: StatsPeriod = 'week', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'plays', period, serverId],
    queryFn: () => api.stats.plays(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUserStats(serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'users', serverId],
    queryFn: () => api.stats.users(serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export interface LocationStatsFilters {
  days?: number;
  serverUserId?: string;
  serverId?: string;
  mediaType?: 'movie' | 'episode' | 'track';
}

export function useLocationStats(filters?: LocationStatsFilters) {
  return useQuery({
    queryKey: ['stats', 'locations', filters],
    queryFn: () => api.stats.locations(filters),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function usePlaysByDayOfWeek(period: StatsPeriod = 'month', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'plays-by-dayofweek', period, serverId],
    queryFn: () => api.stats.playsByDayOfWeek(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePlaysByHourOfDay(period: StatsPeriod = 'month', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'plays-by-hourofday', period, serverId],
    queryFn: () => api.stats.playsByHourOfDay(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePlatformStats(period: StatsPeriod = 'month', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'platforms', period, serverId],
    queryFn: () => api.stats.platforms(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useQualityStats(period: StatsPeriod = 'month', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'quality', period, serverId],
    queryFn: () => api.stats.quality(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTopUsers(period: StatsPeriod = 'month', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'top-users', period, serverId],
    queryFn: () => api.stats.topUsers(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTopContent(period: StatsPeriod = 'month', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'top-content', period, serverId],
    queryFn: () => api.stats.topContent(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useConcurrentStats(period: StatsPeriod = 'month', serverId?: string | null) {
  return useQuery({
    queryKey: ['stats', 'concurrent', period, serverId],
    queryFn: () => api.stats.concurrent(period, serverId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
