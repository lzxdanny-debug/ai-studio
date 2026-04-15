'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export function useCredits() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      const response = await apiClient.get('/credits/balance') as any;
      return response.data as { balance: number };
    },
    // Only run when the user is authenticated — avoids a 401 → refresh → redirect
    // loop for anonymous users who happen to have a stale refresh_token in localStorage.
    enabled: isAuthenticated,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
