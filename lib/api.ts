import type {
  Job,
  JobBrowseFilterValues,
  JobFilterValues,
  JobStats,
  Platform,
  Streamer,
  StreamerFormValues,
  StreamerStats,
  StreamStatus,
  SystemInfo,
  JobGroup,
  JobVideosResponse,
  DanmakuQueryResponse,
  TranscriptQueryResponse,
  ExportTextResponse,
  AsrModelsResponse,
  AsrSettings,
  UpdateAsrSettingsRequest,
  BilibiliAuthStatus,
  BilibiliQRCode,
  BilibiliPollResult,
  DouyinAuthStatus,
  DouyinBrowserLoginInteraction,
  DouyinBrowserLoginStatus,
  DouyinProfileVerification,
  BilibiliSubmission,
  BilibiliSubmissionsResponse,
  BilibiliPartitionsResponse,
  BilibiliSeasonsResponse,
  CreateSubmissionRequest,
  CreateBilibiliSeasonRequest,
  CreateBilibiliSeasonResponse,
  PaginatedResponse,
} from '@/types';
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { API_CONFIG } from './constants';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  platform?: string;
}

type ApiRequestConfig = AxiosRequestConfig & {
  silentError?: boolean;
};

const client = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const isNetworkError = !error.response && error.code;
    if (isNetworkError) {
      return Promise.reject(error);
    }
    if ((error.config as ApiRequestConfig | undefined)?.silentError) {
      return Promise.reject(error);
    }
    const message = error.response?.data?.error || error.response?.data?.message || error.message || '请求失败';
    const detail = [error.response?.data?.platform, error.response?.data?.code]
      .filter(Boolean)
      .join(' / ');
    toast.error(message, detail ? { description: detail } : undefined);
    return Promise.reject(error);
  }
);

export default client;

