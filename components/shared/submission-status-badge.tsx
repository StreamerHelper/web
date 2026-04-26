import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SubmissionStatus } from '@/types';

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: '等待投稿',
  uploading: '上传中',
  submitting: '提交中',
  completed: '已完成',
  failed: '失败',
};

const SUBMISSION_STATUS_VARIANTS: Record<
  SubmissionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  uploading: 'default',
  submitting: 'default',
  completed: 'default',
  failed: 'destructive',
};

interface SubmissionStatusBadgeProps {
  status?: SubmissionStatus | null;
  className?: string;
}

export function getSubmissionStatusLabel(
  status?: SubmissionStatus | null
): string {
  return status ? SUBMISSION_STATUS_LABELS[status] || status : '未投稿';
}

export function SubmissionStatusBadge({
  status,
  className,
}: SubmissionStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className={cn('font-normal', className)}>
        未投稿
      </Badge>
    );
  }

  return (
    <Badge
      variant={SUBMISSION_STATUS_VARIANTS[status] || 'secondary'}
      className={cn('font-medium', className)}
    >
      {getSubmissionStatusLabel(status)}
    </Badge>
  );
}
