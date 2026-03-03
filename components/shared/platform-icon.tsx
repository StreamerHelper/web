import { cn } from '@/lib/utils';
import type { Platform } from '@/types';
import { getPlatformColor, getPlatformLabel } from '@/lib/format';

interface PlatformIconProps {
  platform: Platform;
  showLabel?: boolean;
  className?: string;
}

export function PlatformIcon({ platform, showLabel = false, className }: PlatformIconProps) {
  const color = getPlatformColor(platform);
  const label = getPlatformLabel(platform);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {label.charAt(0)}
      </div>
      {showLabel && <span className="text-sm">{label}</span>}
    </div>
  );
}
