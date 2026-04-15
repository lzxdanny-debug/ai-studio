import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Mutex to prevent concurrent refresh races:
// When the access token expires, multiple in-flight requests all receive 401.
// Without a lock, each would call /auth/refresh simultaneously; the backend
// rotates the refresh JTI on every refresh, so only the first succeeds and
// the rest would be force-logged out. Instead we queue all 401 requests and
// replay them once the single refresh resolves.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function drainQueue(newToken: string) {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another request is already refreshing — wait for it
        return new Promise<string>((resolve) => {
          refreshQueue.push(resolve);
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      // Only attempt a refresh (and potentially redirect) if the user had an
      // active session (access_token was present). If there is only a stale
      // refresh_token but no access_token — e.g. the user never authenticated
      // in this tab or the persisted Zustand state is out of sync — just reject
      // silently and let the component handle the unauthenticated state.
      if (!accessToken || !refreshToken) {
        // Clean up any orphaned refresh token to prevent future false-positives.
        if (refreshToken && !accessToken) localStorage.removeItem('refresh_token');
        return Promise.reject(error.response?.data || error);
      }

      // Has both tokens → access token expired. Try to renew silently.
      isRefreshing = true;
      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('access_token', newAccessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        drainQueue(newAccessToken);
        return apiClient(originalRequest);
      } catch {
        // Refresh failed (token revoked / expired) — session is truly dead.
        // Redirect to login, preserving the current path so the user can
        // return after authenticating.
        refreshQueue = [];
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        const from = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?from=${from}`;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

export default apiClient;
