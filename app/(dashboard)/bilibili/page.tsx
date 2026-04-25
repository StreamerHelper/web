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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDateTime, formatDuration, formatFileSize } from '@/lib/format';
import type { BilibiliSubmission, SubmissionPart, SubmissionStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Send,
  Settings,
  Upload,
  XCircle,
} from 'lucide-react';
import { Fragment, useState } from 'react';

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
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="h-10 animate-pulse bg-muted/60" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 animate-pulse border-t bg-muted/30" />
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
        <SubmissionTable submissions={data.items} />
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

interface SubmissionTableProps {
  submissions: BilibiliSubmission[];
}

function SubmissionTable({ submissions }: SubmissionTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">展开详情</span>
          </TableHead>
          <TableHead className="min-w-[280px]">投稿标题</TableHead>
          <TableHead className="w-[120px]">状态</TableHead>
          <TableHead className="w-[170px]">投稿时间</TableHead>
          <TableHead className="w-[160px]">分 P 进度</TableHead>
          <TableHead className="min-w-[180px]">投稿合集</TableHead>
          <TableHead className="w-[160px]">B站稿件</TableHead>
          <TableHead className="min-w-[180px]">错误信息</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map(submission => {
          const expanded = expandedIds.has(submission.id);
          return (
            <Fragment key={submission.id}>
              <SubmissionRow
                submission={submission}
                expanded={expanded}
                onToggle={() => toggleExpanded(submission.id)}
              />
              {expanded && (
                <TableRow key={`${submission.id}-parts`} className="bg-muted/15 hover:bg-muted/15">
                  <TableCell colSpan={8} className="p-3">
                    <SubmissionPartsTable submission={submission} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

interface SubmissionRowProps {
  submission: BilibiliSubmission;
  expanded: boolean;
  onToggle: () => void;
}

function SubmissionRow({ submission, expanded, onToggle }: SubmissionRowProps) {
  const config = STATUS_CONFIG[submission.status];
  const StatusIcon = config.icon;
  const progress = submission.totalParts > 0
    ? Math.round((submission.completedParts / submission.totalParts) * 100)
    : 0;

  return (
    <TableRow>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggle}
          aria-label={expanded ? '收起分P详情' : '展开分P详情'}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
      <TableCell className="max-w-[420px]">
        <div className="truncate font-medium" title={submission.title}>
          {submission.title}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Job {submission.jobId}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={config.variant} className="gap-1.5">
          {submission.status === 'uploading' || submission.status === 'submitting' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <StatusIcon className="h-3 w-3" />
          )}
          {config.label}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDateTime(submission.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex min-w-[130px] items-center gap-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="w-11 text-right text-xs text-muted-foreground">
            {submission.completedParts}/{submission.totalParts}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {submission.collectionAutoAdd ? (
          <div className="min-w-0">
            <Badge variant="outline" className="max-w-[220px] truncate">
              {submission.collectionSeasonTitle || `合集 ${submission.collectionSeasonId}`}
            </Badge>
            {submission.collectionSectionTitle && (
              <div className="mt-1 text-xs text-muted-foreground">
                {submission.collectionSectionTitle}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {submission.bvid ? (
          <a
            href={`https://www.bilibili.com/video/${submission.bvid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {submission.bvid}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="max-w-[260px]">
        {submission.lastError ? (
          <span className="block truncate text-destructive" title={submission.lastError}>
            {submission.lastError}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function SubmissionPartsTable({ submission }: { submission: BilibiliSubmission }) {
  const parts = submission.parts || [];

  if (parts.length === 0) {
    return (
      <div className="rounded-md border bg-background px-3 py-6 text-center text-sm text-muted-foreground">
        暂无分 P 明细
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="px-1 text-sm font-medium">分 P 明细</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px]">序号</TableHead>
            <TableHead className="min-w-[160px]">分P标题</TableHead>
            <TableHead className="w-[140px]">投稿类型</TableHead>
            <TableHead className="w-[110px]">状态</TableHead>
            <TableHead className="w-[90px]">分片数</TableHead>
            <TableHead className="min-w-[250px]">时间范围</TableHead>
            <TableHead className="w-[90px]">时长</TableHead>
            <TableHead className="w-[110px]">文件大小</TableHead>
            <TableHead className="min-w-[160px]">B站文件名</TableHead>
            <TableHead className="w-[120px]">CID</TableHead>
            <TableHead className="min-w-[180px]">错误信息</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parts.map(part => (
            <SubmissionPartRow key={part.index} part={part} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SubmissionPartRow({ part }: { part: SubmissionPart }) {
  const status = getPartStatus(part.status);

  return (
    <TableRow>
      <TableCell className="font-mono">P{part.index}</TableCell>
      <TableCell className="font-medium">{part.title || '-'}</TableCell>
      <TableCell>{formatPartType(part)}</TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell>{part.s3Keys?.length || 0}</TableCell>
      <TableCell className="text-muted-foreground">
        {formatPartTimeRange(part)}
      </TableCell>
      <TableCell>{formatDuration(part.duration || 0)}</TableCell>
      <TableCell>{formatFileSize(part.size)}</TableCell>
      <TableCell className="max-w-[220px] truncate" title={part.filename || undefined}>
        {part.filename || '-'}
      </TableCell>
      <TableCell className="font-mono text-xs">{part.cid || '-'}</TableCell>
      <TableCell className="max-w-[240px] truncate text-destructive" title={part.error || undefined}>
        {part.error || '-'}
      </TableCell>
    </TableRow>
  );
}

function formatPartType(part: SubmissionPart): string {
  if (!part.rhythmIntervalMinutes) {
    return '常规分P';
  }

  if (part.index === 1) {
    return `首段投稿 / ${part.rhythmIntervalMinutes}分钟`;
  }

  return `追加分P / ${part.rhythmIntervalMinutes}分钟`;
}

function formatPartTimeRange(part: SubmissionPart): string {
  if (!part.startedAt && !part.endedAt) {
    return '-';
  }

  if (!part.endedAt || part.startedAt === part.endedAt) {
    return formatDateTime(part.startedAt);
  }

  return `${formatDateTime(part.startedAt)} - ${formatDateTime(part.endedAt)}`;
}

function getPartStatus(status: string): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  const statusMap: Record<string, {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }> = {
    pending: { label: '等待中', variant: 'secondary' },
    merging: { label: '合并中', variant: 'outline' },
    uploading: { label: '上传中', variant: 'default' },
    completed: { label: '已完成', variant: 'default' },
    failed: { label: '失败', variant: 'destructive' },
  };

  return statusMap[status] || { label: status || '-', variant: 'secondary' };
}
