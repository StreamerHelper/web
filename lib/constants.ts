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
} as const;

export const PLATFORM_ROOM_URLS = {
  bilibili: (roomId: string) => `https://live.bilibili.com/${roomId}`,
  huya: (roomId: string) => `https://www.huya.com/${roomId}`,
  douyu: (roomId: string) => `https://www.douyu.com/${roomId}`,
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

export const BILIBILI_CATEGORIES = [
  { value: 171, label: '生活 - 其他' },
  { value: 138, label: '娱乐 - 搞笑' },
  { value: 139, label: '娱乐 - 美食圈' },
  { value: 250, label: '生活 - 美食制作' },
  { value: 251, label: '生活 - 出行' },
  { value: 252, label: '生活 - 萌宠' },
  { value: 253, label: '生活 - 手工' },
  { value: 254, label: '生活 - 绘画' },
  { value: 255, label: '生活 - 运动' },
  { value: 256, label: '生活 - 其他' },
  { value: 21, label: '科技 - 电子竞技' },
  { value: 22, label: '科技 - 单机游戏' },
  { value: 23, label: '科技 - 网络游戏' },
  { value: 24, label: '科技 - 手机游戏' },
  { value: 25, label: '科技 - 桌游棋牌' },
  { value: 26, label: '科技 - 音乐' },
  { value: 27, label: '科技 - 舞蹈' },
  { value: 28, label: '科技 - 科技' },
  { value: 29, label: '科技 - 数码' },
  { value: 30, label: '科技 - 汽车' },
  { value: 31, label: '时尚 - 美妆' },
  { value: 32, label: '时尚 - 服饰' },
  { value: 33, label: '时尚 - 健身' },
  { value: 34, label: '时尚 - 资讯' },
  { value: 35, label: '知识 - 科学科普' },
  { value: 36, label: '知识 - 人文历史' },
  { value: 37, label: '知识 - 财经商业' },
  { value: 38, label: '知识 - 校园学习' },
  { value: 39, label: '知识 - 职场' },
  { value: 40, label: '知识 - 设计' },
  { value: 41, label: '知识 - 野生技能' },
] as const;
