'use client';

import { api } from '@/lib';
import type { DanmakuMessage, VideoSegment } from '@/types';
import { useEffect, useRef, useState } from 'react';

interface DanmakuOverlayProps {
  jobId?: string | null;
  video?: VideoSegment;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}

type ActiveDanmakuMode = 'scroll' | 'top' | 'bottom';

interface ActiveDanmakuItem {
  id: string;
  text: string;
  mode: ActiveDanmakuMode;
  lane: number;
  color: string;
  durationMs: number;
}

const SCROLL_LANES = 8;
const TOP_LANES = 2;
const BOTTOM_LANES = 2;
const LANE_HEIGHT = 34;
const LANE_MARGIN = 18;

export function DanmakuOverlay({
  jobId,
  video,
  videoRef,
  enabled,
}: DanmakuOverlayProps) {
  const [messages, setMessages] = useState<DanmakuMessage[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveDanmakuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  const messagesRef = useRef<DanmakuMessage[]>([]);
  const nextMessageIndexRef = useRef(0);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const laneCursorRef = useRef({
    scroll: 0,
    top: 0,
    bottom: 0,
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let disposed = false;

    if (!enabled || !jobId || !video) {
      setMessages([]);
      setActiveItems([]);
      setIsLoading(false);
      nextMessageIndexRef.current = 0;
      return;
    }

    setIsLoading(true);

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

        const nextMessages = response.messages
          .filter(message => Boolean(message.content?.trim()))
          .sort((left, right) => left.timestamp - right.timestamp);

        setMessages(nextMessages);
        setActiveItems([]);
        nextMessageIndexRef.current = 0;
      })
      .catch(() => {
        if (!disposed) {
          setMessages([]);
          setActiveItems([]);
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
  }, [enabled, jobId, video?.startOffsetMs, video?.endOffsetMs, video?.playUrl]);

  useEffect(() => {
    const element = videoRef.current;
    if (!enabled || !video || !element) {
      stopScheduler();
      setIsPaused(true);
      setActiveItems([]);
      return;
    }

    const syncPlaybackState = () => {
      const nextAbsoluteTime = video.startOffsetMs + element.currentTime * 1000;
      nextMessageIndexRef.current = findNextMessageIndex(
        messagesRef.current,
        nextAbsoluteTime
      );
      setActiveItems([]);
    };

    const handlePlay = () => {
      setIsPaused(false);
      startScheduler();
    };

    const handlePause = () => {
      setIsPaused(true);
      stopScheduler();
    };

    const handleSeeked = () => {
      syncPlaybackState();
      if (!element.paused) {
        startScheduler();
      }
    };

    syncPlaybackState();
    setIsPaused(element.paused);

    element.addEventListener('play', handlePlay);
    element.addEventListener('pause', handlePause);
    element.addEventListener('seeked', handleSeeked);
    element.addEventListener('loadedmetadata', handleSeeked);
    element.addEventListener('ended', handlePause);

    if (!element.paused) {
      startScheduler();
    }

    return () => {
      stopScheduler();
      element.removeEventListener('play', handlePlay);
      element.removeEventListener('pause', handlePause);
      element.removeEventListener('seeked', handleSeeked);
      element.removeEventListener('loadedmetadata', handleSeeked);
      element.removeEventListener('ended', handlePause);
    };
  }, [enabled, video, videoRef, messages]);

  const stopScheduler = () => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
  };

  const startScheduler = () => {
    stopScheduler();

    schedulerRef.current = setInterval(() => {
      const element = videoRef.current;
      if (!element || !video || element.paused) {
        return;
      }

      const currentAbsoluteTime =
        video.startOffsetMs + element.currentTime * 1000 + 120;
      const nextMessages = messagesRef.current;

      while (
        nextMessageIndexRef.current < nextMessages.length &&
        nextMessages[nextMessageIndexRef.current].timestamp <= currentAbsoluteTime
      ) {
        emitMessage(nextMessages[nextMessageIndexRef.current]);
        nextMessageIndexRef.current += 1;
      }
    }, 100);
  };

  const emitMessage = (message: DanmakuMessage) => {
    const text = message.content?.trim();
    if (!text) {
      return;
    }

    const mode =
      message.position === 2
        ? 'top'
        : message.position === 1
          ? 'bottom'
          : 'scroll';
    const lane = allocateLane(mode);
    const durationMs =
      mode === 'scroll'
        ? clamp(6800 + text.length * 90, 6800, 10000)
        : message.type === 'sc'
          ? 5200
          : 4200;

    setActiveItems(current => [
      ...current,
      {
        id: `${message.id}-${message.timestamp}-${lane}`,
        text,
        mode,
        lane,
        color: toHexColor(message.contentColor ?? message.color),
        durationMs,
      },
    ]);
  };

  const allocateLane = (mode: ActiveDanmakuMode) => {
    const laneCounts = {
      scroll: SCROLL_LANES,
      top: TOP_LANES,
      bottom: BOTTOM_LANES,
    };

    const nextLane = laneCursorRef.current[mode] % laneCounts[mode];
    laneCursorRef.current[mode] += 1;
    return nextLane;
  };

  const removeItem = (id: string) => {
    setActiveItems(current => current.filter(item => item.id !== id));
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {isLoading && (
        <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-sm">
          弹幕加载中
        </div>
      )}

      {activeItems.map(item => {
        const commonStyle = {
          color: item.color,
          animationDuration: `${item.durationMs}ms`,
          animationPlayState: isPaused ? ('paused' as const) : ('running' as const),
        };

        const positionStyle =
          item.mode === 'top'
            ? { top: `${LANE_MARGIN + item.lane * LANE_HEIGHT}px` }
            : item.mode === 'bottom'
              ? { bottom: `${LANE_MARGIN + item.lane * LANE_HEIGHT}px` }
              : { top: `${LANE_MARGIN + item.lane * LANE_HEIGHT}px` };

        return (
          <div
            key={item.id}
            className={
              item.mode === 'scroll'
                ? 'absolute left-full whitespace-nowrap text-base font-semibold danmaku-scroll'
                : 'absolute left-1/2 max-w-[78%] -translate-x-1/2 whitespace-nowrap text-base font-semibold danmaku-static'
            }
            style={{
              ...commonStyle,
              ...positionStyle,
            }}
            onAnimationEnd={() => removeItem(item.id)}
          >
            <span className="rounded px-1.5 py-0.5 text-shadow-danmaku">
              {item.text}
            </span>
          </div>
        );
      })}

      <style jsx>{`
        .danmaku-scroll {
          animation-name: danmaku-scroll;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          will-change: transform;
        }

        .danmaku-static {
          animation-name: danmaku-static;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
          will-change: opacity, transform;
        }

        .text-shadow-danmaku {
          text-shadow:
            -1px -1px 0 rgba(0, 0, 0, 0.95),
            1px -1px 0 rgba(0, 0, 0, 0.95),
            -1px 1px 0 rgba(0, 0, 0, 0.95),
            1px 1px 0 rgba(0, 0, 0, 0.95),
            0 4px 14px rgba(0, 0, 0, 0.45);
        }

        @keyframes danmaku-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(calc(-100vw - 120%), 0, 0);
          }
        }

        @keyframes danmaku-static {
          0% {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          10% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          90% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -6px);
          }
        }
      `}</style>
    </div>
  );
}

function findNextMessageIndex(
  messages: DanmakuMessage[],
  currentAbsoluteTime: number
) {
  for (let index = 0; index < messages.length; index += 1) {
    if (messages[index].timestamp >= currentAbsoluteTime) {
      return index;
    }
  }
  return messages.length;
}

function toHexColor(input?: number) {
  const colorValue =
    typeof input === 'number' && Number.isFinite(input) ? input : 0xffffff;
  return `#${colorValue.toString(16).padStart(6, '0')}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
