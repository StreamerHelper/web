export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000,
};

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  STREAMERS: '/streamers',
  STREAMER_DETAIL: (id: string) => `/streamers/${id}`,
  JOBS: '/jobs',
  JOB_DETAIL: (id: string) => `/jobs/${id}`,
  SYSTEM: '/system',
  CONTENT: '/content',
  SETTINGS: '/settings',
  BILIBILI: '/bilibili',
} as const;

export const PLATFORM_COLORS = {
  bilibili: '#FB7299',
  huya: '#FF9900',
  douyu: '#FF6600',
  douyin: '#111827',
} as const;

export const PLATFORM_ROOM_URLS = {
  bilibili: (roomId: string) => `https://live.bilibili.com/${roomId}`,
  huya: (roomId: string) => `https://www.huya.com/${roomId}`,
  douyu: (roomId: string) => `https://www.douyu.com/${roomId}`,
  douyin: (roomId: string) => `https://live.douyin.com/${roomId}`,
} as const;

export const QUALITY_OPTIONS = [
  { value: 'low', label: '低画质', description: '优先省流量，命中平台低档画质' },
  { value: 'medium', label: '中画质', description: '默认档位，兼顾清晰度与稳定性' },
  { value: 'high', label: '高画质', description: '优先原画或平台最高可用档位' },
] as const;

export const QUALITY_LABELS = {
  low: '低画质',
  medium: '中画质',
  high: '高画质',
} as const;

export const REFRESH_INTERVALS = {
  DASHBOARD: 5000,
  JOBS_RECORDING: 5000,
  SYSTEM: 10000,
} as const;
