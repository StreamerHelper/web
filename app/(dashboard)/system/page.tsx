'use client';

import { useState } from 'react';
import { RotateCw, Database, HardDrive, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCardSkeleton } from '@/components/shared/loading';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSystemHealth, useSystemInfo, useCleanupOldData } from '@/hooks';
import { formatDuration } from '@/lib/format';

export default function SystemPage() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useSystemHealth();
  const { data: info, isLoading: infoLoading, refetch: refetchInfo } = useSystemInfo();
  const cleanupMutation = useCleanupOldData();
  const [cleanupDays, setCleanupDays] = useState(30);

  const handleRefresh = () => {
    refetchHealth();
    refetchInfo();
  };

  const handleCleanup = async () => {
    await cleanupMutation.mutateAsync(cleanupDays);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="系统监控"
        description="系统健康状态和队列监控"
        actions={
          <Button variant="outline" onClick={handleRefresh}>
            <RotateCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        }
      />

      {/* System Health */}
      <div>
        <h2 className="text-lg font-semibold mb-4">系统状态</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {healthLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">系统状态</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {health?.status === 'ok' ? '正常' : '异常'}
                    </span>
                    <Badge
                      variant={health?.status === 'ok' ? 'default' : 'destructive'}
                    >
                      {health?.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    运行时间: {health?.uptime ? formatDuration(health.uptime) : '-'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">平台信息</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">系统</span>
                      <span>{info?.system?.platform || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">架构</span>
                      <span>{info?.system?.arch || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">版本</span>
                      <span>{info?.system?.version || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">内存使用</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {info?.system?.memory
                      ? `${(info.system.memory.heapUsed / 1024 / 1024).toFixed(0)} MB`
                      : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    RSS: {info?.system?.memory
                      ? `${(info.system.memory.rss / 1024 / 1024).toFixed(0)} MB`
                      : '-'}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Queue Status */}
      {info && info.queues && (
        <Card>
          <CardHeader>
            <CardTitle>队列状态</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>队列名</TableHead>
                  <TableHead>等待中</TableHead>
                  <TableHead>活跃中</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(info.queues).map(([name, queue]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{queue.waiting}</TableCell>
                    <TableCell>{queue.active}</TableCell>
                    <TableCell>
                      <Badge variant={queue.active > 0 ? 'default' : 'secondary'}>
                        {queue.active > 0 ? '运行中' : '空闲'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  清理旧数据
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清理旧数据</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要清理 {cleanupDays} 天前的旧数据吗？此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanup}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">清理天数:</span>
              <Button
                variant={cleanupDays === 7 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCleanupDays(7)}
              >
                7 天
              </Button>
              <Button
                variant={cleanupDays === 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCleanupDays(30)}
              >
                30 天
              </Button>
              <Button
                variant={cleanupDays === 90 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCleanupDays(90)}
              >
                90 天
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
