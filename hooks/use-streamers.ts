'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, queryKeys } from '@/lib';
import type { StreamerFilterValues, StreamerFormValues, Streamer, StreamStatus } from '@/types';

export function useStreamers(filters?: StreamerFilterValues) {
  return useQuery({
    queryKey: queryKeys.streamers(filters),
    queryFn: () => api.getStreamers(filters),
    staleTime: 30000,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useStreamerStats() {
  return useQuery({
    queryKey: queryKeys.streamerStats,
    queryFn: () => api.getStreamerStats(),
    staleTime: 60000,
    retry: 1,
    retryDelay: 1000,
  });
}

// Note: Backend doesn't have a separate GET by ID, use list instead
export function useStreamer(streamerId: string) {
  const streamers = useStreamers();
  return {
    ...streamers,
    data: streamers.data?.find(s => s.streamerId === streamerId),
  };
}

export function useCreateStreamer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createStreamer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streamers'] });
      toast.success('主播添加成功');
    },
  });
}

export function useUpdateStreamer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StreamerFormValues> }) =>
      api.updateStreamer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streamers'] });
      toast.success('主播更新成功');
    },
  });
}

export function useDeleteStreamer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteStreamer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streamers'] });
      toast.success('主播删除成功');
    },
  });
}

export function useCheckStreamStatus() {
  return useMutation({
    mutationFn: (id: string) => api.checkStreamStatus(id),
    onSuccess: (data: StreamStatus) => {
      if (data.isLive) {
        toast.success(`主播正在直播！`, {
          description: data.title,
        });
      } else {
        toast.info(`主播未开播`);
      }
    },
  });
}
