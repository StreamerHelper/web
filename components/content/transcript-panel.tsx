'use client';

import { api } from '@/lib';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TranscriptMessage, VideoSegment } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TranscriptPanelProps {
  jobId?: string | null;
  video?: VideoSegment;
  playbackOffsetMs: number;
}

const PAGE_SIZE = 200;

export function TranscriptPanel({
  jobId,
  video,
  playbackOffsetMs,
}: TranscriptPanelProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const requestRef = useRef(0);

  const loadTranscript = useCallback(async () => {
    if (!jobId || !video) {
      setMessages([]);
      setTotal(0);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsLoading(true);

    try {
      const response = await api.getTranscript({
        jobId,
        startTime: video.startOffsetMs,
        endTime: video.endOffsetMs,
        limit: PAGE_SIZE,
        offset: 0,
      });
      if (requestRef.current !== requestId) {
        return;
      }
      setMessages(
        response.messages
          .filter(message => message.text?.trim())
          .sort((left, right) => left.timestamp - right.timestamp)
      );
      setTotal(response.total);
    } catch {
      if (requestRef.current !== requestId) {
        return;
      }
      setMessages([]);
      setTotal(0);
    } finally {
      if (requestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [jobId, video]);

  useEffect(() => {
    setActiveIndex(-1);
    void loadTranscript();
  }, [loadTranscript, video?.playUrl]);

  useEffect(() => {
    const nextIndex = findLastTranscriptIndex(messages, playbackOffsetMs);
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  }, [activeIndex, messages, playbackOffsetMs]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }
    const message = messages[activeIndex];
    if (!message) {
      return;
    }
    itemRefs.current[getMessageKey(message, activeIndex)]?.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    });
  }, [activeIndex, messages]);

  return (
    <div className="flex h-full min-w-[280px] max-w-[320px] flex-col border-l bg-background">
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">字幕预览</div>
          <div className="text-[11px] text-muted-foreground">
            {isLoading ? '加载中' : `${messages.length}/${total || messages.length}`}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border/45">
          {!isLoading && messages.length === 0 && (
            <div className="py-5 text-center text-xs text-muted-foreground">
              当前片段没有转写文本
            </div>
          )}

          {messages.map((message, index) => {
            const isCurrent = index === activeIndex;
            const isPast = index <= activeIndex;
            const key = getMessageKey(message, index);
            return (
              <div
                key={key}
                ref={node => {
                  itemRefs.current[key] = node;
                }}
                className={cn(
                  'border-l-2 border-transparent px-2 py-2 text-[12px] leading-5 transition-colors',
                  isPast ? 'opacity-100' : 'opacity-50',
                  isCurrent && 'border-l-primary bg-primary/6'
                )}
              >
                <div className="mb-1 tabular-nums text-[10px] text-muted-foreground">
                  {formatDuration(message.timestamp)}
                </div>
                <div className="break-words text-foreground/92">
                  {message.text}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="px-2 py-2 text-center text-[10px] text-muted-foreground">
              正在加载转写文本...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function findLastTranscriptIndex(
  messages: TranscriptMessage[],
  currentTimeMs: number
) {
  let low = 0;
  let high = messages.length - 1;
  let answer = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (messages[middle].timestamp <= currentTimeMs) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return answer;
}

function getMessageKey(message: TranscriptMessage, index: number) {
  return `${message.id}-${message.timestamp}-${index}`;
}
