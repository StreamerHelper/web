'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib';
import type { JobFilterValues, Job, Platform } from '@/types';

export function useJobs(filters?: JobFilterValues) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => api.getJobs(filters),
    refetchInterval: (query) => {
      const hasRecording = query.state.data?.data?.some(j => j.status === 'recording');
      return hasRecording ? 5000 : false;
    },
    retry: 1,
    retryDelay: 1000,
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: ['jobs', 'stats'],
    queryFn: () => api.getJobStats(),
    refetchInterval: 10000,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const job = query.state.data;
      return job?.status === 'recording' ? 5000 : false;
    },
    retry: 1,
    retryDelay: 1000,
  });
}

export function useJobBrowse(filters?: { streamerName?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['jobs', 'browse', filters],
    queryFn: () => api.getJobBrowse(filters),
    retry: 1,
    retryDelay: 1000,
  });
}

export function useJobStreamers() {
  return useQuery({
    queryKey: ['jobs', 'streamers'],
    queryFn: () => api.getJobStreamers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 1000,
  });
}

export function useJobVideos(jobId: string | null) {
  return useQuery({
    queryKey: ['jobs', jobId, 'videos'],
    queryFn: () => api.getJobVideos(jobId!),
    enabled: !!jobId,
    staleTime: 10 * 60 * 1000, // 10 minutes - playUrl is valid for 12 hours
    retry: 1,
    retryDelay: 1000,
  });
}

export function useStartRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { streamerId: string; platform: Platform }) =>
      api.startRecording(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('录制任务已创建');
    },
  });
}

export function useStopRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.stopRecording(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('录制已停止');
    },
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.retryJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('任务已重试');
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('任务已删除');
    },
  });
}
