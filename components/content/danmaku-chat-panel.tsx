'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DanmakuMessage, VideoSegment } from '@/types';
import { Gift, MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface DanmakuChatPanelProps {
  jobId?: string | null;
  video?: VideoSegment;
  playbackOffsetMs: number;
}

export function DanmakuChatPanel({
  jobId,
  video,
  playbackOffsetMs,
}: DanmakuChatPanelProps) {
  const [messages, setMessages] = useState<DanmakuMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let disposed = false;

    if (!jobId || !video) {
      setMessages([]);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    setIsLoading(true);
    setActiveIndex(-1);

    api
      .getDanmaku({
        jobId,
        startTime: video.startOffsetMs,
        endTime: video.endOffsetMs,
        limit: 5000,
        offset: 0,
      })
      .then(response => {
        if (disposed) {
          return;
        }

        setMessages(
          response.messages
            .filter(message => shouldRenderMessage(message))
            .sort((left, right) => left.timestamp - right.timestamp)
        );
      })
      .catch(() => {
        if (!disposed) {
          setMessages([]);
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [jobId, video?.playUrl, video?.startOffsetMs, video?.endOffsetMs]);

  useEffect(() => {
    if (messages.length === 0) {
      if (activeIndex !== -1) {
        setActiveIndex(-1);
      }
      return;
    }

    const nextIndex = findLastMessageIndex(messages, playbackOffsetMs);
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  }, [messages, playbackOffsetMs, activeIndex]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }

    const currentMessage = messages[activeIndex];
    if (!currentMessage) {
      return;
    }

    const currentKey = getMessageKey(currentMessage, activeIndex);
    itemRefs.current[currentKey]?.scrollIntoView({
      block: 'center',
      behavior: 'auto',
    });
  }, [activeIndex, messages]);

  const stats = useMemo(() => {
    let chatCount = 0;
    let giftCount = 0;
    let scCount = 0;

    for (const message of messages) {
      if (message.type === 'chat') {
        chatCount += 1;
      } else if (message.type === 'gift') {
        giftCount += 1;
      } else if (message.type === 'sc') {
        scCount += 1;
      }
    }

    return { chatCount, giftCount, scCount };
  }, [messages]);

  return (
    <div className="flex h-full min-w-[280px] max-w-[320px] flex-col border-l bg-background">
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">弹幕</div>
          <div className="text-[11px] text-muted-foreground">
            {isLoading ? '加载中' : `${messages.length} 条`}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{stats.chatCount} 普通</span>
          <span>{stats.giftCount} 礼物</span>
          <span>{stats.scCount} SC</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 px-2 py-2">
          {!isLoading && messages.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              当前片段没有弹幕
            </div>
          )}

          {messages.map((message, index) => {
            const messageKey = getMessageKey(message, index);
            const variant = getDanmakuVariant(message);
            const isPast = index <= activeIndex;
            const isCurrent = index === activeIndex;
            const body = getMessageBody(message);

            return (
              <div
                key={messageKey}
                ref={node => {
                  itemRefs.current[messageKey] = node;
                }}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-[12px] leading-[1.35] transition-colors',
                  variant.container,
                  isPast ? 'opacity-100' : 'opacity-55',
                  isCurrent && 'ring-1 ring-primary/45 shadow-sm'
                )}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="tabular-nums text-[10px]">
                    {formatDuration(message.timestamp)}
                  </span>
                  <span className={cn('inline-flex items-center gap-1', variant.badgeClass)}>
                    {variant.icon}
                    {variant.label}
                  </span>
                  {message.type === 'sc' && message.superChat?.price ? (
                    <span className="rounded bg-amber-500/12 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      ¥{message.superChat.price}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 break-words">
                  {message.type !== 'notice' && message.type !== 'enter' ? (
                    <span className="font-medium text-foreground/90">
                      {message.username}
                    </span>
                  ) : null}
                  {message.type !== 'notice' && message.type !== 'enter' ? (
                    <span className="text-muted-foreground">: </span>
                  ) : null}
                  <span className={cn('text-foreground', variant.bodyClass)}>
                    {body}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function shouldRenderMessage(message: DanmakuMessage) {
  if (message.type === 'chat' || message.type === 'gift' || message.type === 'sc') {
    return true;
  }

  return Boolean(getMessageBody(message));
}

function getMessageBody(message: DanmakuMessage) {
  if (message.type === 'gift') {
    const giftName = message.gift?.giftName || message.content || '礼物';
    const count = message.gift?.count || 1;
    return `${giftName} x${count}`;
  }

  if (message.type === 'sc') {
    return message.content || '醒目留言';
  }

  if (message.type === 'enter') {
    return `${message.username} 进入直播间`;
  }

  if (message.type === 'follow') {
    return `${message.username} 关注了直播间`;
  }

  if (message.type === 'share') {
    return `${message.username} 分享了直播间`;
  }

  if (message.type === 'like') {
    return `${message.username} 点赞了直播间`;
  }

  if (message.type === 'notice') {
    return message.content || '系统通知';
  }

  return message.content || '';
}

function getDanmakuVariant(message: DanmakuMessage) {
  if (message.type === 'sc') {
    return {
      label: 'SC',
      icon: <Sparkles className="h-3 w-3" />,
      container:
        'border-amber-500/35 bg-gradient-to-r from-amber-500/10 to-orange-500/8',
      badgeClass: 'text-amber-700 dark:text-amber-300',
      bodyClass: 'font-medium',
    };
  }

  if (message.type === 'gift') {
    return {
      label: '礼物',
      icon: <Gift className="h-3 w-3" />,
      container: 'border-emerald-500/30 bg-emerald-500/6',
      badgeClass: 'text-emerald-700 dark:text-emerald-300',
      bodyClass: '',
    };
  }

  if (
    message.type === 'enter' ||
    message.type === 'follow' ||
    message.type === 'share' ||
    message.type === 'like' ||
    message.type === 'notice'
  ) {
    return {
      label: '事件',
      icon: <MessageSquare className="h-3 w-3" />,
      container: 'border-border/60 bg-muted/40',
      badgeClass: 'text-muted-foreground',
      bodyClass: 'text-muted-foreground',
    };
  }

  return {
    label: '弹幕',
    icon: <MessageSquare className="h-3 w-3" />,
    container: 'border-border/65 bg-card',
    badgeClass: 'text-sky-700 dark:text-sky-300',
    bodyClass: '',
  };
}

function findLastMessageIndex(messages: DanmakuMessage[], currentTimeMs: number) {
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

function getMessageKey(message: DanmakuMessage, index: number) {
  return `${message.id}-${message.timestamp}-${index}`;
}
