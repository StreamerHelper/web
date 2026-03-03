import type { JobStatus, Platform } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * Format relative time (e.g., "5分钟前")
 * Handles timezone properly
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  // Parse date - ensure strings without timezone are treated as local time
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '-';

  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: zhCN,
  });
}

/**
 * Format duration in milliseconds to HH:MM:SS or MM:SS
 */
export function formatDuration(milliseconds: number): string {
  if (!milliseconds || milliseconds < 0) return '0:00';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get platform color
 */
export function getPlatformColor(platform: Platform): string {
  const colors = {
    bilibili: '#FB7299',
    huya: '#FF9900',
    douyu: '#FF6600',
  };
  return colors[platform] || '#666666';
}

/**
 * Get platform label
 */
export function getPlatformLabel(platform: Platform): string {
  const labels = {
    bilibili: 'Bilibili',
    huya: '虎牙',
    douyu: '斗鱼',
  };
  return labels[platform] || platform;
}

/**
 * Get status label
 */
export function getStatusLabel(status: JobStatus): string {
  const labels = {
    pending: '等待中',
    recording: '录制中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    stopping: '停止中',
  };
  return labels[status] || status;
}

/**
 * Get status variant for badge
 */
export function getStatusVariant(status: JobStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<JobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    recording: 'default',
    processing: 'outline',
    completed: 'default',
    failed: 'destructive',
    cancelled: 'secondary',
    stopping: 'outline',
  };
  return variants[status] || 'secondary';
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

/**
 * Format date
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd', { locale: zhCN });
}

/**
 * Format time
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return format(new Date(date), 'HH:mm:ss', { locale: zhCN });
}
