'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib';
import type { Streamer, StreamStatus } from '@/types';

interface LiveStatusMap {
  [streamerId: string]: {
    isLive: boolean;
    title?: string;
    lastChecked: Date;
  };
}

interface UseLiveStatusOptions {
  autoCheck?: boolean;
  pollInterval?: number;
}

interface CheckSingleOptions {
  suppressError?: boolean;
}

export function useLiveStatus(
  streamers: Streamer[],
  options: UseLiveStatusOptions = {}
) {
  const { autoCheck = true, pollInterval = 60000 } = options;
  const [liveStatus, setLiveStatus] = useState<LiveStatusMap>({});
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkSingle = useCallback(async (
    streamer: Streamer,
    checkOptions: CheckSingleOptions = {}
  ): Promise<StreamStatus | null> => {
    setChecking(prev => new Set(prev).add(streamer.streamerId));
    try {
      const status = await api.checkStreamStatus(streamer.id, {
        silentError: checkOptions.suppressError,
      });
      setLiveStatus(prev => ({
        ...prev,
        [streamer.streamerId]: {
          isLive: status.isLive,
          title: status.title,
          lastChecked: new Date(),
        },
      }));
      return status;
    } catch (error) {
      if (!checkOptions.suppressError) {
        throw error;
      }
      return null;
    } finally {
      setChecking(prev => {
        const next = new Set(prev);
        next.delete(streamer.streamerId);
        return next;
      });
    }
  }, []);

  const checkAll = useCallback(async () => {
    const activeStreamers = streamers.filter(s => s.isActive ?? false);
    await Promise.all(
      activeStreamers.map(streamer =>
        checkSingle(streamer, { suppressError: true })
      )
    );
  }, [streamers, checkSingle]);

  const getLiveStatus = useCallback((streamerId: string): boolean => {
    return liveStatus[streamerId]?.isLive ?? false;
  }, [liveStatus]);

  const getStreamTitle = useCallback((streamerId: string): string | undefined => {
    return liveStatus[streamerId]?.title;
  }, [liveStatus]);

  const isChecking = useCallback((streamerId: string): boolean => {
    return checking.has(streamerId);
  }, [checking]);

  // Auto-check on mount and periodically
  useEffect(() => {
    if (!autoCheck || streamers.length === 0) return;

    // Initial check
    checkAll();

    // Set up polling
    if (pollInterval > 0) {
      intervalRef.current = setInterval(checkAll, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoCheck, pollInterval, streamers, checkAll]);

  return {
    liveStatus,
    getLiveStatus,
    getStreamTitle,
    checkSingle,
    checkAll,
    isChecking,
  };
}
