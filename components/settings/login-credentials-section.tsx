'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  Loader2,
  QrCode,
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
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  DouyinBrowserLoginInteraction,
  DouyinBrowserLoginStatus,
  DouyinProfileVerification,
  DouyinAuthState,
  DouyinAuthStatus,
  DouyinVerificationMethod,
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

function resolveDouyinAuthState(
  status?: DouyinAuthStatus
): DouyinAuthState {
  if (status?.state) {
    return status.state;
  }

  if (status?.lastValidationError) {
    return 'challenged';
  }

  if (status?.isAuthenticated) {
    // Legacy backends only reported that a Cookie row existed. Do not treat
    // that boolean as proof that the real recording path still works.
    return 'validating';
  }

  if (status?.source) {
    return 'expired';
  }

  return 'unconfigured';
}

function DouyinAuthBadge({ state }: { state: DouyinAuthState }) {
  if (state === 'valid') {
    return (
      <Badge className="bg-green-500 text-white">
        <CheckCircle className="mr-1 h-3 w-3" />
        访问正常
      </Badge>
    );
  }

  if (state === 'validating') {
    return (
      <Badge variant="outline">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        验证中
      </Badge>
    );
  }

  if (state === 'challenged') {
    return (
      <Badge variant="secondary" className="bg-amber-500 text-white">
        <ShieldCheck className="mr-1 h-3 w-3" />
        需要验证
      </Badge>
    );
  }

  if (state === 'expired') {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="mr-1 h-3 w-3" />
        登录已失效
      </Badge>
    );
  }

  if (state === 'unknown') {
    return (
      <Badge variant="secondary" className="bg-amber-500 text-white">
        <AlertTriangle className="mr-1 h-3 w-3" />
        状态未知
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <XCircle className="mr-1 h-3 w-3" />
      未登录
    </Badge>
  );
}

