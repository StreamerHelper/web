import { Badge } from '@/components/ui/badge';
import { QUALITY_LABELS } from '@/lib/constants';
import type { RecordingQuality } from '@/types';

interface QualityBadgeProps {
  quality?: RecordingQuality;
  variant?: 'default' | 'secondary' | 'outline';
  fallback?: string;
}

export function QualityBadge({
  quality,
  variant = 'secondary',
  fallback = '未设置',
}: QualityBadgeProps) {
  if (!quality) {
    return (
      <Badge variant="outline" className="font-normal">
        {fallback}
      </Badge>
    );
  }

  return <Badge variant={variant}>{QUALITY_LABELS[quality]}</Badge>;
}
