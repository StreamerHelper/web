import type {
  BilibiliCollectionBinding,
  JobStatus,
  Platform,
  RecordingQuality,
} from './entities';

export interface UploadSettings {
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
}

export interface StreamerFormValues {
  streamerId: string;
  name: string;
  platform: Platform;
  roomId: string;
  isActive: boolean;
  coverPath?: string | null;
  coverUrl?: string | null;
  coverDataUrl?: string;
  removeCover?: boolean;
  recordSettings: {
    quality?: RecordingQuality;
    detectHighlights?: boolean;
  };
  uploadSettings?: UploadSettings;
}

export interface JobFilterValues {
  id?: string;
  status?: JobStatus;
  streamerId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface StreamerFilterValues {
  platform?: Platform;
  isActive?: boolean;
  search?: string;
}
