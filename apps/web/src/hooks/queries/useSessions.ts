import { useQuery } from '@tanstack/react-query';
import '@tracearr/shared';
import { api } from '@/lib/api';

interface SessionsParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  serverId?: string;
  state?: string;
}

export function useSessions(params: SessionsParams = {}) {
  return useQuery({
    queryKey: ['sessions', 'list', params],
    queryFn: () => api.sessions.list(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useActiveSessions(serverId?: string | null) {
  return useQuery({
    queryKey: ['sessions', 'active', serverId],
    queryFn: () => api.sessions.getActive(serverId ?? undefined),
    staleTime: 1000 * 15, // 15 seconds
    refetchInterval: 1000 * 30, // 30 seconds
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['sessions', 'detail', id],
    queryFn: () => api.sessions.get(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute
  });
}
