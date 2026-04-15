import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/lib/api';
import { SSO_SILENT_KEY } from '@/components/silent-sso-check';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  initFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        // shanhaiapi.com 接受 identifier（邮箱或用户名）
        const response = await apiClient.post('/auth/login', { identifier: email, password }) as any;
        const { user, accessToken, refreshToken } = response.data;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, isAuthenticated: true });
      },

      register: async (email, password, displayName) => {
        const response = await apiClient.post('/auth/register', { email, password, displayName }) as any;
        const { user, accessToken, refreshToken } = response.data;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch {
          // ignore
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          // Clear the silent-SSO session flag so the next visit can re-sync
          // login state from api-web (Mountsea) automatically.
          sessionStorage.removeItem(SSO_SILENT_KEY);
          // Redirect with prompt=login so the SSO page forces re-authentication.
          window.location.href = '/login?prompt=login';
        }
      },

      refreshUser: async () => {
        try {
          const response = await apiClient.get('/auth/me') as any;
          set({ user: response.data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      initFromTokens: async (accessToken: string, refreshToken: string) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        try {
          const user = await apiClient.get('/auth/me') as any;
          set({ user: user.data ?? user, isAuthenticated: true });
        } catch {
          set({ isAuthenticated: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
