import type { Job } from '@/types';
import { PlatformIcon } from './platform-icon';
import { QualityBadge } from './quality-badge';
import { StatusBadge } from './status-badge';
import { formatDuration, formatRelativeTime } from '@/lib/format';

interface JobListItemProps {
  job: Job;
  onClick?: (job: Job) => void;
}

export function JobListItem({ job, onClick }: JobListItemProps) {
  const isRecording = job.status === 'recording';

  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onClick?.(job)}
    >
      <PlatformIcon platform={job.platform} />
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
        {/* Streamer Info */}
        <div>
          <div className="font-medium text-sm truncate">{job.streamerName}</div>
          <div className="text-xs text-muted-foreground">{job.roomId}</div>
        </div>

        {/* Time Info - different for recording vs recent */}
        <div className={isRecording ? 'text-right' : 'text-right text-xs text-muted-foreground'}>
          {isRecording ? (
            <>
              <div className="text-sm font-medium tabular-nums">{formatDuration(job.duration)}</div>
              <div className="text-xs text-muted-foreground">
                {job.startTime ? formatRelativeTime(job.startTime) : '-'}
              </div>
            </>
          ) : (
            <>
              <div>{job.updatedAt ? formatRelativeTime(job.updatedAt) : '-'}</div>
              <div>{job.duration > 0 ? formatDuration(job.duration) : '-'}</div>
            </>
          )}
        </div>

        {/* Metadata Info */}
        <div className="text-right text-xs text-muted-foreground">
          <div>{job.segmentCount > 0 ? `${job.segmentCount} 片段` : '-'}</div>
          <div className="flex justify-end gap-1">
            <QualityBadge
              quality={job.metadata?.requestedQuality}
              variant="outline"
              fallback="-"
            />
            {job.metadata?.effectiveQuality &&
              job.metadata.effectiveQuality !== job.metadata.requestedQuality && (
                <QualityBadge quality={job.metadata.effectiveQuality} />
              )}
          </div>
        </div>

        {/* Status Badge */}
        <StatusBadge status={job.status} />
      </div>
    </div>
  );
}
