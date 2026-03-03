'use client';

import { api } from '@/lib';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useSystemHealth(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => api.getSystemHealth(),
    refetchInterval: refetchInterval ?? 10000,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useSystemInfo(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['system', 'info'],
    queryFn: () => api.getSystemInfo(),
    refetchInterval: refetchInterval ?? 1000,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useCleanupOldData() {
  return useMutation({
    mutationFn: (days: number) => api.cleanupOldData(days),
    onSuccess: (data) => {
      toast.success(`已清理 ${data.deletedCount} 条旧数据`);
    },
  });
}
