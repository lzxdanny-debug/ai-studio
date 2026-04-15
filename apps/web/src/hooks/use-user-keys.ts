import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export interface UserApiKey {
  id: string;
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export function useUserKeys() {
  const { isAuthenticated } = useAuthStore();

  return useQuery<UserApiKey[]>({
    queryKey: ['user-keys'],
    queryFn: async () => {
      const resp = await apiClient.get('/user-keys?limit=100') as any;
      const items: UserApiKey[] = resp.data?.items ?? resp.items ?? [];
      return items.filter((k) => k.isActive);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
