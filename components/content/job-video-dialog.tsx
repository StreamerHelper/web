'use client';

import { PlatformIcon } from '@/components/shared/platform-icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib';
import { formatDuration, formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { JobVideosResponse, VideoSegment } from '@/types';
import { ChevronLeft, Download, Layers, SkipForward } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';

interface JobVideoDialogProps {
  open: boolean;
  onClose: () => void;
  jobVideos?: JobVideosResponse;
  videosLoading: boolean;
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onVideoEnded: () => void;
  autoPlay: boolean;
}

// 固定尺寸
const DIALOG_WIDTH = 960;
const SIDEBAR_WIDTH = 240;
const VIDEO_HEIGHT = 480;

// 合并下载响应类型
interface MergeResponse {
  downloadUrl: string;
  filename: string;
  duration: number;
  size: number;
}

// 内部视频播放器组件
interface VideoPlayerInnerProps {
  video?: VideoSegment;
  autoPlay?: boolean;
  onEnded?: () => void;
}

const VideoPlayerInner = forwardRef<HTMLVideoElement, VideoPlayerInnerProps>(
  ({ video, autoPlay, onEnded }, ref) => {
    const internalRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    useImperativeHandle(ref, () => internalRef.current!);

    // 当视频源变化时重置加载状态
    useEffect(() => {
      setIsLoading(true);
    }, [video?.playUrl]);

    useEffect(() => {
      if (autoPlay && internalRef.current) {
        internalRef.current.play().catch(() => {});
      }
    }, [video?.playUrl, autoPlay]);

    if (!video) {
      return (
        <div
          className="w-full bg-black flex items-center justify-center"
          style={{ height: VIDEO_HEIGHT }}
        >
          <span className="text-white/50">暂无视频</span>
        </div>
      );
    }

    return (
      <div className="relative w-full bg-black" style={{ height: VIDEO_HEIGHT }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <video
          ref={internalRef}
          src={video.playUrl}
          className="w-full h-full bg-black"
          onEnded={onEnded}
          onLoadedData={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          controls
          autoPlay={autoPlay}
        />
      </div>
    );
  }
);

VideoPlayerInner.displayName = 'VideoPlayerInner';

export function JobVideoDialog({
  open,
  onClose,
  jobVideos,
  videosLoading,
  currentIndex,
  onSelectIndex,
  onPrevious,
  onNext,
  onVideoEnded,
  autoPlay,
}: JobVideoDialogProps) {
  const [selectedSegments, setSelectedSegments] = useState<Set<number>>(new Set());
  const [isMerging, setIsMerging] = useState(false);

  const currentVideo = jobVideos?.videos[currentIndex];
  const totalVideos = jobVideos?.videos.length ?? 0;

  // 当对话框打开时重置选中状态
  useEffect(() => {
    if (open) {
      setSelectedSegments(new Set());
    }
  }, [open]);

  // 切换选中状态
  const toggleSegment = (index: number) => {
    setSelectedSegments(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (!jobVideos?.videos.length) return;

    if (selectedSegments.size === jobVideos.videos.length) {
      setSelectedSegments(new Set());
    } else {
      setSelectedSegments(new Set(jobVideos.videos.map(v => v.index)));
    }
  };

  // 单独下载
  const handleSeparateDownload = async () => {
    if (selectedSegments.size === 0) {
      toast.error('请先选择要下载的视频');
      return;
    }

    const videos = jobVideos?.videos.filter(v => selectedSegments.has(v.index)) || [];
    toast.success(`开始下载 ${videos.length} 个视频...`);

    for (const video of videos) {
      try {
        const response = await fetch(video.playUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = video.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        toast.error(`下载失败: ${video.filename}`);
      }
    }
  };

  // 合并下载
  const handleMergeDownload = async () => {
    if (selectedSegments.size < 2) {
      toast.error('合并下载至少需要选择 2 个视频');
      return;
    }

    if (!jobVideos?.jobId) {
      toast.error('任务信息缺失');
      return;
    }

    setIsMerging(true);
    try {
      const response = await api.post<MergeResponse>(`/api/jobs/${jobVideos.jobId}/videos/merge`, {
        segments: Array.from(selectedSegments).sort((a, b) => a - b),
      });

      // 下载文件
      const fileResponse = await fetch(response.downloadUrl);
      const blob = await fileResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`下载完成: ${response.filename} (${formatFileSize(response.size)})`);
    } catch {
      toast.error('合并失败，请重试');
    } finally {
      setIsMerging(false);
    }
  };

  const selectedCount = selectedSegments.size;
  const isAllSelected = jobVideos?.videos.length && selectedSegments.size === jobVideos.videos.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="p-0" style={{ width: DIALOG_WIDTH, maxWidth: '95vw' }}>
        {/* Header */}
        <div className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-3 text-base">
            {jobVideos ? (
              <>
                <PlatformIcon platform={jobVideos.platform} />
                <span className="truncate font-medium">{jobVideos.streamerName}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {jobVideos.segmentCount} 个片段 · {formatDuration(jobVideos.duration)}
                </span>
              </>
            ) : (
              '加载中...'
            )}
          </DialogTitle>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Playlist */}
          <div
            className="shrink-0 flex flex-col border-r"
            style={{ width: SIDEBAR_WIDTH, height: VIDEO_HEIGHT + 48 }}
          >
            {/* Header with select all */}
            <div className="border-b bg-muted/50 px-3 py-2 flex items-center justify-between shrink-0">
              <h4 className="text-sm font-medium">视频列表</h4>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isAllSelected ? '取消全选' : '全选'}
              </button>
            </div>

            {/* Video list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-1 p-2">
                {videosLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="h-11 animate-pulse rounded bg-muted" />
                  ))
                ) : jobVideos?.videos.length ? (
                  jobVideos.videos.map((video, index) => (
                    <div
                      key={video.index}
                      className={cn(
                        'w-full rounded-md border px-2 py-2 transition-all duration-150 flex items-start gap-2 cursor-pointer',
                        'hover:bg-accent/50 hover:shadow-sm hover:border-muted-foreground/30',
                        index === currentIndex && 'border-primary/50 bg-primary/10',
                        selectedSegments.has(video.index) && index !== currentIndex && 'ring-1 ring-primary/30'
                      )}
                      onClick={() => onSelectIndex(index)}
                    >
                      <Checkbox
                        checked={selectedSegments.has(video.index)}
                        onCheckedChange={() => toggleSegment(video.index)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "truncate text-xs font-medium",
                          index === currentIndex ? 'text-primary' : ''
                        )}>
                          {video.filename}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          片段 {index + 1}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    暂无视频
                  </div>
                )}
              </div>
            </div>

            {/* Download actions footer */}
            <div className="border-t bg-muted/30 p-2 space-y-2 shrink-0">
              <div className="text-xs text-muted-foreground px-1">
                已选择 {selectedCount} 个片段
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  disabled={selectedCount === 0}
                  onClick={handleSeparateDownload}
                >
                  <Download className="h-3 w-3 mr-1" />
                  单独下载
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  disabled={selectedCount < 2 || isMerging}
                  onClick={handleMergeDownload}
                >
                  {isMerging ? (
                    <span className="animate-pulse">合并中...</span>
                  ) : (
                    <>
                      <Layers className="h-3 w-3 mr-1" />
                      合并下载
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Video */}
          <div className="flex-1 flex flex-col">
            <VideoPlayerInner
              video={currentVideo}
              autoPlay={autoPlay}
              onEnded={onVideoEnded}
            />

            {/* Controls */}
            <div className="flex items-center justify-between border-t px-4 py-2">
              <div className="truncate text-xs text-muted-foreground">
                {currentVideo && (
                  <span>
                    {currentIndex + 1}/{totalVideos} · {currentVideo.filename}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === 0}
                  onClick={onPrevious}
                >
                  <ChevronLeft className="mr-1 h-3 w-3" />
                  上一个
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex >= totalVideos - 1}
                  onClick={onNext}
                >
                  下一个
                  <SkipForward className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
