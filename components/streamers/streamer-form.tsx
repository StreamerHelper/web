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
import { Loader2, Link2, Upload, X } from 'lucide-react';
import type { Platform, StreamerFormValues } from '@/types';
import { QUALITY_OPTIONS, BILIBILI_CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';

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
} as const;

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
    }

    return null;
  } catch {
    return null;
  }
}

const streamerSchema = z.object({
  platform: z.enum(['bilibili', 'huya', 'douyu'], {
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
  uploadSettings: z.object({
    autoUpload: z.boolean(),
    title: z.string().max(80, '标题模板最多80个字符').optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tid: z.number().optional(),
  }).optional(),
});

interface StreamerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (data: StreamerFormValues) => void | Promise<void>;
  onUpdate?: (data: StreamerFormValues) => void | Promise<void>;
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
      title: values?.uploadSettings?.title || '',
      description: values?.uploadSettings?.description || '',
      tags: values?.uploadSettings?.tags || [],
      tid: values?.uploadSettings?.tid || 171,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(buildDefaultValues(initialValues));
    setCoverPreview(initialValues?.coverUrl || null);
    setTagInput('');
  }, [form, initialValues, open]);

  const handleParseUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('请输入直播间链接');
      return;
    }

    setIsParsing(true);
    const parsed = parseStreamerUrl(urlInput.trim());

    if (parsed) {
      // Auto-fill the form
      form.setValue('platform', parsed.platform);
      form.setValue('roomId', parsed.roomId);
      if (parsed.streamerId) {
        form.setValue('streamerId', parsed.streamerId);
      } else {
        form.setValue('streamerId', parsed.roomId);
      }
      toast.success('解析成功', {
        description: `已识别为 ${parsed.platform} 平台，房间号: ${parsed.roomId}`,
      });
      setUrlInput('');
    } else {
      toast.error('无法解析链接', {
        description: '请检查链接是否正确，支持 B站、虎牙、斗鱼直播间链接',
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
    if (mode === 'create') {
      await onCreate?.(values as StreamerFormValues);
    } else {
      await onUpdate?.(values as StreamerFormValues);
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* URL Parsing - only in create mode */}
            {mode === 'create' && (
              <div className="flex gap-2">
                <div className="flex-1">
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

            {/* Two column layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - 录制设置 */}
              <div className="space-y-4">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择平台" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bilibili">Bilibili</SelectItem>
                          <SelectItem value="huya">虎牙</SelectItem>
                          <SelectItem value="douyu">斗鱼</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
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
                    <div className="flex gap-2">
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              </div>

              {/* Right Column - 投稿设置 */}
              <div className="space-y-4">
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
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uploadSettings.title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>视频标题</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="支持模板变量: {streamerName}, {date}, {time}"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        留空时使用系统默认模板。可用变量：
                        {` {streamerName} `}
                        、{`{date}`}、{`{time}`}。例如：
                        {` {streamerName}的直播录像 {date} {time}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uploadSettings.tid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>投稿分区</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value || 171)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择投稿分区" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BILIBILI_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={String(category.value)}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <div className="flex gap-2">
                          <Input
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
              </div>
            </div>

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
