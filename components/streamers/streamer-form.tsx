'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Link2, Plus, RefreshCw, Upload, X } from 'lucide-react';
import type {
  BilibiliPartition,
  BilibiliSeason,
  Platform,
  StreamerFormValues,
} from '@/types';
import { api } from '@/lib/api';
import { QUALITY_OPTIONS } from '@/lib/constants';
import { toast } from 'sonner';
import {
  DEFAULT_BILIBILI_HUMAN_TYPE2,
  PartitionMenu,
} from '@/components/bilibili/partition-menu';

// URL parsing patterns
const URL_PATTERNS = {
  bilibili: [
    /live\.bilibili\.com\/(\d+)/,
    /b23\.tv\/(\w+)/,
  ],
  huya: [
    /huya\.com\/(\w+)/,
  ],
  douyu: [
    /douyu\.com\/(\d+)/,
  ],
  douyin: [
    /live\.douyin\.com\/([^/?#]+)/,
    /douyin\.com\/root\/live\/([^/?#]+)/,
  ],
} as const;

const COLLECTION_NONE_VALUE = 'none';

interface ParsedUrl {
  platform: Platform;
  roomId: string;
  streamerId?: string;
}

function parseStreamerUrl(url: string): ParsedUrl | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);

    for (const [platform, patterns] of Object.entries(URL_PATTERNS)) {
      for (const pattern of patterns) {
        const match = urlObj.pathname.match(pattern);
        if (match) {
          return {
            platform: platform as Platform,
            roomId: match[1],
          };
        }
      }
    }

    // Try hostname matching as fallback
    const hostname = urlObj.hostname;
    if (hostname.includes('bilibili')) {
      const match = urlObj.pathname.match(/\/(\d+)/);
      if (match) {
        return { platform: 'bilibili', roomId: match[1] };
      }
    } else if (hostname.includes('huya')) {
      const match = urlObj.pathname.match(/\/(\w+)/);
      if (match) {
        return { platform: 'huya', roomId: match[1] };
      }
    } else if (hostname.includes('douyu')) {
      const match = urlObj.pathname.match(/\/(\d+)/);
      if (match) {
        return { platform: 'douyu', roomId: match[1] };
      }
    } else if (hostname.includes('douyin')) {
      const rootLiveMatch = urlObj.pathname.match(/^\/root\/live\/([^/?#]+)/);
      if (rootLiveMatch) {
        return { platform: 'douyin', roomId: rootLiveMatch[1] };
      }
      if (hostname === 'live.douyin.com') {
        const liveMatch = urlObj.pathname.match(/^\/([^/?#]+)/);
        if (liveMatch) {
          return { platform: 'douyin', roomId: liveMatch[1] };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

const streamerSchema = z
  .object({
    platform: z.enum(['bilibili', 'huya', 'douyu', 'douyin'], {
      message: '请选择平台',
    }),
    streamerId: z.string().min(1, '请输入主播 ID'),
    roomId: z.string().min(1, '请输入房间号'),
    name: z.string().min(1, '请输入主播名称'),
    isActive: z.boolean(),
    coverPath: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
    coverDataUrl: z.string().optional(),
    removeCover: z.boolean().optional(),
    recordSettings: z.object({
      quality: z.string().optional(),
      detectHighlights: z.boolean(),
    }),
    uploadSettings: z
      .object({
        autoUpload: z.boolean(),
        rhythm: z
          .object({
            mode: z.enum(['complete', 'segmented']),
            intervalMinutes: z
              .number()
              .int('投稿间隔必须是整数')
              .min(1, '投稿间隔至少 1 分钟')
              .max(720, '投稿间隔最多 720 分钟'),
          })
          .optional(),
        title: z.string().max(80, '标题模板最多80个字符').optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        humanType2: z.number().optional(),
        collection: z
          .object({
            autoAdd: z.boolean(),
            seasonId: z.number().nullable().optional(),
            sectionId: z.number().nullable().optional(),
            seasonTitle: z.string().nullable().optional(),
            sectionTitle: z.string().nullable().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const collection = data.uploadSettings?.collection;
    if (
      collection?.autoAdd &&
      (!collection.seasonId || !collection.sectionId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请选择投稿合集',
        path: ['uploadSettings', 'collection', 'sectionId'],
      });
    }
  });

interface StreamerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (
    data: StreamerFormValues
  ) => void | boolean | Promise<void | boolean>;
  onUpdate?: (
    data: StreamerFormValues
  ) => void | boolean | Promise<void | boolean>;
  isLoading?: boolean;
  initialValues?: Partial<StreamerFormValues>;
  mode?: 'create' | 'edit';
}

export function StreamerFormDialog({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  isLoading = false,
  initialValues,
  mode = 'create',
}: StreamerFormDialogProps) {
  const buildDefaultValues = (
    values?: Partial<StreamerFormValues>
  ): z.infer<typeof streamerSchema> => ({
    platform: values?.platform || 'bilibili',
    streamerId: values?.streamerId || '',
    roomId: values?.roomId || '',
    name: values?.name || '',
    isActive: values?.isActive ?? true,
    coverPath: values?.coverPath ?? null,
    coverUrl: values?.coverUrl ?? null,
    coverDataUrl: undefined,
    removeCover: false,
    recordSettings: {
      quality: values?.recordSettings?.quality || 'medium',
      detectHighlights: values?.recordSettings?.detectHighlights ?? false,
    },
    uploadSettings: {
      autoUpload: values?.uploadSettings?.autoUpload ?? true,
      rhythm: {
        mode: values?.uploadSettings?.rhythm?.mode || 'complete',
        intervalMinutes:
          values?.uploadSettings?.rhythm?.intervalMinutes ?? 30,
      },
      title: values?.uploadSettings?.title || '',
      description: values?.uploadSettings?.description || '',
      tags: values?.uploadSettings?.tags || [],
      humanType2:
        values?.uploadSettings?.humanType2 || DEFAULT_BILIBILI_HUMAN_TYPE2,
      collection: {
        autoAdd: values?.uploadSettings?.collection?.autoAdd ?? false,
        seasonId: values?.uploadSettings?.collection?.seasonId ?? null,
        sectionId: values?.uploadSettings?.collection?.sectionId ?? null,
        seasonTitle: values?.uploadSettings?.collection?.seasonTitle ?? null,
        sectionTitle: values?.uploadSettings?.collection?.sectionTitle ?? null,
      },
    },
  });

  const form = useForm<z.infer<typeof streamerSchema>>({
    resolver: zodResolver(streamerSchema),
    defaultValues: buildDefaultValues(initialValues),
  });

  // URL parsing state and handler
  const [urlInput, setUrlInput] = useState('');
  // Tag input state
  const [tagInput, setTagInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialValues?.coverUrl || null
  );
  const [partitions, setPartitions] = useState<BilibiliPartition[]>([]);
  const [loadingPartitions, setLoadingPartitions] = useState(false);
  const [seasons, setSeasons] = useState<BilibiliSeason[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [showCollectionCreator, setShowCollectionCreator] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(buildDefaultValues(initialValues));
    setCoverPreview(initialValues?.coverUrl || null);
    setTagInput('');
    setShowCollectionCreator(false);
    setNewCollectionTitle(
      initialValues?.name ? `${initialValues.name}直播录像` : ''
    );
    setNewCollectionDesc('');
  }, [form, initialValues, open]);

  const loadPartitions = (options?: { refresh?: boolean }) => {
    setLoadingPartitions(true);
    api
      .getBilibiliPartitions({ refresh: options?.refresh })
      .then(data => {
        setPartitions(data.partitions);
      })
      .catch(() => {
        toast.error('加载投稿分区失败');
      })
      .finally(() => {
        setLoadingPartitions(false);
      });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    loadPartitions();
  }, [open]);

  const loadSeasons = (options?: { refresh?: boolean }) => {
    setLoadingSeasons(true);
    api
      .getBilibiliSeasons({ refresh: options?.refresh })
      .then(data => {
        setSeasons(data.seasons);
      })
      .catch(() => {
        setSeasons([]);
        if (form.getValues('uploadSettings.collection.autoAdd')) {
          toast.error('加载投稿合集失败');
        }
      })
      .finally(() => {
        setLoadingSeasons(false);
      });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    loadSeasons();
  }, [open]);

  const flattenedCollectionOptions = seasons.flatMap(season =>
    season.sections.map(section => ({
      value: `${season.id}:${section.id}`,
      seasonId: season.id,
      seasonTitle: season.title,
      sectionId: section.id,
      sectionTitle: section.title,
      label:
        section.title && section.title !== '正片'
          ? `${season.title} / ${section.title}`
          : season.title,
    }))
  );
  const selectedCollection = form.watch('uploadSettings.collection');
  const collectionAutoAdd = Boolean(selectedCollection?.autoAdd);
  const rhythmMode = form.watch('uploadSettings.rhythm.mode') || 'complete';
  const selectedCollectionValue =
    selectedCollection?.seasonId && selectedCollection?.sectionId
      ? `${selectedCollection.seasonId}:${selectedCollection.sectionId}`
      : COLLECTION_NONE_VALUE;
  const collectionOptions =
    selectedCollectionValue !== COLLECTION_NONE_VALUE &&
    !flattenedCollectionOptions.some(
      option => option.value === selectedCollectionValue
    )
      ? [
          {
            value: selectedCollectionValue,
            seasonId: Number(selectedCollection?.seasonId),
            seasonTitle:
              selectedCollection?.seasonTitle ||
              `合集 ${selectedCollection?.seasonId}`,
            sectionId: Number(selectedCollection?.sectionId),
            sectionTitle: selectedCollection?.sectionTitle || '正片',
            label:
              selectedCollection?.seasonTitle &&
              selectedCollection?.sectionTitle &&
              selectedCollection.sectionTitle !== '正片'
                ? `${selectedCollection.seasonTitle} / ${selectedCollection.sectionTitle}`
                : selectedCollection?.seasonTitle ||
                  `合集 ${selectedCollection?.seasonId}`,
          },
          ...flattenedCollectionOptions,
        ]
      : flattenedCollectionOptions;

  const clearCollectionSelection = () => {
    form.setValue('uploadSettings.collection.autoAdd', false, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.seasonId', null, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.sectionId', null, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.seasonTitle', null, {
      shouldDirty: true,
    });
    form.setValue('uploadSettings.collection.sectionTitle', null, {
      shouldDirty: true,
    });
  };

  const handleSelectCollection = (value: string) => {
    if (value === COLLECTION_NONE_VALUE) {
      clearCollectionSelection();
      return;
    }

    const option = flattenedCollectionOptions.find(item => item.value === value);
    if (!option) {
      return;
    }

    form.setValue('uploadSettings.collection.autoAdd', true, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.seasonId', option.seasonId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.sectionId', option.sectionId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.seasonTitle', option.seasonTitle, {
      shouldDirty: true,
    });
    form.setValue('uploadSettings.collection.sectionTitle', option.sectionTitle, {
      shouldDirty: true,
    });
  };

  const bindCollection = (
    season: BilibiliSeason,
    section: BilibiliSeason['sections'][number]
  ) => {
    form.setValue('uploadSettings.collection.autoAdd', true, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.seasonId', season.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.sectionId', section.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('uploadSettings.collection.seasonTitle', season.title, {
      shouldDirty: true,
    });
    form.setValue('uploadSettings.collection.sectionTitle', section.title, {
      shouldDirty: true,
    });
  };

  const handleCreateCollection = async () => {
    const streamerName = form.getValues('name').trim();
    const title =
      newCollectionTitle.trim() ||
      (streamerName ? `${streamerName}直播录像` : '直播录像合集');
    const cover =
      form.getValues('coverDataUrl') ||
      form.getValues('coverPath') ||
      initialValues?.coverPath ||
      undefined;

    if (!cover) {
      toast.error('请先上传主播封面');
      return;
    }

    setCreatingSeason(true);
    try {
      const result = await api.createBilibiliSeason({
        title,
        desc: newCollectionDesc.trim() || undefined,
        cover,
      });
      const season = result.season;
      const section = season.sections[0];
      setSeasons(current => [
        season,
        ...current.filter(item => item.id !== season.id),
      ]);

      if (!section) {
        toast.error('合集已创建，但未返回可绑定的小节');
        return;
      }

      bindCollection(season, section);
      setShowCollectionCreator(false);
      setNewCollectionTitle('');
      setNewCollectionDesc('');
      toast.success('合集已创建并绑定');
    } finally {
      setCreatingSeason(false);
    }
  };

  const handleParseUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('请输入直播间链接');
      return;
    }

    setIsParsing(true);
    const parsed = parseStreamerUrl(urlInput.trim());

    if (parsed) {
      // Auto-fill the form
      form.setValue('platform', parsed.platform, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue('roomId', parsed.roomId, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (parsed.streamerId) {
        form.setValue('streamerId', parsed.streamerId, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else {
        form.setValue('streamerId', parsed.roomId, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      toast.success('解析成功', {
        description: `已识别为 ${parsed.platform} 平台，房间号: ${parsed.roomId}`,
      });
      setUrlInput('');
    } else {
      toast.error('无法解析链接', {
        description: '请检查链接是否正确，支持 B站、虎牙、斗鱼、抖音直播间链接',
      });
    }
    setIsParsing(false);
  };

  // Tag handlers
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    const currentTags = form.getValues('uploadSettings.tags') || [];
    if (currentTags.includes(tag)) {
      toast.error('标签已存在');
      return;
    }
    if (currentTags.length >= 10) {
      toast.error('最多添加10个标签');
      return;
    }
    form.setValue('uploadSettings.tags', [...currentTags, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('uploadSettings.tags') || [];
    form.setValue(
      'uploadSettings.tags',
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleSubmit = async (values: z.infer<typeof streamerSchema>) => {
    let shouldClose: void | boolean;
    if (mode === 'create') {
      shouldClose = await onCreate?.(values as StreamerFormValues);
    } else {
      shouldClose = await onUpdate?.(values as StreamerFormValues);
    }

    if (shouldClose === false) {
      return;
    }

    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleSelectCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('封面仅支持 JPG、PNG 或 WebP');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('封面不能超过 5MB');
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read cover file'));
        reader.readAsDataURL(file);
      });

      form.setValue('coverDataUrl', dataUrl, { shouldDirty: true });
      form.setValue('removeCover', false, { shouldDirty: true });
      setCoverPreview(dataUrl);
      event.target.value = '';
    } catch {
      toast.error('读取封面文件失败');
      event.target.value = '';
    }
  };

  const handleRemoveCover = () => {
    setCoverPreview(null);
    form.setValue('coverDataUrl', undefined, { shouldDirty: true });
    form.setValue(
      'removeCover',
      Boolean(form.getValues('coverPath') || initialValues?.coverPath),
      { shouldDirty: true }
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '添加主播' : '编辑主播'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? '添加新的主播到监控列表'
              : '修改主播信息'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="min-w-0 space-y-4"
          >
            {/* URL Parsing - only in create mode */}
            {mode === 'create' && (
              <div className="flex min-w-0 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="粘贴直播间链接，自动识别平台和房间号"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleParseUrl();
                        }
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleParseUrl}
                  disabled={isParsing || !urlInput.trim()}
                >
                  {isParsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '解析'
                  )}
                </Button>
              </div>
            )}

            <Tabs defaultValue="recording" className="min-w-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="recording">录制设置</TabsTrigger>
                <TabsTrigger value="submission">投稿设置</TabsTrigger>
              </TabsList>

              <TabsContent value="recording" className="min-w-0 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">基本信息</h3>
                  <p className="text-xs text-muted-foreground">
                    主播识别和录制配置
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>平台</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择平台" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bilibili">Bilibili</SelectItem>
                          <SelectItem value="huya">虎牙</SelectItem>
                          <SelectItem value="douyu">斗鱼</SelectItem>
                          <SelectItem value="douyin">抖音</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="streamerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>主播 ID</FormLabel>
                        <FormControl>
                          <Input placeholder="平台唯一ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>房间号</FormLabel>
                        <FormControl>
                          <Input placeholder="直播间ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主播名称</FormLabel>
                      <FormControl>
                        <Input placeholder="输入主播名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>主播封面</FormLabel>
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                      {coverPreview ? (
                        <img
                          src={coverPreview}
                          alt="主播封面预览"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          未上传封面
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleSelectCover}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {coverPreview ? '更换封面' : '上传封面'}
                      </Button>
                      {coverPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveCover}
                        >
                          删除封面
                        </Button>
                      )}
                    </div>
                    <FormDescription className="text-xs">
                      支持 JPG、PNG、WebP，大小不超过 5MB。投稿到 B 站时会默认使用这张封面。
                    </FormDescription>
                  </div>
                </FormItem>

                <FormField
                  control={form.control}
                  name="recordSettings.quality"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>录制质量</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择录制质量" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {QUALITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        保存到主播配置，自动录制、手动开始和重试都会沿用这项清晰度请求。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">启用监控</FormLabel>
                          <FormDescription className="text-xs">
                            自动检查直播状态
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
	                          checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recordSettings.detectHighlights"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">检测高光</FormLabel>
                          <FormDescription className="text-xs">
                            自动检测精彩片段
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
	                          checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="submission" className="min-w-0 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">投稿设置</h3>
                  <p className="text-xs text-muted-foreground">
                    视频上传到B站的默认信息
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="uploadSettings.autoUpload"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">启用投稿</FormLabel>
                        <FormDescription className="text-xs">
                          录制完成后自动投稿
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
	                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="uploadSettings.rhythm.mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>投稿节奏</FormLabel>
                        <Select
                          value={field.value || 'complete'}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择投稿节奏" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="complete">
                              录制结束后投稿
                            </SelectItem>
                            <SelectItem value="segmented">
                              分段投稿
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {rhythmMode === 'segmented' && (
                    <FormField
                      control={form.control}
                      name="uploadSettings.rhythm.intervalMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>投稿间隔（分钟）</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={720}
                              step={1}
                              {...field}
                              value={field.value ?? 30}
                              onChange={event =>
                                field.onChange(Number(event.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="uploadSettings.title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>视频标题</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="支持模板变量: {主播名}, {房间名}, {日期}, {时间}"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        留空时使用系统默认模板。可用变量：
                        {` {主播名} `}
                        、{`{房间名}`}（录制开始时房间名）、{`{日期}`}、
                        {`{时间}`}。例如：
                        {` {主播名}的{房间名}直播录像 {日期} {时间}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uploadSettings.humanType2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>投稿分区</FormLabel>
                      <FormControl>
                        <PartitionMenu
                          partitions={partitions}
                          value={field.value || DEFAULT_BILIBILI_HUMAN_TYPE2}
                          onChange={field.onChange}
                          disabled={loadingPartitions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uploadSettings.collection.autoAdd"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">加入投稿合集</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={checked => {
                            if (checked) {
                              field.onChange(true);
                              return;
                            }
                            clearCollectionSelection();
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uploadSettings.collection.sectionId"
                  render={() => (
                    <FormItem>
                      <FormLabel>投稿合集</FormLabel>
                      <div className="flex min-w-0 flex-wrap gap-2">
                        <div className="min-w-[12rem] flex-1">
                          <Select
                            value={selectedCollectionValue}
                            onValueChange={handleSelectCollection}
                            disabled={!collectionAutoAdd || loadingSeasons}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="选择投稿合集" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={COLLECTION_NONE_VALUE}>
                                不加入合集
                              </SelectItem>
                              {collectionOptions.map(option => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          aria-label="刷新投稿合集"
                          onClick={() => loadSeasons({ refresh: true })}
                          disabled={loadingSeasons}
                        >
                          {loadingSeasons ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => {
                            const streamerName = form.getValues('name').trim();
                            setNewCollectionTitle(
                              newCollectionTitle ||
                                (streamerName ? `${streamerName}直播录像` : '')
                            );
                            setShowCollectionCreator(value => !value);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          新建
                        </Button>
                      </div>
                      {showCollectionCreator && (
                        <div className="mt-3 space-y-3 rounded-lg border p-3">
                          <Input
                            placeholder="合集标题"
                            value={newCollectionTitle}
                            onChange={event =>
                              setNewCollectionTitle(event.target.value)
                            }
                          />
                          <Textarea
                            placeholder="合集简介"
                            className="resize-none"
                            rows={2}
                            value={newCollectionDesc}
                            onChange={event =>
                              setNewCollectionDesc(event.target.value)
                            }
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowCollectionCreator(false)}
                              disabled={creatingSeason}
                            >
                              取消
                            </Button>
                            <Button
                              type="button"
                              onClick={handleCreateCollection}
                              disabled={creatingSeason}
                            >
                              {creatingSeason && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              创建并绑定
                            </Button>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uploadSettings.tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标签</FormLabel>
                      <div className="space-y-2">
                        <div className="flex min-w-0 gap-2">
                          <Input
                            className="min-w-0"
                            placeholder="输入标签"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                          >
                            <X className="h-4 w-4 rotate-45" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 min-h-[28px]">
                          {(field.value || []).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              {tag}
                              <X className="ml-1 h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uploadSettings.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>视频简介</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="视频简介内容"
                          className="resize-none"
                          rows={3}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? '添加' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
