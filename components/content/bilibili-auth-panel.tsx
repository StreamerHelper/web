'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBilibiliAuth } from '@/hooks';
import { cn } from '@/lib/utils';
import type { BilibiliQRCode } from '@/types';
import {
  AlertTriangle,
  CheckCircle,
  Crown,
  Loader2,
  LogOut,
  QrCode,
  RefreshCw,
  XCircle,
} from 'lucide-react';

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface BilibiliAuthPanelProps {
  className?: string;
}

export function BilibiliAuthPanel({ className }: BilibiliAuthPanelProps) {
  const {
    authStatus,
    isLoadingStatus,
    qrcode,
    isPolling,
    isGettingQRCode,
    isLoggingOut,
    startLogin,
    cancelLogin,
    logout,
  } = useBilibiliAuth();

  useEffect(() => {
    return () => cancelLogin();
  }, [cancelLogin]);

  const account = authStatus?.account;
  const expiresAt = authStatus?.expiresAt;
  const isTokenExpired =
    Boolean(authStatus?.isAuthenticated) && Boolean(authStatus?.tokenExpired);
  const isLoggedIn =
    Boolean(authStatus?.isAuthenticated) && Boolean(account) && !isTokenExpired;

  return (
    <div className={cn('grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]', className)}>
      <div className="rounded-lg border bg-background p-4">
        {isLoadingStatus ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isLoggedIn ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={account?.face} alt={account?.name} />
                <AvatarFallback>
                  {account?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{account?.name}</p>
                  <Badge className="bg-green-500 text-xs text-white">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    已登录
                  </Badge>
                  {account?.vipStatus === 1 && (
                    <Badge variant="secondary" className="bg-amber-500 text-xs text-white">
                      <Crown className="mr-1 h-3 w-3" />
                      会员
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  MID: {account?.mid} · Lv.{account?.level}
                </p>
              </div>
            </div>

            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Token 过期: {new Date(expiresAt).toLocaleString()}
              </p>
            )}

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={logout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              退出登录
            </Button>
          </div>
        ) : isTokenExpired ? (
          <LoginPrompt
            icon={<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            title="登录已过期"
            description="请重新扫码登录"
            buttonLabel="重新登录"
            loading={isGettingQRCode}
            disabled={isGettingQRCode || isPolling}
            onStart={startLogin}
          />
        ) : (
          <LoginPrompt
            icon={<XCircle className="h-5 w-5 text-muted-foreground" />}
            title="未登录"
            description="请扫码登录 B 站账号"
            buttonLabel="获取登录二维码"
            loading={isGettingQRCode}
            disabled={isGettingQRCode || isPolling}
            onStart={startLogin}
          />
        )}
      </div>

      <div className="flex min-h-[260px] items-center justify-center rounded-lg border bg-background p-4">
        {qrcode ? (
          <BilibiliQRCodeBox
            key={qrcode.authCode}
            qrcode={qrcode}
            isPolling={isPolling}
            onCancel={cancelLogin}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <QrCode className="h-8 w-8" />
            <span>等待登录二维码</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BilibiliQRCodeBox({
  qrcode,
  isPolling,
  onCancel,
}: {
  qrcode: BilibiliQRCode;
  isPolling: boolean;
  onCancel: () => void;
}) {
  const [countdown, setCountdown] = useState(qrcode.expiresIn);

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPolling]);

  return (
    <div className="flex w-full flex-col items-center space-y-3">
      <div className="rounded-lg border bg-white p-2">
        <QRCodeSVG
          value={qrcode.url}
          size={180}
          level="H"
          includeMargin={false}
        />
      </div>
      <div className="text-center text-xs text-muted-foreground">
        {isPolling ? (
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-3 w-3 animate-spin text-primary" />
            <span>等待扫码...</span>
          </div>
        ) : (
          <p>请使用 B 站 App 扫描二维码</p>
        )}
        <p className="mt-1">
          有效期:{' '}
          <span className={countdown < 60 ? 'text-destructive' : ''}>
            {formatCountdown(countdown)}
          </span>
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        className="w-full"
      >
        取消
      </Button>
    </div>
  );
}

function LoginPrompt({
  icon,
  title,
  description,
  buttonLabel,
  loading,
  disabled,
  onStart,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  disabled: boolean;
  onStart: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onStart}
        disabled={disabled}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <QrCode className="mr-2 h-4 w-4" />
        )}
        {buttonLabel}
      </Button>
    </div>
  );
}
