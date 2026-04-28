'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { TableSkeleton } from '@/components/shared/loading';
import { PageHeader } from '@/components/shared/page-header';
import { PlatformIcon } from '@/components/shared/platform-icon';
import { QualityBadge } from '@/components/shared/quality-badge';
import { StreamerFormDialog } from '@/components/streamers/streamer-form';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreateStreamer,
  useDeleteStreamer,
  useJobs,
  useLiveStatus,
  useStartRecording,
  useStopRecording,
  useStreamers,
  useUpdateStreamer,
} from '@/hooks';
import { api } from '@/lib';
import type { Job, Platform, Streamer, StreamerFilterValues, StreamerFormValues } from '@/types';
import { MoreVertical, Pencil, Plus, Radio, Search, Trash2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PLATFORM_ROOM_URLS } from '@/lib/constants';

type PendingDeactivateRequest = {
  streamer: Streamer;
  data: Partial<StreamerFormValues>;
  recordingJob: Job;
  source: 'switch' | 'edit';
};

export default function StreamersPage() {
  const [filters, setFilters] = useState<StreamerFilterValues>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [streamerToDelete, setStreamerToDelete] = useState<Streamer | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editStreamer, setEditStreamer] = useState<Streamer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] =
    useState<PendingDeactivateRequest | null>(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [checkingDeactivate, setCheckingDeactivate] = useState(false);

  const { data: streamers, isLoading } = useStreamers(filters);
  const { data: jobsData } = useJobs();
  const createMutation = useCreateStreamer();
  const deleteMutation = useDeleteStreamer();
  const updateMutation = useUpdateStreamer();
  const startRecordingMutation = useStartRecording();
  const stopRecordingMutation = useStopRecording();

  // Live status hook
  const { getLiveStatus, getStreamTitle, checkSingle, isChecking } = useLiveStatus(streamers || [], {
    autoCheck: true,
    pollInterval: 60000,
  });

  const recordingStreamers = jobsData?.data
    ?.filter(j => j.status === 'recording')
    .map(j => j.streamerId) || [];

  const filteredStreamers = streamers?.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.streamerId.includes(searchQuery)
  ) || [];

  const handleDelete = async () => {
    if (streamerToDelete) {
      await deleteMutation.mutateAsync(streamerToDelete.id);
      setDeleteDialogOpen(false);
      setStreamerToDelete(null);
    }
  };

  const handleCheckLive = async (streamer: Streamer) => {
    let result: Awaited<ReturnType<typeof checkSingle>>;
    try {
      result = await checkSingle(streamer);
    } catch {
      return;
    }
    if (result && result.isLive) {
      toast.success(`${streamer.name} 正在直播！`, {
        description: result.title,
        action: {
          label: '开始录制',
          onClick: () => startRecordingMutation.mutate({
            streamerId: streamer.streamerId,
            platform: streamer.platform,
          }),
        },
      });
    } else {
      toast.info(`${streamer.name} 未开播`);
    }
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditStreamer(null);
    }
  };

  const closeDeactivateDialog = () => {
    setDeactivateDialogOpen(false);
    setPendingDeactivate(null);
  };

  const buildStreamerUpdatePayload = (
    streamer: Streamer
  ): StreamerFormValues => ({
    streamerId: streamer.streamerId,
    name: streamer.name,
    platform: streamer.platform,
    roomId: streamer.roomId,
    isActive: streamer.isActive ?? true,
    coverPath: streamer.coverPath ?? null,
    coverUrl: streamer.coverUrl ?? null,
    recordSettings: {
      quality: streamer.recordSettings?.quality ?? 'high',
      detectHighlights: streamer.recordSettings?.detectHighlights ?? false,
      autoDelete: streamer.recordSettings?.autoDelete,
    },
    uploadSettings: {
      autoUpload: streamer.uploadSettings?.autoUpload ?? true,
      rhythm: {
        mode: streamer.uploadSettings?.rhythm?.mode || 'complete',
        intervalMinutes:
          streamer.uploadSettings?.rhythm?.intervalMinutes ?? 30,
      },
      title: streamer.uploadSettings?.title || '',
      description: streamer.uploadSettings?.description || '',
      tags: streamer.uploadSettings?.tags || [],
      humanType2: streamer.uploadSettings?.humanType2,
      collection: streamer.uploadSettings?.collection,
    },
  });

  const findActiveRecordingJob = async (streamer: Streamer): Promise<Job | null> => {
    const jobs = await api.getJobs({
      streamerId: streamer.streamerId,
      status: 'recording',
      pageSize: 10,
    });

    return (
      jobs.data.find(
        job => job.status === 'recording' && job.platform === streamer.platform
      ) || null
    );
  };

  const requestDeactivateConfirmation = async (
    streamer: Streamer,
    data: Partial<StreamerFormValues>,
    source: PendingDeactivateRequest['source']
  ): Promise<boolean> => {
    setCheckingDeactivate(true);

    try {
      const recordingJob = await findActiveRecordingJob(streamer);

      if (!recordingJob) {
        await updateMutation.mutateAsync({
          id: streamer.id,
          data,
        });
        return true;
      }

      setPendingDeactivate({
        streamer,
        data,
        recordingJob,
        source,
      });
      setDeactivateDialogOpen(true);
      return false;
    } finally {
      setCheckingDeactivate(false);
    }
  };

  const handleToggleActive = async (streamer: Streamer) => {
    if (!streamer.isActive) {
      await updateMutation.mutateAsync({
        id: streamer.id,
        data: {
          ...buildStreamerUpdatePayload(streamer),
          isActive: true,
        },
      });
      return;
    }

    await requestDeactivateConfirmation(
      streamer,
      {
        ...buildStreamerUpdatePayload(streamer),
        isActive: false,
      },
      'switch'
    );
  };

  const handleEdit = (streamer: Streamer) => {
    setEditStreamer(streamer);
    setEditDialogOpen(true);
  };

  const handleDeactivateChoice = async (shouldStopRecording: boolean) => {
    if (!pendingDeactivate) {
      return;
    }

    try {
      if (shouldStopRecording) {
        await stopRecordingMutation.mutateAsync(pendingDeactivate.recordingJob.id);
      }

      await updateMutation.mutateAsync({
        id: pendingDeactivate.streamer.id,
        data: pendingDeactivate.data,
      });

      if (pendingDeactivate.source === 'edit') {
        handleEditDialogOpenChange(false);
      }

      closeDeactivateDialog();
    } catch {
      // mutations already surface errors via global toast
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="主播管理"
          description="管理监控的主播列表"
          actions={
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              添加主播
            </Button>
          }
        />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="主播管理"
        description="管理监控的主播列表"
        actions={
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加主播
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索主播名称或 ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.platform || 'all'}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, platform: value === 'all' ? undefined : value as Platform }))
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="选择平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="bilibili">Bilibili</SelectItem>
            <SelectItem value="huya">虎牙</SelectItem>
            <SelectItem value="douyu">斗鱼</SelectItem>
            <SelectItem value="douyin">抖音</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              isActive: value === 'all' ? undefined : value === 'active',
            }))
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">已启用</SelectItem>
            <SelectItem value="inactive">未启用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredStreamers.length === 0 ? (
        <EmptyState
          title="暂无主播"
          description="还没有添加任何主播，点击上方按钮添加"
          action={
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加主播
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>主播</TableHead>
              <TableHead>平台</TableHead>
              <TableHead>房间号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>录制清晰度</TableHead>
              <TableHead>直播状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredStreamers.map((streamer) => {
                const isRecording = recordingStreamers.includes(streamer.streamerId);
                const isLive = getLiveStatus(streamer.streamerId);
                const checking = isChecking(streamer.streamerId);
                const streamTitle = getStreamTitle(streamer.streamerId);
                return (
                  <TableRow key={streamer.id}>
                    <TableCell>
                      <a
                        href={PLATFORM_ROOM_URLS[streamer.platform](streamer.roomId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {streamer.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={streamTitle || undefined}>
                        {streamTitle || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlatformIcon platform={streamer.platform} showLabel />
                    </TableCell>
                    <TableCell>{streamer.roomId}</TableCell>
                    <TableCell>
                      <Switch
                        checked={streamer.isActive ?? false}
                        disabled={
                          updateMutation.isPending ||
                          stopRecordingMutation.isPending ||
                          checkingDeactivate
                        }
                        onCheckedChange={() => handleToggleActive(streamer)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <QualityBadge quality={streamer.recordSettings?.quality ?? 'high'} />
                        <div className="text-xs text-muted-foreground">
                          {streamer.recordSettings?.detectHighlights ? '启用高光检测' : '未启用高光检测'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {checking ? (
                        <Badge variant="outline" className="gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-pulse relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
                          </span>
                          检查中
                        </Badge>
                      ) : isLive ? (
                        <Badge variant="default" className="gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          直播中
                        </Badge>
                      ) : (
                        <Badge variant="outline">未开播</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCheckLive(streamer)}>
                            <Radio className="mr-2 h-4 w-4" />
                            检查直播
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(streamer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setStreamerToDelete(streamer);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      )}

      {/* Add Dialog */}
      <StreamerFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreate={async (data) => {
          await createMutation.mutateAsync(data);
          return true;
        }}
        isLoading={createMutation.isPending}
        mode="create"
      />

      {/* Edit Dialog */}
      {editStreamer && (
        <StreamerFormDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          onUpdate={async (data) => {
            if ((editStreamer.isActive ?? true) && data.isActive === false) {
              return await requestDeactivateConfirmation(editStreamer, data, 'edit');
            }

            await updateMutation.mutateAsync({
              id: editStreamer.id,
              data,
            });
            return true;
          }}
          isLoading={
            updateMutation.isPending ||
            stopRecordingMutation.isPending ||
            checkingDeactivate
          }
          initialValues={editStreamer}
          mode="edit"
        />
      )}

      <AlertDialog
        open={deactivateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeactivateDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>当前有正在录制的任务</AlertDialogTitle>
            <AlertDialogDescription>
              主播「{pendingDeactivate?.streamer.name}」当前仍在录制中。你可以直接停用监控，
              让本次录制继续；也可以先停止当前录制，再停用该主播。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={updateMutation.isPending || stopRecordingMutation.isPending}
              onClick={closeDeactivateDialog}
            >
              取消
            </AlertDialogCancel>
            <Button
              variant="outline"
              disabled={updateMutation.isPending || stopRecordingMutation.isPending}
              onClick={() => void handleDeactivateChoice(false)}
            >
              继续停用
            </Button>
            <Button
              disabled={updateMutation.isPending || stopRecordingMutation.isPending}
              onClick={() => void handleDeactivateChoice(true)}
            >
              停止录制并停用
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除主播「{streamerToDelete?.name}」吗？删除主播不会删除已录制的视频。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive"
              disabled={deleteMutation.isPending}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
