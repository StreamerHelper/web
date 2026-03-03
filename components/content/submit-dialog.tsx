'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { BrowsedJob, BilibiliPartition, BilibiliSubmission } from '@/types';

const submitSchema = z.object({
  title: z.string().min(1, '请输入标题').max(80, '标题最多80个字符'),
  description: z.string().max(2000, '简介最多2000个字符').optional(),
  tags: z.array(z.string()).max(10, '最多10个标签').optional(),
  tid: z.number().optional(),
});

type SubmitFormValues = z.infer<typeof submitSchema>;

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: BrowsedJob | null;
  onSuccess?: (submission: BilibiliSubmission) => void;
}

export function SubmitDialog({ open, onOpenChange, job, onSuccess }: SubmitDialogProps) {
  const [tagInput, setTagInput] = useState('');
  const [partitions, setPartitions] = useState<BilibiliPartition[]>([]);
  const [loadingPartitions, setLoadingPartitions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: [],
      tid: 171,
    },
  });

  // Load partitions
  useEffect(() => {
    if (open) {
      setLoadingPartitions(true);
      api.getBilibiliPartitions()
        .then((data) => {
          setPartitions(data.partitions);
        })
        .catch(() => {
          toast.error('加载分区列表失败');
        })
        .finally(() => {
          setLoadingPartitions(false);
        });
    }
  }, [open]);

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      const date = new Date(job.startTime);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      form.reset({
        title: `【直播回放】${job.title} - ${dateStr}`,
        description: `${job.streamerName} 直播回放\n\n直播时间：${dateStr}`,
        tags: ['直播回放', job.streamerName],
        tid: 171,
      });
    }
  }, [job, form]);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    const currentTags = form.getValues('tags') || [];
    if (currentTags.includes(tag)) {
      toast.error('标签已存在');
      return;
    }
    if (currentTags.length >= 10) {
      toast.error('最多添加10个标签');
      return;
    }
    form.setValue('tags', [...currentTags, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter((tag) => tag !== tagToRemove));
  };

  const onSubmit = async (values: SubmitFormValues) => {
    if (!job) return;

    setIsSubmitting(true);
    try {
      const submission = await api.createBilibiliSubmission({
        jobId: job.jobId,
        title: values.title,
        description: values.description,
        tags: values.tags,
        tid: values.tid || 171,
      });
      toast.success('投稿任务已创建');
      onSuccess?.(submission);
      onOpenChange(false);
    } catch {
      toast.error('创建投稿失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Flatten partitions for select
  const flattenedPartitions = partitions.flatMap((p) =>
    p.children?.map((c) => ({ id: c.id, name: `${p.name} - ${c.name}` })) || []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>投稿到B站</DialogTitle>
          <DialogDescription>
            填写视频信息，提交后将自动上传到B站
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>视频标题</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="输入视频标题"
                      maxLength={80}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormMessage />
                    <span className="text-xs text-muted-foreground ml-auto">
                      {field.value.length}/80
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>视频简介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入视频简介（可选）"
                      className="resize-none"
                      rows={3}
                      maxLength={2000}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>投稿分区</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={String(field.value || 171)}
                    disabled={loadingPartitions}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择投稿分区" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {flattenedPartitions.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
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
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标签</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入标签后按回车添加"
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
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                      >
                        添加
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
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
                  <FormDescription>
                    最多10个标签，点击标签可删除
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                提交投稿
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
