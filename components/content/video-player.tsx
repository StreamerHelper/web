'use client';

import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import type { VideoSegment } from '@/types';

interface VideoPlayerProps {
  video?: VideoSegment;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export function VideoPlayer({ video, autoPlay = false, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        // 自动播放可能会被浏览器拦截
      });
    }
  }, [video?.playUrl, autoPlay]);

  if (!video) {
    return (
      <div className="aspect-video w-full bg-black flex items-center justify-center">
        <Play className="h-16 w-16 text-white/50" />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      key={video.playUrl}
      src={video.playUrl}
      className="aspect-video w-full bg-black"
      onEnded={onEnded}
      controls
      autoPlay={autoPlay}
    />
  );
}
