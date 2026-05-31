'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ErrorTooltipTextProps {
  error?: string | null;
  fallback?: ReactNode;
  className?: string;
  tooltipClassName?: string;
}

export function ErrorTooltipText({
  error,
  fallback = '-',
  className,
  tooltipClassName,
}: ErrorTooltipTextProps) {
  const message = typeof error === 'string' ? error.trim() : '';

  if (!message) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            'block max-w-full cursor-help truncate text-destructive outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-1',
            className
          )}
        >
          {message}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={6}
        className={cn(
          'max-w-[calc(100vw-2rem)] whitespace-pre-wrap break-words text-left leading-relaxed sm:max-w-[520px]',
          tooltipClassName
        )}
      >
        {message}
      </TooltipContent>
    </Tooltip>
  );
}
