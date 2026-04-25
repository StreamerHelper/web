export type Platform = 'bilibili' | 'huya' | 'douyu' | 'douyin';
export type RecordingQuality = 'low' | 'medium' | 'high';

export type JobStatus = 'pending' | 'recording' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'stopping';

// Job for browse API (content browsing)
export interface BrowsedJob {
  id: string;
  jobId: string;
  title: string;
  streamerName: string;
  roomName: string;
  platform: Platform;
  status: JobStatus;
  duration: number;
  segmentCount: number;
  startTime: string;
  endTime: string;
  coverUrl?: string | null;
}

// Job group for date-based grouping
export interface JobGroup {
  date: string;
  jobs: BrowsedJob[];
}

// Video segment
export interface VideoSegment {
  index: number;
  filename: string;
  s3Key: string;
  playUrl: string;
  startOffsetMs: number;
  endOffsetMs: number;
  durationMs: number;
}

// Job videos response
export interface JobVideosResponse {
  jobId: string;
  streamerName: string;
  roomName: string;
  platform: Platform;
  duration: number;
  segmentCount: number;
  videos: VideoSegment[];
}

export interface Streamer {
  id: string;
  streamerId: string;
  name: string;
  platform: Platform;
  roomId: string;
  isActive?: boolean;
  coverPath?: string | null;
  coverUrl?: string | null;
  recordSettings?: {
    quality?: RecordingQuality;
    detectHighlights?: boolean;
  };
  uploadSettings?: {
    autoUpload?: boolean;
    rhythm?: {
      mode?: 'complete' | 'segmented';
      intervalMinutes?: number;
    };
    title?: string;
    description?: string;
    tags?: string[];
    humanType2?: number;
    collection?: BilibiliCollectionBinding;
  };
}

export interface BilibiliCollectionBinding {
  autoAdd?: boolean;
  seasonId?: number | null;
  sectionId?: number | null;
  seasonTitle?: string | null;
  sectionTitle?: string | null;
}

export interface StreamStatus {
  isLive: boolean;
  roomId: string;
  streamerId: string;
  title: string;
  viewerCount: number;
  startTime?: Date;
}

