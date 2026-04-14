'use client';

import { JobListItem } from '@/components/shared/job-list-item';
import { JobTableRow } from '@/components/shared/job-table-row';
import { StatsCardSkeleton } from '@/components/shared/loading';
import { PageHeader } from '@/components/shared/page-header';
import { PlatformIcon } from '@/components/shared/platform-icon';
import { QualityBadge } from '@/components/shared/quality-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useJobs, useStopRecording, useStreamerStats, useSystemHealth, useSystemInfo } from '@/hooks';
import { formatDateTime, formatDuration } from '@/lib/format';
import type { Job } from '@/types';
import { Activity, CheckCircle, Radio, Square, Users } from 'lucide-react';
import { useState } from 'react';

const REFRESH_INTERVALS = [
  { value: '1000', label: '1秒' },
  { value: '3000', label: '3秒' },
  { value: '5000', label: '5秒' },
  { value: '10000', label: '10秒' },
  { value: '30000', label: '30秒' },
  { value: 'off', label: '关闭' },
];

export default function DashboardPage() {
  const [refreshInterval, setRefreshInterval] = useState<string>('1000');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const intervalMs = refreshInterval === 'off' ? false : parseInt(refreshInterval, 10);

  const { data: health, isLoading: healthLoading } = useSystemHealth(intervalMs);
  const { data: systemInfo, isLoading: infoLoading } = useSystemInfo(intervalMs);
  const { data: streamerStats, isLoading: streamerStatsLoading } = useStreamerStats();
  const { data: jobsData, isLoading: jobsLoading } = useJobs({
    pageSize: 20,
    sortBy: 'updatedAt',
    sortOrder: 'DESC',
  });

  const stopMutation = useStopRecording();

  const recordingJobs = jobsData?.data?.filter(j => j.status === 'recording') || [];
  const recentJobs = jobsData?.data?.filter(j => j.status !== 'recording').slice(0, 10) || [];

  const handleStop = async (job: Job) => {
    await stopMutation.mutateAsync(job.id);
    setSelectedJob(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="仪表板"
        description="系统总览和实时状态"
        actions={
          <Select value={refreshInterval} onValueChange={setRefreshInterval}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFRESH_INTERVALS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {healthLoading || infoLoading || streamerStatsLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card className="p-4 h-full">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">活跃主播</p>
                  <p className="text-2xl font-bold mt-1">{streamerStats?.active ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    共 {streamerStats?.total ?? 0} 个主播
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="p-4 h-full">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">正在直播</p>
                  <p className="text-2xl font-bold mt-1 text-red-500">{systemInfo?.streamers?.live?.count ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    当前开播中
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="p-4 h-full">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">正在录制</p>
                  <p className="text-2xl font-bold mt-1">{systemInfo?.jobs?.recording ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    实时录制中
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="p-4 h-full">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">今日完成</p>
                  <p className="text-2xl font-bold mt-1">{systemInfo?.jobs?.completed ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    共 {systemInfo?.jobs?.total ?? 0} 个任务
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>

            <Card className="p-4 h-full">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">系统状态</p>
                  <p className="text-2xl font-bold mt-1">{health?.status === 'ok' ? '正常' : '异常'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemInfo?.system?.version ?? '未知版本'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Recording Jobs */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">正在录制</h2>
          <p className="text-sm text-muted-foreground">当前正在进行的录制任务</p>
        </div>

        {jobsLoading ? (
          <Card>
            <div className="divide-y">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 animate-pulse bg-muted" />
              ))}
            </div>
          </Card>
        ) : recordingJobs.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              当前没有正在录制的任务
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y">
              {recordingJobs.map(job => (
                <JobListItem
                  key={job.id}
                  job={job}
                  onClick={setSelectedJob}
                />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Recent Jobs */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">最近任务</h2>
          <p className="text-sm text-muted-foreground">最近更新的录制任务</p>
        </div>

        {jobsLoading ? (
          <Card>
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-11 animate-pulse bg-muted" />
              ))}
            </div>
          </Card>
        ) : recentJobs.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              暂无最近任务
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border bg-card">
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
                {recentJobs.map(job => (
                  <JobTableRow
                    key={job.id}
                    job={job}
                    onClick={setSelectedJob}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

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
                      <span className="ml-2 font-mono text-xs">{selectedJob.id.slice(0, 8)}...</span>
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
                        {(selectedJob.metadata.requestedQuality ||
                          selectedJob.metadata.effectiveQuality) && (
                          <div>
                            <span className="text-muted-foreground">清晰度链路:</span>
                            <span className="ml-2 inline-flex items-center gap-2">
                              <QualityBadge
                                quality={selectedJob.metadata.requestedQuality}
                                variant="outline"
                                fallback="未设置"
                              />
                              {selectedJob.metadata.effectiveQuality && (
                                <>
                                  <span className="text-muted-foreground">→</span>
                                  <QualityBadge
                                    quality={selectedJob.metadata.effectiveQuality}
                                  />
                                </>
                              )}
                            </span>
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
                        {selectedJob.metadata.qualityNote && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">说明:</span>
                            <span className="ml-2">{selectedJob.metadata.qualityNote}</span>
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
                        onClick={() => handleStop(selectedJob)}
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
    </div>
  );
}
