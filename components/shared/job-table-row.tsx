import type { Job } from '@/types';
import { PlatformIcon } from './platform-icon';
import { QualityBadge } from './quality-badge';
import { StatusBadge } from './status-badge';
import { formatDuration, formatRelativeTime } from '@/lib/format';
import { ExternalLink } from 'lucide-react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Eye, Square, RotateCw, Trash2 } from 'lucide-react';

const PLATFORM_ROOM_URLS: Record<string, (roomId: string) => string> = {
  douyin: (roomId) => `https://live.douyin.com/${roomId}`,
  huya: (roomId) => `https://www.huya.com/${roomId}`,
  bilibili: (roomId) => `https://live.bilibili.com/${roomId}`,
};

interface JobTableRowProps {
  job: Job;
  onClick: (job: Job) => void;
  onStop?: (job: Job) => void;
  onRetry?: (job: Job) => void;
  onDelete?: (job: Job) => void;
}

export function JobTableRow({ job, onClick, onStop, onRetry, onDelete }: JobTableRowProps) {
  return (
    <TableRow
      className="cursor-pointer h-12"
      onClick={() => onClick(job)}
    >
      <TableCell className="font-mono text-sm py-2 px-3">
        <a
          href={PLATFORM_ROOM_URLS[job.platform]?.(job.roomId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {job.roomId}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
      <TableCell className="font-medium py-2 px-3">{job.streamerName}</TableCell>
      <TableCell className="py-2 px-3">
        <PlatformIcon platform={job.platform} />
      </TableCell>
      <TableCell className="py-2 px-3">
        <StatusBadge status={job.status} />
      </TableCell>
      <TableCell className="py-2 px-3">
        <div className="space-y-1">
          {job.segmentCount > 0 ? (
            <span className="text-sm">{job.segmentCount} 个片段</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
          <div className="flex items-center gap-2">
            <QualityBadge
              quality={job.metadata?.requestedQuality}
              variant="outline"
              fallback="未设置"
            />
            {job.metadata?.effectiveQuality &&
              job.metadata.effectiveQuality !== job.metadata.requestedQuality && (
                <QualityBadge quality={job.metadata.effectiveQuality} />
              )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground py-2 px-3">
        {formatRelativeTime(job.startTime)}
      </TableCell>
      <TableCell className="py-2 px-3">
        {job.status === 'recording' ? (
          <span>{formatDuration(job.duration)}</span>
        ) : job.duration > 0 ? (
          <span>{formatDuration(job.duration)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right py-2 px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onClick(job)}>
              <Eye className="mr-2 h-4 w-4" />
              查看详情
            </DropdownMenuItem>
            {job.status === 'recording' && onStop && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onStop(job);
                }}
              >
                <Square className="mr-2 h-4 w-4" />
                停止录制
              </DropdownMenuItem>
            )}
            {job.status === 'failed' && onRetry && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(job);
                }}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                重试
              </DropdownMenuItem>
            )}
            {job.status === 'completed' && onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(job);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
