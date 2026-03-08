import type { JobStatus, Platform } from './entities';

export interface UploadSettings {
  autoUpload?: boolean;
  title?: string;
  description?: string;
  tags?: string[];
  tid?: number;
}

export interface StreamerFormValues {
  streamerId: string;
  name: string;
  platform: Platform;
  roomId: string;
  isActive: boolean;
  recordSettings: {
    quality?: string;
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
