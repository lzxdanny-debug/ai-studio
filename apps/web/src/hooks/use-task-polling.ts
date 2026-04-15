'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { TaskStatus } from '@ai-platform/shared';

interface Task {
  id: string;
  status: TaskStatus;
  resultUrls?: string[];
  errorMessage?: string;
  externalTaskId?: string;
  type: string;
  model: string;
  prompt?: string;
  createdAt: string;
}

interface UseTaskPollingOptions {
  taskId: string | null;
  onComplete?: (task: Task) => void;
  onError?: (task: Task) => void;
  enabled?: boolean;
}

export function useTaskPolling({
  taskId,
  onComplete,
  onError,
  enabled = true,
}: UseTaskPollingOptions) {
  const [isFinished, setIsFinished] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/tasks/${taskId}`) as any;
      return response.data as Task;
    },
    enabled: !!taskId && enabled && !isFinished,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      if (data.status === TaskStatus.COMPLETED || data.status === TaskStatus.FAILED) {
        return false;
      }
      return 3000;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!task) return;
    if (task.status === TaskStatus.COMPLETED) {
      setIsFinished(true);
      onComplete?.(task);
    } else if (task.status === TaskStatus.FAILED) {
      setIsFinished(true);
      onError?.(task);
    }
  }, [task, onComplete, onError]);

  const reset = useCallback(() => {
    setIsFinished(false);
  }, []);

  return { task, isLoading, isFinished, reset };
}
