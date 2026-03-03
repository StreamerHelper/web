'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBilibiliAuth } from '@/hooks';
import { CheckCircle, Loader2, LogOut, QrCode, RefreshCw, XCircle, Crown, AlertTriangle } from 'lucide-react';

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface AuthSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthSidebar({ open, onOpenChange }: AuthSidebarProps) {
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

  const [countdown, setCountdown] = useState<number>(0);

  // Countdown timer for QR code expiration
  useEffect(() => {
    if (qrcode && isPolling) {
      setCountdown(qrcode.expiresIn);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [qrcode, isPolling]);

  // Cleanup polling when sidebar closes
  useEffect(() => {
    if (!open) {
      cancelLogin();
    }
  }, [open, cancelLogin]);

  const isLoggedIn = authStatus?.isAuthenticated && authStatus?.account;
  const isTokenExpired = authStatus?.isAuthenticated && authStatus?.tokenExpired;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>B站账号管理</SheetTitle>
          <SheetDescription>
            管理B站账号授权，用于视频投稿
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Auth Status */}
          <div className="rounded-lg border p-4">
            {isLoadingStatus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isLoggedIn ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={authStatus.account?.face} alt={authStatus.account?.name} />
                    <AvatarFallback>
                      {authStatus.account?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{authStatus.account?.name}</p>
                      <Badge variant="default" className="bg-green-500 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已登录
                      </Badge>
                      {authStatus.account?.vipStatus === 1 && (
                        <Badge variant="secondary" className="bg-amber-500 text-white text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          会员
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      MID: {authStatus.account?.mid} · Lv.{authStatus.account?.level}
                    </p>
                  </div>
                </div>
                {authStatus.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Token 过期: {new Date(authStatus.expiresAt).toLocaleString()}
                  </p>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={logout}
                  disabled={isLoggingOut}
                  className="w-full"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  退出登录
                </Button>
              </div>
            ) : isTokenExpired ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">登录已过期</p>
                    <p className="text-xs text-muted-foreground">请重新扫码登录</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={startLogin}
                  disabled={isGettingQRCode || isPolling}
                  className="w-full"
                >
                  {isGettingQRCode ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  重新登录
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">未登录</p>
                    <p className="text-xs text-muted-foreground">请扫码登录B站账号</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={startLogin}
                  disabled={isGettingQRCode || isPolling}
                  className="w-full"
                >
                  {isGettingQRCode ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  获取登录二维码
                </Button>
              </div>
            )}
          </div>

          {/* QR Code */}
          {qrcode && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium mb-3">扫码登录</h3>
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-2 rounded-lg border">
                  <QRCodeSVG
                    value={qrcode.url}
                    size={160}
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
                    <p>请使用B站App扫描二维码</p>
                  )}
                  <p className="mt-1">
                    有效期: <span className={countdown < 60 ? 'text-destructive' : ''}>{formatCountdown(countdown)}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelLogin}
                  className="w-full"
                >
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-3">使用说明</h3>
            <ol className="text-xs text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] flex-shrink-0">1</span>
                <span>点击"获取登录二维码"按钮</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] flex-shrink-0">2</span>
                <span>使用B站App扫描二维码并确认登录</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] flex-shrink-0">3</span>
                <span>登录成功后即可使用视频投稿功能</span>
              </li>
            </ol>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
