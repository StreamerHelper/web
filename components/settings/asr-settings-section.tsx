'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Save,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { AsrAvailableModel, AsrSettings } from '@/types';

const DEFAULT_ASR_SETTINGS: AsrSettings = {
  enabled: true,
  provider: 'aliyun',
  apiKeyEnv: 'DASHSCOPE_API_KEY',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen3-asr-flash',
  language: 'zh-CN',
  chunkSeconds: 240,
  concurrency: 1,
  transcribeRecordings: true,
  available: false,
  apiKeySet: false,
  apiKeyMasked: '',
};

export function AsrSettingsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['system', 'asr-settings'],
    queryFn: api.getAsrSettings,
  });

  return (
    <AsrSettingsForm
      key={data ? 'loaded' : 'loading'}
      settings={data ?? DEFAULT_ASR_SETTINGS}
      isLoading={isLoading}
    />
  );
}

interface AsrSettingsFormProps {
  settings: AsrSettings;
  isLoading: boolean;
}

function AsrSettingsForm({ settings, isLoading }: AsrSettingsFormProps) {
  const queryClient = useQueryClient();
  const asrModelsQuery = useQuery({
    queryKey: ['system', 'asr-models'],
    queryFn: api.getAsrModels,
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const [enabled, setEnabled] = useState(settings.enabled);
  const [transcribeRecordings, setTranscribeRecordings] = useState(
    settings.transcribeRecordings
  );
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [model, setModel] = useState(settings.model);
  const [language, setLanguage] = useState(settings.language);
  const [chunkSeconds, setChunkSeconds] = useState(settings.chunkSeconds);
  const [concurrency, setConcurrency] = useState(settings.concurrency);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateAsrSettings({
        enabled,
        transcribeRecordings,
        apiKey: apiKey.trim() || undefined,
        baseUrl,
        model,
        language,
        chunkSeconds,
        concurrency,
    }),
    onSuccess: () => {
      setApiKey('');
      setApiKeyVisible(false);
      queryClient.invalidateQueries({ queryKey: ['system', 'asr-settings'] });
      toast.success('语音识别配置已保存');
    },
  });

  const ensureAsrModelsLoaded = () => {
    if (!asrModelsQuery.data && !asrModelsQuery.isFetching) {
      void asrModelsQuery.refetch();
    }
  };
  const displayedModels = (asrModelsQuery.data?.models ?? []).slice(0, 18);
  const hiddenModelCount = Math.max(
    0,
    (asrModelsQuery.data?.models ?? []).length - displayedModels.length
  );
  const modelListError =
    asrModelsQuery.data?.error || getAsrModelsError(asrModelsQuery.error);

  return (
    <Card id="asr-settings">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>阿里云语音识别</CardTitle>
            <CardDescription>
              配置直播录制分片的音频转文本和字幕生成能力
            </CardDescription>
          </div>
          {isLoading ? (
            <Badge variant="outline">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              检查中
            </Badge>
          ) : settings.available ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="mr-1 h-3 w-3" />
              可用
            </Badge>
          ) : (
            <Badge variant="outline">
              <XCircle className="mr-1 h-3 w-3" />
              未配置
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>启用语音识别</Label>
              <p className="text-xs text-muted-foreground">允许后台调用阿里云 ASR</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>录制后自动转写</Label>
              <p className="text-xs text-muted-foreground">视频分片上传后生成文本</p>
            </div>
            <Switch
              checked={transcribeRecordings}
              onCheckedChange={setTranscribeRecordings}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="asr-api-key">阿里云 DashScope AK</Label>
            <div className="relative">
              <Input
                id="asr-api-key"
                type={apiKeyVisible ? 'text' : 'password'}
                value={apiKey}
                onChange={event => setApiKey(event.target.value)}
                placeholder={
                  settings.apiKeySet ? settings.apiKeyMasked : 'sk-...'
                }
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={apiKeyVisible ? '隐藏 AK' : '显示 AK'}
                onClick={() => setApiKeyVisible(visible => !visible)}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {apiKeyVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asr-base-url">接口地址</Label>
            <Input
              id="asr-base-url"
              value={baseUrl}
              onChange={event => setBaseUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="asr-model">模型</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="查看阿里云可用模型"
                    onMouseEnter={ensureAsrModelsLoaded}
                    onFocus={ensureAsrModelsLoaded}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <CircleAlert className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  sideOffset={6}
                  className="max-w-[min(calc(100vw-2rem),380px)] p-3 text-left leading-relaxed"
                >
                  <AsrModelTooltipContent
                    isLoading={asrModelsQuery.isFetching && !asrModelsQuery.data}
                    models={displayedModels}
                    hiddenCount={hiddenModelCount}
                    error={modelListError}
                    source={asrModelsQuery.data?.source}
                  />
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="asr-model"
              value={model}
              onChange={event => setModel(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asr-language">语言</Label>
            <Input
              id="asr-language"
              value={language}
              onChange={event => setLanguage(event.target.value)}
            />
          </div>
          <div className="overflow-hidden rounded-lg border bg-muted/20 sm:col-span-2">
            <button
              type="button"
              aria-expanded={advancedOpen}
              aria-controls="asr-advanced-options"
              onClick={() => setAdvancedOpen(open => !open)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">高级选项</span>
                  <span className="block text-xs text-muted-foreground">
                    切片秒数和并发
                  </span>
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  advancedOpen && 'rotate-180'
                )}
              />
            </button>

            {advancedOpen && (
              <div
                id="asr-advanced-options"
                className="grid gap-3 border-t bg-background/60 p-3 sm:grid-cols-2"
              >
                <div className="space-y-2">
                  <Label htmlFor="asr-chunk-seconds">切片秒数</Label>
                  <Input
                    id="asr-chunk-seconds"
                    type="number"
                    min={30}
                    max={1800}
                    step={30}
                    value={chunkSeconds}
                    onChange={event => setChunkSeconds(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asr-concurrency">并发</Label>
                  <Input
                    id="asr-concurrency"
                    type="number"
                    min={1}
                    max={8}
                    step={1}
                    value={concurrency}
                    onChange={event => setConcurrency(Number(event.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存配置
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface AsrModelTooltipContentProps {
  isLoading: boolean;
  models: AsrAvailableModel[];
  hiddenCount: number;
  error?: string;
  source?: string;
}

function AsrModelTooltipContent({
  isLoading,
  models,
  hiddenCount,
  error,
  source,
}: AsrModelTooltipContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>正在从阿里云获取模型</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="font-medium">阿里云可用模型</div>
      {models.length > 0 ? (
        <div className="max-h-64 space-y-1.5 overflow-auto pr-1">
          {models.map(model => (
            <div
              key={model.id}
              className="rounded border border-background/20 bg-background/10 px-2 py-1"
            >
              <code className="break-all font-mono text-[11px]">{model.id}</code>
              {model.ownedBy ? (
                <div className="mt-0.5 text-[11px] opacity-70">
                  {model.ownedBy}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="opacity-75">暂无模型数据</p>
      )}
      {hiddenCount > 0 ? (
        <p className="opacity-75">还有 {hiddenCount} 个模型未显示</p>
      ) : null}
      {error ? (
        <p className="whitespace-pre-wrap break-words text-[11px] opacity-80">
          请求失败：{error}
        </p>
      ) : null}
      {source ? (
        <p className="truncate text-[11px] opacity-60" title={source}>
          {source}
        </p>
      ) : null}
    </div>
  );
}

function getAsrModelsError(error: unknown): string {
  if (!error) {
    return '';
  }

  const maybeAxiosError = error as {
    response?: {
      data?: {
        error?: string;
        message?: string;
      };
    };
    message?: string;
  };

  return (
    maybeAxiosError.response?.data?.error ||
    maybeAxiosError.response?.data?.message ||
    maybeAxiosError.message ||
    String(error)
  );
}
