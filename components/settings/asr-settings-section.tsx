'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Loader2, Save, XCircle } from 'lucide-react';
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
import { api } from '@/lib/api';

export function AsrSettingsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['system', 'asr-settings'],
    queryFn: api.getAsrSettings,
  });

  const [enabled, setEnabled] = useState(true);
  const [transcribeRecordings, setTranscribeRecordings] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [language, setLanguage] = useState('');
  const [chunkSeconds, setChunkSeconds] = useState(240);
  const [concurrency, setConcurrency] = useState(1);

  useEffect(() => {
    if (!data) {
      return;
    }
    setEnabled(data.enabled);
    setTranscribeRecordings(data.transcribeRecordings);
    setBaseUrl(data.baseUrl);
    setModel(data.model);
    setLanguage(data.language);
    setChunkSeconds(data.chunkSeconds);
    setConcurrency(data.concurrency);
  }, [data]);

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
      queryClient.invalidateQueries({ queryKey: ['system', 'asr-settings'] });
      toast.success('语音识别配置已保存');
    },
  });

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
          ) : data?.available ? (
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
            <Input
              id="asr-api-key"
              type="password"
              value={apiKey}
              onChange={event => setApiKey(event.target.value)}
              placeholder={data?.apiKeySet ? data.apiKeyMasked : 'sk-...'}
              autoComplete="off"
            />
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
            <Label htmlFor="asr-model">模型</Label>
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
          <div className="grid grid-cols-2 gap-3">
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
