'use client';

import { api } from '@/lib';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DanmakuMessage, VideoSegment } from '@/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface DanmakuChatPanelProps {
  jobId?: string | null;
  video?: VideoSegment;
  playbackOffsetMs: number;
}

const PAGE_SIZE = 200;
const LOAD_MORE_THRESHOLD_PX = 240;
const PREFETCH_REMAINING_MESSAGES = 40;

export function DanmakuChatPanel({
  jobId,
  video,
  playbackOffsetMs,
}: DanmakuChatPanelProps) {
  const [messages, setMessages] = useState<DanmakuMessage[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef(0);

  const loadPage = useCallback(
    async (offset: number, mode: 'reset' | 'append') => {
      if (!jobId || !video) {
        return;
      }

      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      if (mode === 'reset') {
        setIsLoadingInitial(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await api.getDanmaku({
          jobId,
          startTime: video.startOffsetMs,
          endTime: video.endOffsetMs,
          limit: PAGE_SIZE,
          offset,
        });

        if (requestRef.current !== requestId) {
          return;
        }

        const nextMessages = response.messages
          .filter(message => shouldRenderMessage(message))
          .sort((left, right) => left.timestamp - right.timestamp);

        setMessages(previous =>
          mode === 'reset' ? nextMessages : [...previous, ...nextMessages]
        );
        setHasMore(response.hasMore);
        setTotal(response.total);
      } catch {
        if (requestRef.current !== requestId) {
          return;
        }

        if (mode === 'reset') {
          setMessages([]);
        }
        setHasMore(false);
        setTotal(0);
      } finally {
        if (requestRef.current === requestId) {
          setIsLoadingInitial(false);
          setIsLoadingMore(false);
        }
      }
    },
    [jobId, video]
  );

  useEffect(() => {
    requestRef.current += 1;
    setMessages([]);
    setActiveIndex(-1);
    setHasMore(false);
    setTotal(0);
    setIsLoadingMore(false);

    if (!jobId || !video) {
      setIsLoadingInitial(false);
      return;
    }

    void loadPage(0, 'reset');
  }, [jobId, loadPage, video?.playUrl, video?.startOffsetMs, video?.endOffsetMs]);

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
  }, [activeIndex, messages, playbackOffsetMs]);

  useEffect(() => {
    if (!hasMore || isLoadingMore || messages.length === 0) {
      return;
    }

    const lastLoadedMessage = messages[messages.length - 1];
    const shouldPrefetchByPlayback =
      lastLoadedMessage.timestamp <= playbackOffsetMs ||
      messages.length - activeIndex <= PREFETCH_REMAINING_MESSAGES;

    if (shouldPrefetchByPlayback) {
      void loadPage(messages.length, 'append');
    }
  }, [activeIndex, hasMore, isLoadingMore, loadPage, messages, playbackOffsetMs]);

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
      block: 'nearest',
      behavior: 'auto',
    });
  }, [activeIndex, messages]);

  const handleScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node || !hasMore || isLoadingMore) {
      return;
    }

    const remainingDistance =
      node.scrollHeight - node.scrollTop - node.clientHeight;

    if (remainingDistance <= LOAD_MORE_THRESHOLD_PX) {
      void loadPage(messages.length, 'append');
    }
  }, [hasMore, isLoadingMore, loadPage, messages.length]);

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
          <div className="text-sm font-medium">聊天回放</div>
          <div className="text-[11px] text-muted-foreground">
            {isLoadingInitial ? '加载中' : `${messages.length}/${total || messages.length}`}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{stats.chatCount} 普通</span>
          <span>{stats.giftCount} 礼物</span>
          <span>{stats.scCount} SC</span>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="divide-y divide-border/45">
          {!isLoadingInitial && messages.length === 0 && (
            <div className="py-5 text-center text-xs text-muted-foreground">
              当前片段没有弹幕
            </div>
          )}

          {messages.map((message, index) => {
            const messageKey = getMessageKey(message, index);
            const meta = getMessageMeta(message);
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
                  'border-l-2 border-transparent px-2 py-1.5 text-[11px] leading-4 transition-colors',
                  isPast ? 'opacity-100' : 'opacity-45',
                  isCurrent && 'border-l-primary bg-primary/6'
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-px w-10 shrink-0 tabular-nums text-[10px] text-muted-foreground">
                    {formatDuration(message.timestamp)}
                  </span>
                  <div className="min-w-0 flex-1 break-words">
                    <span
                      className={cn(
                        'mr-1 inline-flex align-middle text-[9px] font-medium',
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>
                    {meta.showUsername ? (
                      <>
                        <span
                          className={cn(
                            'align-middle font-medium',
                            meta.usernameClass
                          )}
                        >
                          {message.username}
                        </span>
                        <span className="align-middle text-muted-foreground">
                          :{' '}
                        </span>
                      </>
                    ) : null}
                    {message.type === 'sc' && message.superChat?.price ? (
                      <span className="mr-1 inline-flex rounded-sm bg-amber-500/12 px-1 text-[9px] font-medium text-amber-700 align-middle dark:text-amber-300">
                        ¥{message.superChat.price}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'align-middle text-foreground/92',
                        meta.bodyClass
                      )}
                    >
                      {body}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {(isLoadingInitial || isLoadingMore) && (
            <div className="px-2 py-2 text-center text-[10px] text-muted-foreground">
              正在加载更多弹幕...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function shouldRenderMessage(message: DanmakuMessage) {
  if (
    message.type === 'chat' ||
    message.type === 'gift' ||
    message.type === 'sc'
  ) {
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

function getMessageMeta(message: DanmakuMessage) {
  if (message.type === 'sc') {
    return {
      label: 'SC',
      badgeClass: 'text-amber-700 dark:text-amber-300',
      usernameClass: 'text-foreground',
      bodyClass: 'font-medium',
      showUsername: true,
    };
  }

  if (message.type === 'gift') {
    return {
      label: '礼物',
      badgeClass: 'text-emerald-700 dark:text-emerald-300',
      usernameClass: 'text-foreground',
      bodyClass: '',
      showUsername: true,
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
      badgeClass: 'text-muted-foreground',
      usernameClass: 'text-foreground',
      bodyClass: 'text-muted-foreground',
      showUsername: false,
    };
  }

  return {
    label: '弹幕',
    badgeClass: 'text-sky-700 dark:text-sky-300',
    usernameClass: 'text-foreground',
    bodyClass: '',
    showUsername: true,
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
