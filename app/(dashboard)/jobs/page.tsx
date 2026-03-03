'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { JobTableRow } from '@/components/shared/job-table-row';
import { TableSkeleton } from '@/components/shared/loading';
import { PageHeader } from '@/components/shared/page-header';
import { PlatformIcon } from '@/components/shared/platform-icon';
import { StatusBadge } from '@/components/shared/status-badge';
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
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeleteJob, useJobs, useRetryJob, useStopRecording } from '@/hooks/use-jobs';
import { formatDateTime, formatDuration } from '@/lib/format';
import type { Job, JobStatus } from '@/types';
import { Square } from 'lucide-react';
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
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead className="py-2 px-3">直播间号</TableHead>
                <TableHead className="py-2 px-3">主播</TableHead>
                <TableHead className="py-2 px-3">平台</TableHead>
                <TableHead className="py-2 px-3">状态</TableHead>
                <TableHead className="py-2 px-3">进度</TableHead>
                <TableHead className="py-2 px-3">开始时间</TableHead>
                <TableHead className="py-2 px-3">时长</TableHead>
                <TableHead className="text-right py-2 px-3">操作</TableHead>
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
        </div>
      )}

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PlatformIcon platform={selectedJob.platform} />
                  {selectedJob.streamerName}
                  <StatusBadge status={selectedJob.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-medium mb-2">基本信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">任务 ID:</span>
                      <span className="ml-2 font-mono">{selectedJob.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">房间号:</span>
                      <span className="ml-2">{selectedJob.roomId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">创建时间:</span>
                      <span className="ml-2">{formatDateTime(selectedJob.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Recording Info */}
                <div>
                  <h3 className="text-sm font-medium mb-2">录制信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">开始时间:</span>
                      <span className="ml-2">{formatDateTime(selectedJob.startTime)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">结束时间:</span>
                      <span className="ml-2">
                        {selectedJob.endTime ? formatDateTime(selectedJob.endTime) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">录制时长:</span>
                      <span className="ml-2">{formatDuration(selectedJob.duration)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">视频片段:</span>
                      <span className="ml-2">{selectedJob.segmentCount > 0 ? `${selectedJob.segmentCount} 个` : '-'}</span>
                    </div>
                  </div>
                </div>

                {selectedJob.errorMessage && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-2 text-destructive">错误信息</h3>
                      <p className="text-sm text-destructive">{selectedJob.errorMessage}</p>
                    </div>
                  </>
                )}

                {selectedJob.metadata && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-2">元数据</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedJob.metadata.resolution && (
                          <div>
                            <span className="text-muted-foreground">分辨率:</span>
                            <span className="ml-2">{selectedJob.metadata.resolution}</span>
                          </div>
                        )}
                        {selectedJob.metadata.bitrate && (
                          <div>
                            <span className="text-muted-foreground">码率:</span>
                            <span className="ml-2">{selectedJob.metadata.bitrate} kbps</span>
                          </div>
                        )}
                        {selectedJob.metadata.codec && (
                          <div>
                            <span className="text-muted-foreground">编码:</span>
                            <span className="ml-2">{selectedJob.metadata.codec}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                {selectedJob.status === 'recording' && (
                  <>
                    <Separator />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setJobToAction(selectedJob);
                          setSelectedJob(null);
                          setStopDialogOpen(true);
                        }}
                      >
                        <Square className="mr-2 h-4 w-4" />
                        停止录制
                      </Button>
                    </div>
                  </>
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
