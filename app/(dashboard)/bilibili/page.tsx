'use client';

import { AuthSidebar } from '@/components/content/auth-sidebar';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/format';
import type { BilibiliSubmission, SubmissionStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Send,
  Settings,
  Upload,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '等待中', icon: Clock, variant: 'secondary' },
  uploading: { label: '上传中', icon: Upload, variant: 'default' },
  submitting: { label: '提交中', icon: Send, variant: 'default' },
  completed: { label: '已完成', icon: CheckCircle, variant: 'default' },
  failed: { label: '失败', icon: XCircle, variant: 'destructive' },
};

export default function BilibiliPage() {
  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch submissions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bilibili', 'submissions', page, statusFilter],
    queryFn: () => api.getBilibiliSubmissions({
      page,
      pageSize,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    refetchInterval: 5000, // Refresh every 5 seconds for progress updates
  });

  // Check auth status
  const { data: authStatus } = useQuery({
    queryKey: ['bilibili', 'auth', 'status'],
    queryFn: api.getBilibiliAuthStatus,
  });

  const isLoggedIn = authStatus?.isAuthenticated && authStatus?.account;

  return (
    <div className="space-y-6">
      <PageHeader
        title="B站投稿"
        description="管理B站视频投稿任务"
      />

      {/* Auth Warning */}
      {!isLoggedIn && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">需要登录B站账号</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                请先登录B站账号才能使用投稿功能
              </p>
            </div>
            <Button onClick={() => setAuthSidebarOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              账号设置
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">等待中</SelectItem>
            <SelectItem value="uploading">上传中</SelectItem>
            <SelectItem value="submitting">提交中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => refetch()}>
          刷新
        </Button>

        <div className="ml-auto">
          <Button variant="outline" onClick={() => setAuthSidebarOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            账号设置
          </Button>
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">加载失败，请稍后重试</p>
          </CardContent>
        </Card>
      ) : !data?.items.length ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">暂无投稿记录</p>
            <p className="text-sm text-muted-foreground mt-1">
              在内容浏览页面选择视频进行投稿
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.items.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            第 {page} 页 / 共 {Math.ceil(data.total / pageSize)} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      <AuthSidebar open={authSidebarOpen} onOpenChange={setAuthSidebarOpen} />
    </div>
  );
}

// Submission Card Component
interface SubmissionCardProps {
  submission: BilibiliSubmission;
}

function SubmissionCard({ submission }: SubmissionCardProps) {
  const config = STATUS_CONFIG[submission.status];
  const StatusIcon = config.icon;
  const progress = submission.totalParts > 0
    ? Math.round((submission.completedParts / submission.totalParts) * 100)
    : 0;

  return (
    <Card>
      <CardContent className="py-2.5 px-4">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className={`
            flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
            ${submission.status === 'completed' ? 'bg-green-100 dark:bg-green-900' : ''}
            ${submission.status === 'failed' ? 'bg-red-100 dark:bg-red-900' : ''}
            ${submission.status === 'uploading' || submission.status === 'submitting' ? 'bg-blue-100 dark:bg-blue-900' : ''}
            ${submission.status === 'pending' ? 'bg-gray-100 dark:bg-gray-800' : ''}
          `}>
            {submission.status === 'uploading' || submission.status === 'submitting' ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <StatusIcon className={`
                h-4 w-4
                ${submission.status === 'completed' ? 'text-green-600 dark:text-green-400' : ''}
                ${submission.status === 'failed' ? 'text-red-600 dark:text-red-400' : ''}
                ${submission.status === 'pending' ? 'text-gray-500' : ''}
              `} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <h3 className="font-medium truncate text-sm">{submission.title}</h3>
            <Badge variant={config.variant} className="text-xs px-1.5 py-0">
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(submission.createdAt)}
            </span>

            {/* Success - BV Link */}
            {submission.status === 'completed' && submission.bvid && (
              <a
                href={`https://www.bilibili.com/video/${submission.bvid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                {submission.bvid}
              </a>
            )}

            {/* Failed - Error Message */}
            {submission.lastError && (
              <span className="text-xs text-destructive truncate">{submission.lastError}</span>
            )}
          </div>

          {/* Progress - Right side compact */}
          {(submission.status === 'uploading' || submission.status === 'submitting') && (
            <div className="flex items-center gap-2 shrink-0 w-32">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground w-12 text-right">
                {submission.completedParts}/{submission.totalParts}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
