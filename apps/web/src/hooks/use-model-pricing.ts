import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

/**
 * 从后端获取模型积分定价（由 Mountsea 实时拉取，1小时缓存）
 * 返回 Record<modelId, credits>，如 { 'veo-3': 500, 'suno-v55': 50 }
 */
export function useModelPricing() {
  return useQuery<Record<string, number>>({
    queryKey: ['model-pricing'],
    queryFn: async () => {
      const res = await apiClient.get<Record<string, number>>('/model-pricing');
      return res.data ?? {};
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
    // 请求失败时静默降级，不影响页面功能
  });
}