export interface Job {
  id: string;
  streamerId: string;
  streamerName: string;
  roomId: string;
  platform: Platform;
  streamUrl: string | null;
  danmakuUrl: string | null;
  status: JobStatus;
  metadata: JobMetadata | null;
  videoPath: string | null;
  danmakuPath: string | null;
  segmentCount: number;
  duration: number;
  startTime: Date | null;
  endTime: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobMetadata {
  stream_url: string;
  danmaku_url: string;
  requestedQuality?: RecordingQuality;
  effectiveQuality?: RecordingQuality;
  qualityApplied?: boolean;
  qualityNote?: string;
  ffmpegRequestedQuality?: RecordingQuality;
  resolution?: string;
  bitrate?: number;
  codec?: string;
  highlights?: Highlight[];
  statistics?: {
    total_chats: number;
    total_gifts: number;
    unique_viewers: number;
  };
}

export interface Highlight {
  start: number;
  end: number;
  score: number;
  reason?: string;
}

export type DanmakuType =
  | 'chat'
  | 'gift'
  | 'sc'
  | 'enter'
  | 'follow'
  | 'share'
  | 'like'
  | 'interact'
  | 'notice'
  | 'unknown';

export type DanmakuPosition = 0 | 1 | 2 | 3 | 4;

export interface DanmakuMessage {
  id: string;
  timestamp: number;
  type: DanmakuType;
  userId: string;
  username: string;
  content?: string;
  position?: DanmakuPosition;
  color?: number;
  contentColor?: number;
  fontSize?: number;
  gift?: {
    giftId: string;
    giftName: string;
    count: number;
    price: number;
    totalPrice: number;
  };
  superChat?: {
    price: number;
    backgroundColor: string;
    borderColor: string;
  };
}

export interface DanmakuQueryResponse {
  messages: DanmakuMessage[];
  total: number;
  hasMore: boolean;
}

export interface ExportTextResponse {
  downloadUrl: string;
  expiresAt: number;
}

export interface SystemHealth {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

export interface SystemInfo {
  timestamp: string;
  jobs: SystemInfoJobs;
  streamers: SystemInfoStreamers;
  queues: Record<string, { waiting: number; active: number }>;
  system: {
    platform: string;
    arch: string;
    version: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
  };
}

export interface SystemInfoJobs {
  total: number;
  pending: number;
  recording: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface SystemInfoStreamers {
  stats: {
    total: number;
    active: number;
    byPlatform: {
      bilibili: number;
      douyu: number;
      huya: number;
      douyin: number;
    };
  };
  live: {
    count: number;
    streamers: Array<{
      id: string;
      streamerId: string;
      name: string;
      platform: Platform;
      title: string;
      viewerCount: number;
      startTime?: Date;
    }>;
  };
  offline: {
    count: number;
    streamers: Array<{
      id: string;
      streamerId: string;
      name: string;
      platform: Platform;
    }>;
  };
  failed: {
    count: number;
    streamers: Array<{
      id: string;
      streamerId: string;
      name: string;
      platform: Platform;
      error: string;
    }>;
  };
}

export interface StreamerStats {
  total: number;
  active: number;
  byPlatform: Record<string, number>;
}

export interface JobStats {
  total: number;
  byStatus: Record<string, number>;
  today?: number;
}

// Bilibili Authentication
export interface BilibiliAccount {
  mid: number;
  name: string;
  face: string;
  sign: string;
  level: number;
  vipType: number;
  vipStatus: number;
}

export interface BilibiliAuthStatus {
  isAuthenticated: boolean;
  mid?: number;
  expiresAt?: string;
  account?: BilibiliAccount | null;
  tokenExpired?: boolean;
}

export interface BilibiliQRCode {
  authCode: string;
  url: string;
  expiresIn: number;
}

export interface BilibiliPollResult {
  status: 'waiting' | 'success' | 'expired';
  message?: string;
  mid?: number;
}

export interface BilibiliUploadResult {
  bvid: string;
  avid: string;
}

// Bilibili Submission
export type SubmissionStatus = 'pending' | 'uploading' | 'submitting' | 'completed' | 'failed';

export interface SubmissionPart {
  index: number;
  title?: string;
  status: string;
  s3Keys?: string[];
  filename?: string;
  cid?: number;
  rhythmIntervalMinutes?: number;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  size?: number;
  error?: string;
  uploadProgress?: number;
}

export interface BilibiliPartition {
  id: number;
  name: string;
  children?: BilibiliPartition[];
}

export interface BilibiliSeasonSection {
  id: number;
  seasonId: number;
  title: string;
  order?: number;
  epCount?: number;
}

export interface BilibiliSeason {
  id: number;
  title: string;
  desc?: string;
  cover?: string;
  state?: number;
  epCount?: number;
  sections: BilibiliSeasonSection[];
}

export interface BilibiliSubmission {
  id: string;
  jobId: string;
  title: string;
  status: SubmissionStatus;
  totalParts: number;
  completedParts: number;
  parts: SubmissionPart[];
  humanType2?: number | null;
  bvid: string | null;
  avid?: number | null;
  collectionAutoAdd?: boolean;
  collectionSeasonId?: number | null;
  collectionSectionId?: number | null;
  collectionSeasonTitle?: string | null;
  collectionSectionTitle?: string | null;
  collectionEpisodeId?: number | null;
  collectionAddedAt?: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionRequest {
  jobId: string;
  title: string;
  description?: string;
  tags?: string[];
  humanType2?: number;
  collection?: BilibiliCollectionBinding;
}

export interface BilibiliSubmissionsResponse {
  items: BilibiliSubmission[];
  total: number;
}

export interface BilibiliPartitionsResponse {
  partitions: BilibiliPartition[];
}

export interface BilibiliSeasonsResponse {
  seasons: BilibiliSeason[];
  total: number;
}

export interface CreateBilibiliSeasonRequest {
  title: string;
  desc?: string;
  cover?: string;
}

export interface CreateBilibiliSeasonResponse {
  season: BilibiliSeason;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