export const api = {
  getSystemHealth: async () => (await client.get<{ status: string; timestamp: string; uptime: number }>('/api/system/health')).data,
  getSystemInfo: async () => (await client.get<SystemInfo>('/api/system/info')).data,
  getAsrSettings: async () =>
    (await client.get<AsrSettings>('/api/system/asr-settings')).data,
  getAsrModels: async () =>
    (
      await client.get<AsrModelsResponse>('/api/system/asr-models', {
        silentError: true,
      } as ApiRequestConfig)
    ).data,
  updateAsrSettings: async (data: UpdateAsrSettingsRequest) =>
    (await client.post<AsrSettings>('/api/system/asr-settings', data)).data,
  cleanupOldData: async (days: number) => (await client.post<{ success: boolean; deletedCount: number; message: string }>(`/api/system/cleanup?days=${days}`)).data,

  getStreamers: async (filters?: { platform?: Platform; isActive?: boolean }) => {
    const response = await client.get<{ streamers: Streamer[]; total: number }>('/api/streamers', { params: filters });
    return response.data.streamers;
  },
  getStreamerStats: async () => (await client.get<StreamerStats>('/api/streamers/stats')).data,
  getStreamer: async (id: string) => (await client.get<Streamer>(`/api/streamers/${id}`)).data,
  createStreamer: async (data: StreamerFormValues) =>
    (await client.post<Streamer>('/api/streamers', data)).data,
  updateStreamer: async (id: string, data: Partial<StreamerFormValues>) =>
    (await client.put<Streamer>(`/api/streamers/${id}`, data)).data,
  deleteStreamer: async (id: string) =>
    (await client.post<{ success: boolean; message: string }>(`/api/streamers/${id}/delete`)).data,
  checkStreamStatus: async (id: string, options?: { silentError?: boolean }) => {
    const response = await client.post<{ streamer: Streamer; status: StreamStatus }>(
      `/api/streamers/${id}/check`,
      undefined,
      { silentError: options?.silentError } as ApiRequestConfig
    );
    return response.data.status;
  },

  getJobs: async (filters?: JobFilterValues) => {
    const params: Record<string, string | number> = {};
    if (filters?.id) params.id = filters.id;
    if (filters?.status) params.status = filters.status;
    if (filters?.streamerId) params.streamerId = filters.streamerId;
    if (filters?.pageSize) params.limit = filters.pageSize;
    if (filters?.page) params.offset = (filters.page - 1) * (filters.pageSize || 50);
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await client.get<{ jobs: Job[]; total: number; limit: number; offset: number }>('/api/jobs', { params });
    return {
      data: response.data.jobs,
      total: response.data.total,
      page: Math.floor(response.data.offset / response.data.limit) + 1,
      pageSize: response.data.limit,
    };
  },
  getJobStats: async () => (await client.get<JobStats>('/api/jobs/stats')).data,
  getJob: async (id: string) => (await client.get<Job>(`/api/jobs/${id}`)).data,
  startRecording: async (data: { streamerId: string; platform: Platform }) =>
    (await client.post<{ jobId: string; streamerId: string; platform: string; status: string }>('/api/jobs/start', data)).data,
  stopRecording: async (id: string) =>
    (await client.post<{ success: boolean; status: string; message: string }>(`/api/jobs/${id}/stop`)).data,
  retryJob: async (id: string) =>
    (await client.post<{ newJobId: string }>(`/api/jobs/${id}/retry`)).data,
  deleteJob: async (id: string) =>
    (await client.post<{ success: boolean; message: string; deletedKeys?: number }>(`/api/jobs/${id}/delete`)).data,

  // Content browsing
  getJobBrowse: async (
    filters?: JobBrowseFilterValues
  ): Promise<PaginatedResponse<JobGroup>> => {
    const params: Record<string, string | number> = {};
    if (filters?.streamerName) params.streamerName = filters.streamerName;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.minSegmentCount !== undefined) {
      params.minSegmentCount = filters.minSegmentCount;
    }
    if (filters?.pageSize) params.limit = filters.pageSize;
    if (filters?.page) {
      params.offset = (filters.page - 1) * (filters.pageSize || 24);
    }

    const response = await client.get<{
      groups: JobGroup[];
      total: number;
      limit: number;
      offset: number;
    }>('/api/jobs/browse', { params });

    return {
      data: response.data.groups,
      total: response.data.total,
      page: Math.floor(response.data.offset / response.data.limit) + 1,
      pageSize: response.data.limit,
    };
  },
  getJobStreamers: async () => {
    const response = await client.get<{ streamers: string[] }>('/api/jobs/streamers');
    return response.data.streamers;
  },
  getJobVideos: async (id: string) => {
    const response = await client.get<JobVideosResponse>(`/api/jobs/${id}/videos`);
    return response.data;
  },
  getDanmaku: async (params: {
    jobId: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }) => (await client.get<DanmakuQueryResponse>('/api/text/danmaku', { params })).data,
  getTranscript: async (params: {
    jobId: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }) =>
    (await client.get<TranscriptQueryResponse>('/api/text/transcript', { params }))
      .data,
  exportText: async (data: {
    jobId: string;
    type: 'danmaku' | 'transcript';
    format: 'xml' | 'json' | 'jsonl' | 'ass' | 'txt' | 'srt' | 'vtt';
  }) => (await client.post<ExportTextResponse>('/api/text/export', data)).data,

  // Generic methods
  post: async <T>(url: string, data?: unknown) => {
    const response = await client.post<T>(url, data);
    return response.data;
  },

  // Bilibili authentication
  getBilibiliAuthStatus: async () =>
    (await client.get<BilibiliAuthStatus>('/api/bilibili/auth/status')).data,
  getBilibiliQRCode: async () =>
    (await client.post<BilibiliQRCode>('/api/bilibili/auth/qrcode')).data,
  pollBilibiliQRCode: async (authCode: string) =>
    (await client.post<BilibiliPollResult>('/api/bilibili/auth/poll', { authCode })).data,
  logoutBilibili: async () =>
    (await client.post<{ success: boolean }>('/api/bilibili/auth/logout')).data,

  // Douyin authentication
  getDouyinAuthStatus: async () =>
    (await client.get<DouyinAuthStatus>('/api/douyin/auth/status')).data,
  verifyDouyinProfile: async (data?: { roomId?: string }) =>
    (await client.post<DouyinProfileVerification>('/api/douyin/auth/verify', data || {})).data,
  startDouyinBrowserLogin: async (data?: {
    roomId?: string;
    fresh?: boolean;
  }) =>
    (await client.post<DouyinBrowserLoginStatus>('/api/douyin/auth/browser-login', data || {})).data,
  getDouyinBrowserLoginStatus: async (sessionId: string) =>
    (await client.get<DouyinBrowserLoginStatus>(`/api/douyin/auth/browser-login/${encodeURIComponent(sessionId)}`)).data,
  interactWithDouyinBrowserLogin: async (
    sessionId: string,
    interaction: DouyinBrowserLoginInteraction
  ) =>
    (
      await client.post<DouyinBrowserLoginStatus>(
        `/api/douyin/auth/browser-login/${encodeURIComponent(sessionId)}/interact`,
        interaction
      )
    ).data,
  cancelDouyinBrowserLogin: async (sessionId: string) =>
    (await client.post<{ success: boolean }>(`/api/douyin/auth/browser-login/${encodeURIComponent(sessionId)}/cancel`)).data,
  getDouyinBrowserLoginScreenshotUrl: (sessionId: string, cacheKey?: string | number) => {
    const path = `/api/douyin/auth/browser-login/${encodeURIComponent(sessionId)}/screenshot`;
    const suffix = cacheKey === undefined ? '' : `?t=${encodeURIComponent(String(cacheKey))}`;
    const baseURL = API_CONFIG.baseURL.replace(/\/$/, '');
    return `${baseURL}${path}${suffix}`;
  },
  logoutDouyin: async () =>
    (await client.post<{ success: boolean }>('/api/douyin/auth/logout')).data,

  // Bilibili submission
  createBilibiliSubmission: async (data: CreateSubmissionRequest) =>
    (await client.post<BilibiliSubmission>('/api/bilibili/submission', data)).data,
  getBilibiliSubmission: async (id: string) =>
    (await client.get<BilibiliSubmission>(`/api/bilibili/submission/${id}`)).data,
  regenerateBilibiliSubmission: async (id: string) =>
    (await client.post<BilibiliSubmission>(`/api/bilibili/submission/${id}/regenerate`)).data,
  getBilibiliSubmissions: async (params?: { page?: number; pageSize?: number; jobId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.jobId) searchParams.set('jobId', params.jobId);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return (await client.get<BilibiliSubmissionsResponse>(`/api/bilibili/submission${query ? `?${query}` : ''}`)).data;
  },
  getBilibiliPartitions: async (options?: { refresh?: boolean }) =>
    (
      await client.get<BilibiliPartitionsResponse>(
        '/api/bilibili/upload/partitions',
        {
          params: options?.refresh ? { refresh: 1, _: Date.now() } : undefined,
        }
      )
    ).data,
  getBilibiliSeasons: async (options?: { refresh?: boolean }) =>
    (
      await client.get<BilibiliSeasonsResponse>('/api/bilibili/seasons', {
        params: options?.refresh ? { refresh: 1, _: Date.now() } : undefined,
      })
    ).data,
  createBilibiliSeason: async (data: CreateBilibiliSeasonRequest) =>
    (await client.post<CreateBilibiliSeasonResponse>('/api/bilibili/seasons', data)).data,
};
