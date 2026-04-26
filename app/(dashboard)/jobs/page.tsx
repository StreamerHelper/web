'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { JobTableRow } from '@/components/shared/job-table-row';
import { TableSkeleton } from '@/components/shared/loading';
import { PageHeader } from '@/components/shared/page-header';
import { PlatformIcon } from '@/components/shared/platform-icon';
import { QualityBadge } from '@/components/shared/quality-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { SubmissionStatusBadge } from '@/components/shared/submission-status-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeleteJob, useJobs, useRetryJob, useStopRecording } from '@/hooks/use-jobs';
import { formatDateTime, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Job, JobStatus, JobSubmissionSummary } from '@/types';
import { ExternalLink, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToAction, setJobToAction] = useState<Job | null>(null);

  const { data: jobsData, isLoading, refetch } = useJobs(
    statusFilter !== 'all'
      ? { status: statusFilter as JobStatus, pageSize: 1000 }
      : { pageSize: 1000 }
  );

  const jobs = jobsData?.data || [];
  const activeSelectedJob = selectedJob
    ? jobs.find((job) => job.id === selectedJob.id) ?? selectedJob
    : null;

  const stopMutation = useStopRecording();
  const retryMutation = useRetryJob();
  const deleteMutation = useDeleteJob();

  const handleStop = async () => {
    if (jobToAction) {
      await stopMutation.mutateAsync(jobToAction.id);
      setStopDialogOpen(false);
      setJobToAction(null);
    }
  };

  const handleRetry = async (job: Job) => {
    await retryMutation.mutateAsync(job.id);
  };

  const handleDelete = async () => {
    if (jobToAction) {
      await deleteMutation.mutateAsync(jobToAction.id);
      setDeleteDialogOpen(false);
      setJobToAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="录制任务" description="查看和管理录制任务" />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="录制任务"
        description="查看和管理录制任务"
        actions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">等待中</SelectItem>
              <SelectItem value="recording">录制中</SelectItem>
              <SelectItem value="processing">处理中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          title="暂无任务"
          description="还没有任何录制任务"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>直播间号</TableHead>
              <TableHead>主播</TableHead>
              <TableHead>平台</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>进度</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>时长</TableHead>
              <TableHead className="min-w-[220px]">投稿</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <JobTableRow
                key={job.id}
                job={job}
                onClick={setSelectedJob}
                onStop={(job) => {
                  setJobToAction(job);
                  setStopDialogOpen(true);
                }}
                onRetry={handleRetry}
                onDelete={(job) => {
                  setJobToAction(job);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {/* Job Detail Dialog */}
      <Dialog open={!!activeSelectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[900px] max-h-[calc(100svh-1.5rem)] gap-5 overflow-hidden p-6 sm:min-h-[640px]">
          {activeSelectedJob && (
            <>
              <DialogHeader className="min-w-0 pr-8">
                <DialogTitle className="flex min-w-0 items-center gap-3 text-xl leading-tight">
                  <PlatformIcon platform={activeSelectedJob.platform} />
                  <span
                    className="min-w-0 truncate"
                    title={activeSelectedJob.streamerName}
                  >
                    {activeSelectedJob.streamerName}
                  </span>
                  <StatusBadge status={activeSelectedJob.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="flex min-h-0 min-w-0 flex-col gap-4">
                <CompactSection title="任务概览">
                  <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
                    <CompactField
                      label="任务 ID"
                      title={activeSelectedJob.id}
                      mono
                      className="col-span-2"
                    >
                      {activeSelectedJob.id}
                    </CompactField>
                    <CompactField label="房间号" title={activeSelectedJob.roomId}>
                      {activeSelectedJob.roomId}
                    </CompactField>
                    <CompactField label="状态">
                      <StatusBadge status={activeSelectedJob.status} />
                    </CompactField>
                    <CompactField
                      label="创建时间"
                      title={formatDateTime(activeSelectedJob.createdAt)}
                      className="col-span-2"
                    >
                      {formatDateTime(activeSelectedJob.createdAt)}
                    </CompactField>
                  </div>
                </CompactSection>

                <CompactSection title="录制信息">
                  <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
                    <CompactField
                      label="开始时间"
                      title={formatDateTime(activeSelectedJob.startTime)}
                    >
                      {formatDateTime(activeSelectedJob.startTime)}
                    </CompactField>
                    <CompactField
                      label="结束时间"
                      title={
                        activeSelectedJob.endTime
                          ? formatDateTime(activeSelectedJob.endTime)
                          : '-'
                      }
                    >
                      {activeSelectedJob.endTime
                        ? formatDateTime(activeSelectedJob.endTime)
                        : '-'}
                    </CompactField>
                    <CompactField label="录制时长">
                      {formatDuration(activeSelectedJob.duration)}
                    </CompactField>
                    <CompactField label="视频片段">
                      {activeSelectedJob.segmentCount > 0
                        ? `${activeSelectedJob.segmentCount} 个`
                        : '-'}
                    </CompactField>
                  </div>
                </CompactSection>

                <CompactSection
                  title="投稿信息"
                  meta={
                    activeSelectedJob.submissions?.length
                      ? `${activeSelectedJob.submissions.length} 条`
                      : undefined
                  }
                >
                  <SubmissionCompactList
                    submissions={activeSelectedJob.submissions}
                  />
                </CompactSection>

                <CompactSection title="媒体参数">
                  {hasVisibleMediaMetadata(activeSelectedJob) ? (
                    <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
                      {activeSelectedJob.metadata.resolution && (
                        <CompactField label="分辨率">
                          {activeSelectedJob.metadata.resolution}
                        </CompactField>
                      )}
                      {(activeSelectedJob.metadata.requestedQuality ||
                        activeSelectedJob.metadata.effectiveQuality) && (
                        <CompactField
                          label="清晰度"
                          truncateValue={false}
                          className="col-span-2"
                        >
                          <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                            <QualityBadge
                              quality={activeSelectedJob.metadata.requestedQuality}
                              variant="outline"
                              fallback="未设置"
                            />
                            {activeSelectedJob.metadata.effectiveQuality && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <QualityBadge
                                  quality={activeSelectedJob.metadata.effectiveQuality}
                                />
                              </>
                            )}
                          </span>
                        </CompactField>
                      )}
                      {activeSelectedJob.metadata.bitrate && (
                        <CompactField label="码率">
                          {activeSelectedJob.metadata.bitrate} kbps
                        </CompactField>
                      )}
                      {activeSelectedJob.metadata.codec && (
                        <CompactField label="编码">
                          {activeSelectedJob.metadata.codec}
                        </CompactField>
                      )}
                      {activeSelectedJob.metadata.qualityNote && (
                        <CompactField
                          label="说明"
                          title={activeSelectedJob.metadata.qualityNote}
                          className="col-span-2 md:col-span-4"
                        >
                          {activeSelectedJob.metadata.qualityNote}
                        </CompactField>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无媒体参数</p>
                  )}
                </CompactSection>

                {activeSelectedJob.errorMessage && (
                  <div className="min-w-0 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <div className="text-xs font-medium text-destructive">
                      错误信息
                    </div>
                    <div
                      className="mt-1 truncate text-sm text-destructive"
                      title={activeSelectedJob.errorMessage}
                    >
                      {activeSelectedJob.errorMessage}
                    </div>
                  </div>
                )}

                {activeSelectedJob.status === 'recording' && (
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setJobToAction(activeSelectedJob);
                        setSelectedJob(null);
                        setStopDialogOpen(true);
                      }}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      停止录制
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Stop Dialog */}
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>停止录制</AlertDialogTitle>
            <AlertDialogDescription>
              确定要停止录制吗？录制将被保存。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop}>停止</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除任务</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个任务吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function hasVisibleMediaMetadata(job: Job): job is Job & {
  metadata: NonNullable<Job['metadata']>;
} {
  const metadata = job.metadata;
  return Boolean(
    metadata &&
      (metadata.resolution ||
        metadata.requestedQuality ||
        metadata.effectiveQuality ||
        metadata.bitrate ||
        metadata.codec ||
        metadata.qualityNote)
  );
}

function CompactSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-md border bg-muted/15 px-4 py-3">
      <div className="mb-2.5 flex min-w-0 items-center justify-between gap-2">
        <h3 className="truncate text-[15px] font-semibold">{title}</h3>
        {meta && (
          <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function CompactField({
  label,
  children,
  mono = false,
  title,
  className = '',
  truncateValue = true,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
  title?: string;
  className?: string;
  truncateValue?: boolean;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-0.5 min-w-0 text-[15px]',
          truncateValue && 'truncate',
          mono && 'font-mono text-xs'
        )}
        title={title}
      >
        {children}
      </div>
    </div>
  );
}

function SubmissionCompactList({
  submissions,
}: {
  submissions?: JobSubmissionSummary[];
}) {
  if (!submissions || submissions.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无关联投稿任务</p>;
  }

  const visibleSubmissions = submissions.slice(0, 3);
  const hiddenCount = submissions.length - visibleSubmissions.length;

  return (
    <div className="min-w-0 space-y-1.5">
      {visibleSubmissions.map((submission) => (
        <div
          key={submission.id}
          className="min-w-0 rounded-md bg-background/70 px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <div
                className="truncate text-[15px] font-medium"
                title={submission.title}
              >
                {submission.title}
              </div>
            </div>
            <SubmissionStatusBadge
              status={submission.status}
              className="shrink-0"
            />
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span>
              分P{' '}
              {submission.totalParts > 0
                ? `${submission.completedParts}/${submission.totalParts}`
                : '-'}
            </span>
            <span>{formatDateTime(submission.updatedAt)}</span>
            <span className="min-w-0">
              {submission.bvid ? (
                <a
                  href={`https://www.bilibili.com/video/${submission.bvid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 max-w-[180px] items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{submission.bvid}</span>
                </a>
              ) : (
                '未生成 BVID'
              )}
            </span>
          </div>

          {submission.lastError && (
            <div
              className="mt-1 truncate text-xs text-destructive"
              title={submission.lastError}
            >
              {submission.lastError}
            </div>
          )}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="text-xs text-muted-foreground">
          还有 {hiddenCount} 条投稿，可在 B站投稿页查看完整列表
        </div>
      )}
    </div>
  );
}
