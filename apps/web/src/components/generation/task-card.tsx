'use client';

import { useState } from 'react';
import { Download, Play, Clock, CheckCircle, XCircle, Loader2, Music, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate, getModelLabel, getTaskTypeLabel } from '@/lib/utils';
import { TaskStatus } from '@ai-platform/shared';

interface Task {
  id: string;
  type: string;
  model: string;
  status: TaskStatus;
  prompt?: string;
  resultUrls?: string[];
  isPublic: boolean;
  createdAt: string;
  errorMessage?: string;
}

interface TaskCardProps {
  task: Task;
  className?: string;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = {
    [TaskStatus.PENDING]: { label: '等待中', variant: 'info' as const, icon: Clock },
    [TaskStatus.PROCESSING]: { label: '生成中', variant: 'warning' as const, icon: Loader2 },
    [TaskStatus.COMPLETED]: { label: '已完成', variant: 'success' as const, icon: CheckCircle },
    [TaskStatus.FAILED]: { label: '失败', variant: 'destructive' as const, icon: XCircle },
  };

  const { label, variant, icon: Icon } = config[status] || config[TaskStatus.PENDING];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className={cn('h-3 w-3', status === TaskStatus.PROCESSING && 'animate-spin')} />
      {label}
    </Badge>
  );
}

export function TaskCard({ task, className }: TaskCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const firstResult = task.resultUrls?.[0];

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}>
      {/* Preview Area */}
      <div className="relative aspect-video bg-muted flex items-center justify-center">
        {task.status === TaskStatus.COMPLETED && firstResult ? (
          <>
            {task.type === 'video' && (
              <video
                src={firstResult}
                className="w-full h-full object-cover"
                controls
                preload="metadata"
              />
            )}
            {task.type === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firstResult}
                alt={task.prompt || '生成图像'}
                className="w-full h-full object-cover"
              />
            )}
            {task.type === 'music' && (
              <div className="flex flex-col items-center gap-3 p-4 w-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Music className="h-8 w-8 text-white" />
                </div>
                <audio
                  src={firstResult}
                  controls
                  className="w-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}
          </>
        ) : task.status === TaskStatus.PROCESSING || task.status === TaskStatus.PENDING ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/60 animate-pulse" />
              <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">AI 正在生成中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{task.errorMessage || '生成失败'}</p>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-foreground line-clamp-2 flex-1">
            {task.prompt || '无描述'}
          </p>
          <StatusBadge status={task.status} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">{getTaskTypeLabel(task.type)}</Badge>
          <span>{getModelLabel(task.model)}</span>
          <span>·</span>
          <span>{formatDate(task.createdAt)}</span>
          {task.isPublic ? (
            <Globe className="h-3 w-3 ml-auto" title="公开" />
          ) : (
            <Lock className="h-3 w-3 ml-auto" title="私密" />
          )}
        </div>

        {task.status === TaskStatus.COMPLETED && firstResult && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <a href={firstResult} download target="_blank" rel="noreferrer">
              <Download className="h-3 w-3" />
              下载
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
