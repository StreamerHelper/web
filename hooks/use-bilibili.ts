'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { BilibiliQRCode, BilibiliAuthStatus } from '@/types';

const POLL_INTERVAL = 2000; // 2 seconds

export function useBilibiliAuth() {
  const queryClient = useQueryClient();
  const [qrcode, setQrcode] = useState<BilibiliQRCode | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const authCodeRef = useRef<string | null>(null);

  // Get auth status
  const { data: authStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<BilibiliAuthStatus>({
    queryKey: ['bilibili', 'auth', 'status'],
    queryFn: api.getBilibiliAuthStatus,
    refetchOnWindowFocus: false,
  });

  // Stop polling helper
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    setQrcode(null);
    authCodeRef.current = null;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll QR code status
  const pollStatus = useCallback(async () => {
    if (!authCodeRef.current) return;

    try {
      const result = await api.pollBilibiliQRCode(authCodeRef.current);

      if (result.status === 'success') {
        toast.success('登录成功');
        stopPolling();
        refetchStatus();
      } else if (result.status === 'expired') {
        toast.error('二维码已过期，请重新获取');
        stopPolling();
      }
      // If status is 'waiting', continue polling (do nothing)
    } catch (error) {
      console.error('Poll error:', error);
    }
  }, [refetchStatus, stopPolling]);

  // Polling effect - 只依赖 isPolling
  useEffect(() => {
    if (isPolling && authCodeRef.current) {
      // 立即执行一次
      pollStatus();

      // 设置定时轮询
      pollIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isPolling, pollStatus]);

  // Get QR code mutation
  const getQRCodeMutation = useMutation({
    mutationFn: api.getBilibiliQRCode,
    onSuccess: (data) => {
      setQrcode(data);
      authCodeRef.current = data.authCode;
      setIsPolling(true);
    },
    onError: () => {
      toast.error('获取二维码失败');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: api.logoutBilibili,
    onSuccess: () => {
      toast.success('已退出登录');
      queryClient.invalidateQueries({ queryKey: ['bilibili', 'auth', 'status'] });
    },
    onError: () => {
      toast.error('退出登录失败');
    },
  });

  // Start login process
  const startLogin = useCallback(() => {
    getQRCodeMutation.mutate();
  }, [getQRCodeMutation]);

  // Cancel polling
  const cancelLogin = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  // Logout
  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    authStatus,
    isLoadingStatus,
    qrcode,
    isPolling,
    isGettingQRCode: getQRCodeMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    startLogin,
    cancelLogin,
    logout,
    refetchStatus,
  };
}

export function useBilibiliSubmission() {
  const createMutation = useMutation({
    mutationFn: api.createBilibiliSubmission,
    onSuccess: (result) => {
      toast.success('投稿任务已创建', {
        description: `ID: ${result.id}`,
      });
    },
    onError: () => {
      toast.error('创建投稿失败');
    },
  });

  const createSubmission = useCallback((data: Parameters<typeof api.createBilibiliSubmission>[0]) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  return {
    createSubmission,
    isCreating: createMutation.isPending,
    error: createMutation.error,
  };
}
