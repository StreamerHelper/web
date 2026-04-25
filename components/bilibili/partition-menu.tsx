'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BilibiliPartition } from '@/types';
import { cn } from '@/lib/utils';

export const DEFAULT_BILIBILI_HUMAN_TYPE2 = 2066;

export function findPartitionPath(
  partitions: BilibiliPartition[],
  id?: number | null
): BilibiliPartition[] {
  if (!id) {
    return [];
  }

  for (const partition of partitions) {
    if (partition.id === id) {
      return [partition];
    }

    const childPath = findPartitionPath(partition.children || [], id);
    if (childPath.length) {
      return [partition, ...childPath];
    }
  }

  return [];
}

interface PartitionMenuProps {
  partitions: BilibiliPartition[];
  value?: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PartitionMenu({
  partitions,
  value,
  onChange,
  disabled,
  placeholder = '选择投稿分区',
  className,
}: PartitionMenuProps) {
  const selectedPath = findPartitionPath(partitions, value);
  const label =
    selectedPath.length > 0
      ? selectedPath.map(partition => partition.name).join(' / ')
      : placeholder;

  const renderPartition = (partition: BilibiliPartition) => {
    if (partition.children?.length) {
      return (
        <DropdownMenuSub key={partition.id}>
          <DropdownMenuSubTrigger>{partition.name}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[min(56vh,320px)] w-64 overflow-y-auto">
            {partition.children.map(renderPartition)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return (
      <DropdownMenuItem key={partition.id} onSelect={() => onChange(partition.id)}>
        <span className="min-w-0 flex-1 truncate">{partition.name}</span>
        {partition.id === value && <Check className="size-4" />}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(56vh,320px)] w-64 overflow-y-auto"
      >
        {partitions.map(renderPartition)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
