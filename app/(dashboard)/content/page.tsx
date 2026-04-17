'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PlatformIcon } from '@/components/shared/platform-icon';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useJobBrowse, useJobStreamers, useJobVideos } from '@/hooks';
import { formatDuration, formatTime } from '@/lib/format';
import type { BrowsedJob, BilibiliSubmission } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar, Clock, Download, HardDrive, MoreVertical, Play, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { JobVideoDialog } from '../../../components/content/job-video-dialog';
import { SubmitDialog } from '../../../components/content/submit-dialog';

export default function ContentPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [submitJob, setSubmitJob] = useState<BrowsedJob | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Filters (actual values used for API requests)
  const [streamerName, setStreamerName] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Segment count filter
  const [segmentFilterEnabled, setSegmentFilterEnabled] = useState(true);
  const [minSegmentCount, setMinSegmentCount] = useState(5);

  // Temporary date selection state (for popover, not triggered until confirmed)
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>();
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>();

  const { data: streamers } = useJobStreamers();
  const { data: groups, isLoading, error } = useJobBrowse({
    streamerName: streamerName === 'all' ? undefined : streamerName,
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    minSegmentCount: segmentFilterEnabled ? minSegmentCount : undefined,
  });
  const { data: jobVideos, isLoading: videosLoading } = useJobVideos(selectedJobId);

  // Sync temp dates when popover opens
  useEffect(() => {
    if (datePickerOpen) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [datePickerOpen, startDate, endDate]);

  // Reset when job changes
  useEffect(() => {
    setCurrentVideoIndex(0);
    setShouldAutoPlay(false);
  }, [selectedJobId]);

  // Handle video ended - play next
  const handleVideoEnded = () => {
    if (jobVideos && currentVideoIndex < jobVideos.videos.length - 1) {
    setCurrentVideoIndex(prev => prev + 1);
    setShouldAutoPlay(true);
    }
  };

  // Play specific video
  const playVideo = (index: number) => {
    setCurrentVideoIndex(index);
    setShouldAutoPlay(true);
  };

  // Navigate to previous/next
  const goToPrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
      setShouldAutoPlay(true);
    }
  };

  const goToNext = () => {
    if (jobVideos && currentVideoIndex < jobVideos.videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
      setShouldAutoPlay(true);
    }
  };

  // Close dialog
  const handleClose = () => {
    setSelectedJobId(null);
    setShouldAutoPlay(false);
  };

  // Clear filters
  const clearFilters = () => {
    setStreamerName('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setSegmentFilterEnabled(false);
    setMinSegmentCount(5);
  };

  // Handle submit success
  const handleSubmitSuccess = (submission: BilibiliSubmission) => {
    setSubmitJob(null);
    setSubmitDialogOpen(false);
  };

  // Open submit dialog
  const openSubmitDialog = (job: BrowsedJob) => {
    setSubmitJob(job);
    setSubmitDialogOpen(true);
  };

  // Handle download
  const handleDownload = (job: BrowsedJob) => {
    // TODO: Implement download functionality
    console.log('Download job:', job.jobId);
  };

  const hasFilters = streamerName !== 'all' || startDate || endDate || segmentFilterEnabled;

  // Format date range for display
  const formatDateRange = () => {
    if (!startDate && !endDate) return '选择日期';
    if (startDate && endDate) {
      return `${format(startDate, 'M/d')} - ${format(endDate, 'M/d')}`;
    }
    if (startDate) return `${format(startDate, 'M/d')} 起`;
    return `至 ${format(endDate!, 'M/d')}`;
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="内容浏览" description="浏览录制的视频内容" />
        <EmptyState
          title="加载失败"
          description="无法加载录制内容，请稍后重试"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="内容浏览" description="浏览录制的视频内容" />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Streamer Filter */}
        <Select value={streamerName} onValueChange={setStreamerName}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="全部主播" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部主播</SelectItem>
            {streamers?.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempStartDate(undefined);
                    setTempEndDate(undefined);
                  }}
                >
                  清除
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setDatePickerOpen(false);
                  }}
                >
                  确定
                </Button>
              </div>
            </div>
            <CalendarComponent
              mode="range"
              selected={{ from: tempStartDate, to: tempEndDate }}
              onSelect={(range) => {
                setTempStartDate(range?.from);
                setTempEndDate(range?.to);
              }}
              numberOfMonths={2}
              locale={zhCN}
            />
          </PopoverContent>
        </Popover>

        {/* Segment Count Filter */}
        <div className="flex items-center gap-2 border rounded-md px-3 py-2">
          <Switch
            id="segment-filter"
            checked={segmentFilterEnabled}
            onCheckedChange={setSegmentFilterEnabled}
          />
          <label
            htmlFor="segment-filter"
            className="text-sm font-medium cursor-pointer"
          >
            片段数 &gt;
          </label>
          <Input
            type="number"
            min="1"
            value={minSegmentCount}
            onChange={(e) => setMinSegmentCount(parseInt(e.target.value) || 1)}
            disabled={!segmentFilterEnabled}
            className="w-16 h-8"
          />
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-48 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <EmptyState
          title={hasFilters ? "没有找到匹配的内容" : "暂无录制内容"}
          description={hasFilters ? "尝试调整筛选条件" : "还没有任何录制的视频"}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.date}>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {group.date}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onPlay={() => {
                      setSelectedJobId(job.id);
                      setShouldAutoPlay(true);
                    }}
                    onSubmit={() => openSubmitDialog(job)}
                    onDownload={() => handleDownload(job)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <JobVideoDialog
        open={!!selectedJobId}
        onClose={handleClose}
        jobVideos={jobVideos}
        videosLoading={videosLoading}
        currentIndex={currentVideoIndex}
        onSelectIndex={playVideo}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onVideoEnded={handleVideoEnded}
        autoPlay={shouldAutoPlay}
      />

      <SubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        job={submitJob}
        onSuccess={handleSubmitSuccess}
      />
    </div>
  );
}

// Job Card Component
interface JobCardProps {
  job: BrowsedJob;
  onPlay: () => void;
  onSubmit: () => void;
  onDownload: () => void;
}

function JobCard({ job, onPlay, onSubmit, onDownload }: JobCardProps) {
  const [coverLoadFailed, setCoverLoadFailed] = useState(false);
  const hasCover = Boolean(job.coverUrl && !coverLoadFailed);

  return (
    <div className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-all">
      <div
        className="relative aspect-video bg-muted flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={onPlay}
      >
        {hasCover && (
          <img
            src={job.coverUrl!}
            alt={`${job.streamerName} 封面`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setCoverLoadFailed(true)}
          />
        )}
        <div className={`absolute inset-0 ${hasCover ? 'bg-black/20' : 'bg-muted'}`} />
        <PlatformIcon platform={job.platform} className="relative z-10 h-8 w-8 text-muted-foreground/50" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-6 w-6 text-primary ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs">
          {formatDuration(job.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h4 className="font-medium text-sm line-clamp-2 leading-tight">
          {job.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PlatformIcon platform={job.platform} />
          <span>{job.streamerName}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{formatTime(job.startTime)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(job.duration)}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {job.segmentCount} 片段
            </span>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSubmit}>
                <Upload className="h-4 w-4 mr-2" />
                投稿到B站
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                下载
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
