'use client';

import { BilibiliAuthPanel } from '@/components/content/bilibili-auth-panel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AuthSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthSidebar({ open, onOpenChange }: AuthSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] overflow-y-auto sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>B站账号管理</SheetTitle>
          <SheetDescription>管理 B 站账号授权，用于视频投稿</SheetDescription>
        </SheetHeader>

        {open && <BilibiliAuthPanel className="mt-6 lg:grid-cols-1" />}
      </SheetContent>
    </Sheet>
  );
}
