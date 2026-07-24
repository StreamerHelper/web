'use client';

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  Loader2,
  MousePointerClick,
  QrCode,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { BilibiliAuthPanel } from '@/components/content/bilibili-auth-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  DouyinBrowserLoginInteraction,
  DouyinBrowserLoginStatus,
  DouyinCookieVerification,
} from '@/types';

function formatDateTime(value?: string | null) {
  if (!value) {
    return '未验证';
  }
  return new Date(value).toLocaleString();
}

function CredentialBadge({
  active,
  expired,
}: {
  active: boolean;
  expired?: boolean;
}) {
  if (active && !expired) {
    return (
      <Badge className="bg-green-500 text-white">
        <CheckCircle className="mr-1 h-3 w-3" />
        已保存
      </Badge>
    );
  }

  if (expired) {
    return (
      <Badge variant="secondary" className="bg-amber-500 text-white">
        <AlertTriangle className="mr-1 h-3 w-3" />
        已过期
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <XCircle className="mr-1 h-3 w-3" />
      未保存
    </Badge>
  );
}

function CookieNames({ names }: { names?: string[] }) {
  if (!names?.length) {
    return <span className="text-muted-foreground">无</span>;
  }

  return (
    <span className="break-words text-muted-foreground">
      {names.slice(0, 8).join(', ')}
      {names.length > 8 ? ` 等 ${names.length} 项` : ''}
    </span>
  );
}

function BrowserLoginBadge({
  status,
}: {
  status?: DouyinBrowserLoginStatus['status'];
}) {
  if (!status) {
    return null;
  }

  if (status === 'initializing') {
    return (
      <Badge variant="outline">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        启动中
      </Badge>
    );
  }

  if (status === 'waiting') {
    return (
      <Badge variant="secondary">
        <QrCode className="mr-1 h-3 w-3" />
        等待扫码
      </Badge>
    );
  }

  if (status === 'verification_required') {
    return (
      <Badge variant="secondary" className="bg-amber-500 text-white">
        <ShieldCheck className="mr-1 h-3 w-3" />
        需要验证
      </Badge>
    );
  }

  if (status === 'authenticated') {
    return (
      <Badge className="bg-green-500 text-white">
        <CheckCircle className="mr-1 h-3 w-3" />
        已保存
      </Badge>
    );
  }

  if (status === 'expired') {
    return (
      <Badge variant="secondary" className="bg-amber-500 text-white">
        <AlertTriangle className="mr-1 h-3 w-3" />
        已超时
      </Badge>
    );
  }

  if (status === 'cancelled') {
    return <Badge variant="outline">已取消</Badge>;
  }

  return (
    <Badge variant="destructive">
      <AlertTriangle className="mr-1 h-3 w-3" />
      失败
    </Badge>
  );
}

function isBrowserLoginTerminal(
  status?: DouyinBrowserLoginStatus['status']
): boolean {
  return Boolean(
    status &&
      ['authenticated', 'expired', 'failed', 'cancelled'].includes(status)
  );
}

function getContainedImageClickRatios(
  event: ReactMouseEvent<HTMLButtonElement>,
  image: HTMLImageElement
): { xRatio: number; yRatio: number } | null {
  if (!image.naturalWidth || !image.naturalHeight) {
    return null;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = rect.width / rect.height;
  const renderedWidth =
    imageRatio > boxRatio ? rect.width : rect.height * imageRatio;
  const renderedHeight =
    imageRatio > boxRatio ? rect.width / imageRatio : rect.height;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  const x = event.clientX - rect.left - offsetX;
  const y = event.clientY - rect.top - offsetY;

  if (x < 0 || y < 0 || x > renderedWidth || y > renderedHeight) {
    return null;
  }

  return {
    xRatio: x / renderedWidth,
    yRatio: y / renderedHeight,
  };
}

type CredentialKey = 'bilibili' | 'douyin';

function CredentialPanel({
  id,
  title,
  description,
  badges,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  badges: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-lg border bg-background transition-colors',
        expanded && 'border-primary/40 shadow-sm'
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{title}</h3>
            {badges}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant={expanded ? 'secondary' : 'outline'}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          className="w-full shrink-0 sm:w-auto"
        >
          <Settings className="mr-2 h-4 w-4" />
          账号设置
          <ChevronDown
            className={cn(
              'ml-1 h-4 w-4 transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {expanded && (
        <div id={`${id}-content`} className="border-t bg-muted/20 p-4">
          {children}
        </div>
      )}
    </section>
  );
}

export function LoginCredentialsSection() {
  const queryClient = useQueryClient();
  const [expandedCredential, setExpandedCredential] =
    useState<CredentialKey | null>(null);
  const [douyinCookie, setDouyinCookie] = useState('');
  const [douyinRoomId, setDouyinRoomId] = useState('');
  const [douyinBrowserSessionId, setDouyinBrowserSessionId] = useState<
    string | null
  >(null);
  const [douyinBrowserInput, setDouyinBrowserInput] = useState('');
  const handledDouyinBrowserSessionIdRef = useRef<string | null>(null);
  const [lastVerification, setLastVerification] =
    useState<DouyinCookieVerification | null>(null);

  const { data: bilibiliStatus, isLoading: isLoadingBilibili } = useQuery({
    queryKey: ['bilibili', 'auth', 'status'],
    queryFn: api.getBilibiliAuthStatus,
  });

  const { data: douyinStatus, isLoading: isLoadingDouyin } = useQuery({
    queryKey: ['douyin', 'auth', 'status'],
    queryFn: api.getDouyinAuthStatus,
  });

  const { data: douyinBrowserLoginStatus } = useQuery({
    queryKey: ['douyin', 'auth', 'browser-login', douyinBrowserSessionId],
    queryFn: () => api.getDouyinBrowserLoginStatus(douyinBrowserSessionId!),
    enabled: Boolean(douyinBrowserSessionId),
    refetchInterval: query => {
      const status = (query.state.data as DouyinBrowserLoginStatus | undefined)
        ?.status;
      return isBrowserLoginTerminal(status) ? false : 2000;
    },
  });

  const saveDouyinMutation = useMutation({
    mutationFn: () =>
      api.saveDouyinCookie({
        cookie: douyinCookie,
        roomId: douyinRoomId.trim() || undefined,
        verify: true,
      }),
    onSuccess: data => {
      setDouyinCookie('');
      setLastVerification(data.verification || null);
      queryClient.invalidateQueries({ queryKey: ['douyin', 'auth', 'status'] });
      toast.success('抖音凭证已保存');
    },
  });

  const verifyDouyinMutation = useMutation({
    mutationFn: () =>
      api.verifyDouyinCookie({
        cookie: douyinCookie.trim() || undefined,
        roomId: douyinRoomId.trim() || undefined,
      }),
    onSuccess: data => {
      setLastVerification(data);
      queryClient.invalidateQueries({ queryKey: ['douyin', 'auth', 'status'] });
      if (data.ok) {
        toast.success('抖音凭证验证通过');
      } else {
        toast.error(data.error || '抖音凭证验证失败');
      }
    },
  });

  const startDouyinBrowserLoginMutation = useMutation({
    mutationFn: () =>
      api.startDouyinBrowserLogin({
        roomId: douyinRoomId.trim() || undefined,
      }),
    onSuccess: data => {
      handledDouyinBrowserSessionIdRef.current = null;
      setDouyinBrowserInput('');
      setDouyinBrowserSessionId(data.sessionId);
      toast.success('抖音登录窗口已启动');
    },
  });

  const interactWithDouyinBrowserLoginMutation = useMutation({
    mutationFn: (interaction: DouyinBrowserLoginInteraction) =>
      api.interactWithDouyinBrowserLogin(
        douyinBrowserSessionId!,
        interaction
      ),
    onSuccess: data => {
      queryClient.setQueryData(
        ['douyin', 'auth', 'browser-login', data.sessionId],
        data
      );
    },
  });

  const cancelDouyinBrowserLoginMutation = useMutation({
    mutationFn: () => api.cancelDouyinBrowserLogin(douyinBrowserSessionId!),
    onSuccess: () => {
      setDouyinBrowserSessionId(null);
      toast.success('抖音登录已取消');
    },
  });

  const clearDouyinMutation = useMutation({
    mutationFn: api.logoutDouyin,
    onSuccess: () => {
      setLastVerification(null);
      queryClient.invalidateQueries({ queryKey: ['douyin', 'auth', 'status'] });
      toast.success('抖音凭证已清除');
    },
  });

  useEffect(() => {
    if (
      !douyinBrowserLoginStatus ||
      !isBrowserLoginTerminal(douyinBrowserLoginStatus.status) ||
      handledDouyinBrowserSessionIdRef.current ===
        douyinBrowserLoginStatus.sessionId
    ) {
      return;
    }

    handledDouyinBrowserSessionIdRef.current =
      douyinBrowserLoginStatus.sessionId;
    if (douyinBrowserLoginStatus.status === 'authenticated') {
      queryClient.invalidateQueries({ queryKey: ['douyin', 'auth', 'status'] });
      toast.success('抖音登录凭证已保存');
    } else if (douyinBrowserLoginStatus.status === 'expired') {
      toast.error('抖音登录已超时');
    } else if (douyinBrowserLoginStatus.status === 'failed') {
      toast.error(douyinBrowserLoginStatus.error || '抖音登录失败');
    }
  }, [
    douyinBrowserLoginStatus,
    queryClient,
  ]);

  useEffect(() => {
    const openFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const target =
        window.location.hash === '#bilibili-credentials' ||
        params.get('credential') === 'bilibili'
          ? 'bilibili'
          : window.location.hash === '#douyin-credentials' ||
              params.get('credential') === 'douyin'
            ? 'douyin'
            : null;

      if (!target) {
        return;
      }

      setExpandedCredential(target);
      requestAnimationFrame(() => {
        document
          .getElementById(`${target}-credentials`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    openFromLocation();
    window.addEventListener('hashchange', openFromLocation);

    return () => window.removeEventListener('hashchange', openFromLocation);
  }, []);

  const bilibiliActive =
    Boolean(bilibiliStatus?.isAuthenticated) && !bilibiliStatus?.tokenExpired;
  const douyinActive = Boolean(douyinStatus?.isAuthenticated);
  const isDouyinDatabaseCredential = douyinStatus?.source === 'database';
  const isSavingDouyin = saveDouyinMutation.isPending;
  const isVerifyingDouyin = verifyDouyinMutation.isPending;
  const isClearingDouyin = clearDouyinMutation.isPending;
  const isStartingDouyinLogin = startDouyinBrowserLoginMutation.isPending;
  const isCancellingDouyinLogin = cancelDouyinBrowserLoginMutation.isPending;
  const hasActiveDouyinBrowserSession = Boolean(
    douyinBrowserSessionId &&
      !isBrowserLoginTerminal(douyinBrowserLoginStatus?.status)
  );
  const douyinLoginScreenshotUrl =
    douyinBrowserSessionId && douyinBrowserLoginStatus?.screenshotUpdatedAt
      ? api.getDouyinBrowserLoginScreenshotUrl(
          douyinBrowserSessionId,
          douyinBrowserLoginStatus.screenshotUpdatedAt
        )
      : null;
  const handleDouyinBrowserClick = (
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    const image = event.currentTarget.querySelector('img');
    if (
      !image ||
      !douyinBrowserSessionId ||
      interactWithDouyinBrowserLoginMutation.isPending
    ) {
      return;
    }

    const ratios = getContainedImageClickRatios(event, image);
    if (!ratios) {
      return;
    }
    interactWithDouyinBrowserLoginMutation.mutate({
      type: 'click',
      ...ratios,
    });
  };
  const typeIntoDouyinBrowser = () => {
    const text = douyinBrowserInput.trim();
    if (!text || !douyinBrowserSessionId) {
      return;
    }
    interactWithDouyinBrowserLoginMutation.mutate(
      { type: 'type', text },
      {
        onSuccess: () => setDouyinBrowserInput(''),
      }
    );
  };
  const toggleCredential = (credential: CredentialKey) => {
    setExpandedCredential(current =>
      current === credential ? null : credential
    );
  };

  return (
    <Card id="login-credentials">
      <CardHeader>
        <CardTitle>登录凭证</CardTitle>
        <CardDescription>集中管理投稿和直播平台的登录状态</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CredentialPanel
          id="bilibili-credentials"
          title="B 站投稿账号"
          description={
            bilibiliStatus?.account?.name
              ? `${bilibiliStatus.account.name} · MID ${bilibiliStatus.account.mid}`
              : '用于自动投稿和合集管理'
          }
          badges={
            isLoadingBilibili ? (
              <Badge variant="outline">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                检查中
              </Badge>
            ) : (
              <CredentialBadge
                active={bilibiliActive}
                expired={bilibiliStatus?.tokenExpired}
              />
            )
          }
          expanded={expandedCredential === 'bilibili'}
          onToggle={() => toggleCredential('bilibili')}
        >
          <BilibiliAuthPanel />
        </CredentialPanel>

        <CredentialPanel
          id="douyin-credentials"
          title="抖音直播登录"
          description="用于抖音直播间页面验证和取流请求"
          badges={
            <>
              {isLoadingDouyin ? (
                <Badge variant="outline">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  检查中
                </Badge>
              ) : (
                <CredentialBadge active={douyinActive} />
              )}
              {douyinStatus?.source === 'config' && (
                <Badge variant="secondary">配置文件</Badge>
              )}
              <BrowserLoginBadge status={douyinBrowserLoginStatus?.status} />
            </>
          }
          expanded={expandedCredential === 'douyin'}
          onToggle={() => toggleCredential('douyin')}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2 sm:max-w-sm">
                <Label htmlFor="douyin-room-id">验证直播间</Label>
                <Input
                  id="douyin-room-id"
                  value={douyinRoomId}
                  onChange={event => setDouyinRoomId(event.target.value)}
                  placeholder="116422730252"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => verifyDouyinMutation.mutate()}
                  disabled={
                    isVerifyingDouyin || (!douyinActive && !douyinCookie.trim())
                  }
                >
                  {isVerifyingDouyin ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  验证
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => clearDouyinMutation.mutate()}
                  disabled={isClearingDouyin || !isDouyinDatabaseCredential}
                >
                  {isClearingDouyin ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  清除
                </Button>
              </div>
            </div>

            <Tabs defaultValue="browser" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="browser">
                  <QrCode className="h-4 w-4" />
                  扫码登录
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Save className="h-4 w-4" />
                  手动 Cookie
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browser" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => startDouyinBrowserLoginMutation.mutate()}
                        disabled={
                          isStartingDouyinLogin || hasActiveDouyinBrowserSession
                        }
                      >
                        {isStartingDouyinLogin ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="mr-2 h-4 w-4" />
                        )}
                        开始登录
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          cancelDouyinBrowserLoginMutation.mutate()
                        }
                        disabled={
                          isCancellingDouyinLogin ||
                          !hasActiveDouyinBrowserSession
                        }
                      >
                        {isCancellingDouyinLogin ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        取消
                      </Button>
                    </div>

                    {douyinBrowserLoginStatus?.status ===
                      'verification_required' && (
                      <>
                        <Alert>
                          <MousePointerClick className="h-4 w-4" />
                          <AlertDescription>
                            扫码已完成，抖音要求进一步验证。请直接点击右侧登录画面选择短信或刷脸验证。
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="douyin-browser-input">
                            验证码或页面输入
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="douyin-browser-input"
                              value={douyinBrowserInput}
                              onChange={event =>
                                setDouyinBrowserInput(event.target.value)
                              }
                              onKeyDown={event => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  typeIntoDouyinBrowser();
                                }
                              }}
                              placeholder="先点击画面中的输入框"
                              maxLength={128}
                              autoComplete="one-time-code"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={typeIntoDouyinBrowser}
                              disabled={
                                !douyinBrowserInput.trim() ||
                                interactWithDouyinBrowserLoginMutation.isPending
                              }
                            >
                              {interactWithDouyinBrowserLoginMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              <span className="sr-only">输入到登录页面</span>
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            如需短信验证码，先在右侧画面点击输入框，再从这里输入。
                          </p>
                        </div>
                      </>
                    )}

                    {douyinBrowserLoginStatus?.error && (
                      <span className="text-sm text-destructive">
                        {douyinBrowserLoginStatus.error}
                      </span>
                    )}
                  </div>

                  <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-md border bg-background">
                    {douyinLoginScreenshotUrl ? (
                      <button
                        type="button"
                        className="relative block h-full max-h-[640px] w-full cursor-crosshair overflow-hidden outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        onClick={handleDouyinBrowserClick}
                        disabled={
                          !hasActiveDouyinBrowserSession ||
                          interactWithDouyinBrowserLoginMutation.isPending
                        }
                        aria-label="点击操作抖音远程登录页面"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={douyinLoginScreenshotUrl}
                          alt="抖音登录截图"
                          className="pointer-events-none h-full max-h-[640px] w-full object-contain"
                        />
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                        <QrCode className="h-8 w-8" />
                        <span>等待登录画面</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="douyin-cookie">Cookie</Label>
                  <Textarea
                    id="douyin-cookie"
                    value={douyinCookie}
                    onChange={event => setDouyinCookie(event.target.value)}
                    placeholder="ttwid=...; passport_csrf_token=...; sessionid=..."
                    className="min-h-28 resize-y font-mono text-xs"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => saveDouyinMutation.mutate()}
                  disabled={isSavingDouyin || !douyinCookie.trim()}
                >
                  {isSavingDouyin ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  保存并验证
                </Button>
              </TabsContent>
            </Tabs>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">已保存字段：</span>
                <CookieNames names={douyinStatus?.cookieNames} />
              </div>
              <div>
                <span className="text-muted-foreground">最近验证：</span>
                <span>{formatDateTime(douyinStatus?.verifiedAt)}</span>
              </div>
            </div>

            {lastVerification && (
              <Alert variant={lastVerification.ok ? 'default' : 'destructive'}>
                {lastVerification.ok ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {lastVerification.ok
                    ? `验证通过，HTTP ${lastVerification.statusCode || 200}`
                    : lastVerification.error || '验证失败'}
                </AlertDescription>
              </Alert>
            )}

            {douyinStatus?.lastValidationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {douyinStatus.lastValidationError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CredentialPanel>
      </CardContent>
    </Card>
  );
}
