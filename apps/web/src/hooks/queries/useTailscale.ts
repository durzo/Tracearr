import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TailscaleInfo } from '@tracearr/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useTailscaleStatus() {
  return useQuery({
    queryKey: ['tailscale', 'status'],
    queryFn: api.tailscale.getStatus,
    staleTime: 1000 * 10,
    // Poll during transitional states
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'starting' || status === 'awaiting_auth' || status === 'stopping') {
        return 3000;
      }
      // Slow poll when connected to pick up key expiry changes
      if (status === 'connected') {
        return 30_000;
      }
      return false;
    },
  });
}

export function useTailscaleLogs(enabled: boolean) {
  return useQuery({
    queryKey: ['tailscale', 'logs'],
    queryFn: async () => {
      const res = await api.tailscale.getLogs();
      return res.logs;
    },
    enabled,
    refetchInterval: enabled ? 5000 : false,
  });
}

export function useEnableTailscale() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hostname?: string) => api.tailscale.enable(hostname),
    onSuccess: (data) => {
      queryClient.setQueryData<TailscaleInfo>(['tailscale', 'status'], data);
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => {
      toast.error(t('tailscale.toast.enableFailed'), { description: err.message });
    },
  });
}

export function useDisableTailscale() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.tailscale.disable,
    onSuccess: (data) => {
      queryClient.setQueryData<TailscaleInfo>(['tailscale', 'status'], data);
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success(t('tailscale.toast.disabled'));
    },
    onError: (err) => {
      toast.error(t('tailscale.toast.disableFailed'), { description: err.message });
    },
  });
}

export function useSetExitNode() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => api.tailscale.setExitNode(id),
    onSuccess: (data) => {
      queryClient.setQueryData<TailscaleInfo>(['tailscale', 'status'], data);
      toast.success(t('tailscale.toast.exitNodeSet'));
    },
    onError: (err) => {
      toast.error(t('tailscale.toast.exitNodeFailed'), { description: err.message });
    },
  });
}

export function useResetTailscale() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.tailscale.reset,
    onSuccess: (data) => {
      queryClient.setQueryData<TailscaleInfo>(['tailscale', 'status'], data);
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success(t('tailscale.toast.reset'));
    },
    onError: (err) => {
      toast.error(t('tailscale.toast.resetFailed'), { description: err.message });
    },
  });
}
