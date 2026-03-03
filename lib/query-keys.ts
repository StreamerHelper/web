import type { Platform, JobStatus, JobFilterValues, StreamerFilterValues } from '@/types';

// Query keys factory
export const queryKeys = {
  // System
  systemHealth: ['system', 'health'] as const,
  systemInfo: ['system', 'info'] as const,

  // Streamers
  streamers: (filters?: StreamerFilterValues) => ['streamers', filters] as const,
  streamer: (id: string) => ['streamer', id] as const,
  streamerStats: ['streamers', 'stats'] as const,

  // Jobs
  jobs: (filters?: JobFilterValues) => ['jobs', filters] as const,
  job: (id: string) => ['job', id] as const,
  jobStats: ['jobs', 'stats'] as const,
} as const;
