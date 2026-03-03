import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types';
import { getStatusLabel } from '@/lib/format';

interface StatusBadgeProps {
  status: JobStatus;
  showRecordingAnimation?: boolean;
}

export function StatusBadge({ status, showRecordingAnimation }: StatusBadgeProps) {
  const isRecording = status === 'recording';

  return (
    <Badge
      variant={getStatusVariant(status)}
      className={cn(
        'font-medium',
        isRecording && 'animate-pulse'
      )}
    >
      {isRecording && (
        <span className="mr-1.5 relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      {getStatusLabel(status)}
    </Badge>
  );
}

function getStatusVariant(status: JobStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
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