function getDouyinAuthDescription(state: DouyinAuthState) {
  if (state === 'valid') {
    return '持久化浏览器会话已通过抖音账号接口验证';
  }
  if (state === 'validating') {
    return '正在使用持久化浏览器环境确认账号登录态';
  }
  if (state === 'challenged') {
    return '抖音要求完成二次验证，录播请求已停止重复尝试';
  }
  if (state === 'expired') {
    return '浏览器登录会话已失效，需要重新登录';
  }
  if (state === 'unknown') {
    return '暂时无法确认浏览器登录态，恢复 Browser 服务后可重新验证';
  }
  return '使用持久化浏览器环境完成登录，容器重启后仍会保留';
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

  if (status === 'validating') {
    return (
      <Badge variant="outline">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        正在确认
      </Badge>
    );
  }

  if (status === 'authenticated') {
    return (
      <Badge className="bg-green-500 text-white">
        <CheckCircle className="mr-1 h-3 w-3" />
        登录完成
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

type CredentialKey = 'bilibili' | 'douyin';

const DOUYIN_VERIFICATION_METHODS: Array<{
  value: DouyinVerificationMethod;
  label: string;
  description: string;
  default?: boolean;
}> = [
  {
    value: 'receive_sms',
    label: '接收短信验证码',
    description: '在绑定手机上接收验证码，并在这里提交',
    default: true,
  },
  {
    value: 'face',
    label: '手机刷脸认证',
    description: '按手机端提示完成人脸验证',
  },
  {
    value: 'send_sms',
    label: '发送短信验证',
    description: '使用绑定手机按抖音提示发送短信',
  },
];

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
  const [douyinRoomId, setDouyinRoomId] = useState('');
  const [douyinBrowserSessionId, setDouyinBrowserSessionId] = useState<
    string | null
  >(null);
  const [douyinVerificationCode, setDouyinVerificationCode] = useState('');
  const handledDouyinBrowserSessionIdRef = useRef<string | null>(null);
  const [lastVerification, setLastVerification] =
    useState<DouyinProfileVerification | null>(null);

  const { data: bilibiliStatus, isLoading: isLoadingBilibili } = useQuery({
    queryKey: ['bilibili', 'auth', 'status'],
    queryFn: api.getBilibiliAuthStatus,
  });

  const { data: douyinStatus, isLoading: isLoadingDouyin } = useQuery({
    queryKey: ['douyin', 'auth', 'status'],
    queryFn: api.getDouyinAuthStatus,
    refetchInterval: query =>
      resolveDouyinAuthState(query.state.data) === 'validating'
        ? 2000
        : 30000,
    refetchOnWindowFocus: true,
  });
  const douyinAuthState = resolveDouyinAuthState(douyinStatus);

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

  const verifyDouyinMutation = useMutation({
    mutationFn: () =>
      api.verifyDouyinProfile({
        roomId: douyinRoomId.trim() || undefined,
      }),
    onSuccess: data => {
      setLastVerification(data);
      queryClient.invalidateQueries({ queryKey: ['douyin', 'auth', 'status'] });
      if (data.ok) {
        toast.success('抖音账号登录态验证通过');
      } else {
        toast.error(data.error || '抖音账号登录态验证失败');
      }
    },
  });

  const startDouyinBrowserLoginMutation = useMutation({
    mutationFn: (fresh: boolean) =>
      api.startDouyinBrowserLogin({
        roomId: douyinRoomId.trim() || undefined,
        fresh,
      }),
    onSuccess: data => {
      handledDouyinBrowserSessionIdRef.current = null;
      setDouyinVerificationCode('');
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
    onMutate: async () => {
      if (douyinBrowserSessionId) {
        await queryClient.cancelQueries({
          queryKey: [
            'douyin',
            'auth',
            'browser-login',
            douyinBrowserSessionId,
          ],
          exact: true,
        });
      }
    },
    onSuccess: data => {
      queryClient.setQueryData(
        ['douyin', 'auth', 'browser-login', data.sessionId],
        data
      );
    },
    onSettled: () => {
      if (douyinBrowserSessionId) {
        queryClient.invalidateQueries({
          queryKey: [
            'douyin',
            'auth',
            'browser-login',
            douyinBrowserSessionId,
          ],
          exact: true,
        });
      }
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
      setDouyinBrowserSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['douyin', 'auth', 'status'] });
      toast.success('抖音浏览器登录状态已清除');
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
      toast.success('抖音账号登录态验证通过');
    } else if (douyinBrowserLoginStatus.status === 'expired') {
      toast.error('抖音登录已超时');
    } else if (douyinBrowserLoginStatus.status === 'failed') {
      toast.error(douyinBrowserLoginStatus.error || '抖音登录失败');
    }
  }, [douyinBrowserLoginStatus, queryClient]);

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
  const canClearDouyin =
    douyinAuthState !== 'unconfigured' && douyinStatus?.source !== 'config';
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
  const douyinVerification = douyinBrowserLoginStatus?.verification;
  const availableDouyinVerificationOptions =
    DOUYIN_VERIFICATION_METHODS.filter(option =>
      (douyinVerification?.availableMethods || []).includes(option.value)
    );
  const isDouyinSecondaryVerification =
    douyinVerification?.challenge === 'second_verification';
  const canProxyDouyinVerification =
    isDouyinSecondaryVerification &&
    (availableDouyinVerificationOptions.length > 0 ||
      Boolean(douyinVerification?.method));
  const selectDouyinVerificationMethod = (
    method: DouyinVerificationMethod
  ) => {
    if (!douyinBrowserSessionId) {
      return;
    }
    setDouyinVerificationCode('');
    interactWithDouyinBrowserLoginMutation.mutate({
      type: 'select_verification_method',
      method,
    });
  };
  const submitDouyinVerificationCode = () => {
    const code = douyinVerificationCode.trim();
    if (!code || !douyinBrowserSessionId) {
      return;
    }
    interactWithDouyinBrowserLoginMutation.mutate(
      { type: 'submit_verification_code', code },
      {
        onSuccess: () => setDouyinVerificationCode(''),
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
          description={getDouyinAuthDescription(douyinAuthState)}
          badges={
            <>
              {isLoadingDouyin ? (
                <Badge variant="outline">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  检查中
                </Badge>
              ) : (
                <DouyinAuthBadge state={douyinAuthState} />
              )}
              {douyinStatus?.source === 'config' && (
                <Badge variant="secondary">旧版配置</Badge>
              )}
              {douyinStatus?.profilePersistent && (
                <Badge variant="secondary">会话已持久化</Badge>
              )}
              <BrowserLoginBadge status={douyinBrowserLoginStatus?.status} />
            </>
          }
          expanded={expandedCredential === 'douyin'}
          onToggle={() => toggleCredential('douyin')}
        >
          <div className="space-y-4">
            {douyinStatus?.browserHealthy === false && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  持久化浏览器服务当前不可用。系统不会把此故障误判为登录失效，请先恢复 Browser 服务。
                </AlertDescription>
              </Alert>
            )}

            {douyinAuthState === 'validating' && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  正在同一个持久化浏览器环境中调用账号接口，确认成功前不会标记为已登录。
                </AlertDescription>
              </Alert>
            )}

            {douyinAuthState === 'challenged' && (
              <Alert className="border-amber-500/60">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  {douyinStatus?.lastValidationError ||
                    '抖音要求完成二次验证。点击“继续验证”，后续操作会由系统代理。'}
                </AlertDescription>
              </Alert>
            )}

            {douyinAuthState === 'expired' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  登录会话已经失效，请重新登录。系统不会继续使用旧 Cookie 假装已认证。
                </AlertDescription>
              </Alert>
            )}

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
                    isVerifyingDouyin ||
                    douyinAuthState === 'unconfigured' ||
                    hasActiveDouyinBrowserSession
                  }
                >
                  {isVerifyingDouyin ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  检查登录态
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => clearDouyinMutation.mutate()}
                  disabled={isClearingDouyin || !canClearDouyin}
                >
                  {isClearingDouyin ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  退出登录
                </Button>
              </div>
            </div>

            <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={() =>
                          startDouyinBrowserLoginMutation.mutate(
                            douyinAuthState !== 'challenged'
                          )
                        }
                        disabled={
                          isLoadingDouyin ||
                          isStartingDouyinLogin ||
                          hasActiveDouyinBrowserSession ||
                          douyinStatus?.browserHealthy === false
                        }
                      >
                        {isStartingDouyinLogin ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="mr-2 h-4 w-4" />
                        )}
                        {douyinAuthState === 'challenged'
                          ? '继续验证'
                          : douyinAuthState === 'expired' ||
                              douyinAuthState === 'valid'
                            ? '重新登录'
                            : '开始登录'}
                      </Button>
                      {douyinAuthState === 'challenged' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            startDouyinBrowserLoginMutation.mutate(true)
                          }
                          disabled={
                            isLoadingDouyin ||
                            isStartingDouyinLogin ||
                            hasActiveDouyinBrowserSession ||
                            douyinStatus?.browserHealthy === false
                          }
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          换号重新登录
                        </Button>
                      )}
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
                            <ShieldCheck className="h-4 w-4" />
                            <AlertDescription>
                              {canProxyDouyinVerification
                                ? '扫码已完成。后续验证由系统代理，不需要操作右侧登录画面。'
                                : douyinVerification?.prompt ||
                                  '抖音要求完成安全验证。'}
                            </AlertDescription>
                          </Alert>

                          {isDouyinSecondaryVerification &&
                            (!douyinVerification?.method ||
                              douyinVerification.stage ===
                                'choose_method') && (
                            <div className="space-y-3">
                              <Label>选择验证方式</Label>
                              {availableDouyinVerificationOptions.length ? (
                                <div className="grid gap-2">
                                  {availableDouyinVerificationOptions.map(
                                    option => (
                                      <Button
                                        key={option.value}
                                        type="button"
                                        variant={
                                          option.default ? 'default' : 'outline'
                                        }
                                        className="h-auto justify-start py-3 text-left"
                                        onClick={() =>
                                          selectDouyinVerificationMethod(
                                            option.value
                                          )
                                        }
                                        disabled={
                                          interactWithDouyinBrowserLoginMutation.isPending
                                        }
                                      >
                                        <span className="space-y-0.5">
                                          <span className="flex items-center gap-2 font-medium">
                                            {option.label}
                                            {option.default && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px]"
                                              >
                                                默认
                                              </Badge>
                                            )}
                                          </span>
                                          <span className="block text-xs font-normal opacity-80">
                                            {option.description}
                                          </span>
                                        </span>
                                      </Button>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {douyinVerification?.prompt ||
                                    '正在读取抖音提供的验证方式…'}
                                </div>
                              )}
                            </div>
                          )}

                          {douyinVerification?.stage === 'processing' && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {douyinVerification.prompt ||
                                '正在等待抖音确认账号登录态…'}
                            </div>
                          )}

                          {douyinVerification?.stage === 'awaiting_code' && (
                            <div className="space-y-3">
                              {douyinVerification.prompt && (
                                <p className="text-sm text-muted-foreground">
                                  {douyinVerification.prompt}
                                </p>
                              )}
                              <div className="space-y-2">
                                <Label htmlFor="douyin-verification-code">
                                  短信验证码
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="douyin-verification-code"
                                    value={douyinVerificationCode}
                                    onChange={event =>
                                      setDouyinVerificationCode(
                                        event.target.value.replace(/\D/g, '')
                                      )
                                    }
                                    onKeyDown={event => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        submitDouyinVerificationCode();
                                      }
                                    }}
                                    placeholder="请输入手机收到的验证码"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={8}
                                    autoComplete="one-time-code"
                                  />
                                  <Button
                                    type="button"
                                    onClick={submitDouyinVerificationCode}
                                    disabled={
                                      !/^\d{4,8}$/.test(
                                        douyinVerificationCode
                                      ) ||
                                      interactWithDouyinBrowserLoginMutation.isPending
                                    }
                                  >
                                    {interactWithDouyinBrowserLoginMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">提交短信验证码</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {douyinVerification?.stage ===
                            'awaiting_external' && (
                            <Alert>
                              <ShieldCheck className="h-4 w-4" />
                              <AlertDescription className="whitespace-pre-wrap">
                                {douyinVerification.prompt ||
                                  '请按手机端提示完成验证，系统会自动继续。'}
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                    )}

                    {douyinBrowserLoginStatus?.error && (
                      <span className="text-sm text-destructive">
                        {douyinBrowserLoginStatus.error}
                      </span>
                    )}
                  </div>

                  <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-md border bg-background">
                    {douyinBrowserLoginStatus?.status ===
                      'verification_required' &&
                    canProxyDouyinVerification ? (
                      <div className="flex max-w-64 flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                        <span>
                          验证操作已由系统代理，请在左侧完成当前验证步骤。
                        </span>
                      </div>
                    ) : douyinLoginScreenshotUrl ? (
                      <div className="relative block h-full max-h-[640px] w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={douyinLoginScreenshotUrl}
                          alt="抖音登录截图"
                          className="h-full max-h-[640px] w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                        <QrCode className="h-8 w-8" />
                        <span>等待登录画面</span>
                      </div>
                    )}
                  </div>
                </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">会话字段（诊断）：</span>
                <CookieNames names={douyinStatus?.cookieNames} />
              </div>
              <div>
                <span className="text-muted-foreground">最近验证：</span>
                <span>
                  {formatDateTime(
                    douyinStatus?.validatedAt ||
                      douyinStatus?.lastValidatedAt ||
                      douyinStatus?.verifiedAt
                  )}
                </span>
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
          </div>
        </CredentialPanel>
      </CardContent>
    </Card>
  );
}
