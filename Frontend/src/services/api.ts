import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle Network Errors
    if (!error.response) {
      toast.error('Network error. Please check your internet connection or server state.', {
        id: 'network-error',
      });
      // S7746: Use throw instead of Promise.reject() inside async functions
      throw error;
    }

    const status = error.response.status;
    const responseData = error.response.data as { message?: string } | undefined;
    const errorMessage = responseData?.message || 'An unexpected error occurred';

    // List of auth endpoints that should NOT trigger automatic token refresh on 401
    const requestUrl = originalRequest.url || '';
    const isIgnoredEndpoint =
      requestUrl.includes('/api/v1/auth/login') ||
      requestUrl.includes('/api/v1/auth/register') ||
      requestUrl.includes('/api/v1/auth/forgot-password') ||
      requestUrl.includes('/api/v1/auth/refresh') ||
      requestUrl.includes('/api/v1/auth/logout');

    // Check if the user previously had an active session
    const wasLoggedIn = localStorage.getItem('wasLoggedIn') === 'true';

    // Only attempt refresh if status is 401, request is not retried,
    // request is NOT an ignored auth endpoint, and user was previously logged in.
    if (status === 401 && !originalRequest._retry && !isIgnoredEndpoint && wasLoggedIn) {
      // Single refresh process at a time. Queue concurrent requests.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(originalRequest)),
            reject: (err: unknown) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt token refresh via HttpOnly cookies
        await axios.post(
          `${baseURL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // On refresh success, process queue & retry original request once
        processQueue(null);
        isRefreshing = false;
        return await api(originalRequest);
      } catch (refreshErr) {
        // Reject all queued requests on refresh failure & clear auth cache
        processQueue(refreshErr);
        isRefreshing = false;
        localStorage.removeItem('wasLoggedIn');

        // Show a single session expired toast only for previously logged in users
        toast.error('Your session has expired. Please sign in again.', {
          id: 'session-expired-toast',
        });

        // Dispatch session expired event so AuthContext resets user state
        window.dispatchEvent(new Event('auth:session-expired'));

        // Redirect immediately to /login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        // S7746: Use throw instead of Promise.reject() inside async functions
        throw refreshErr;
      }
    }

    // Centralized Toast Notifications for non-refresh handling
    if (status === 400 || status === 422) {
      toast.error(errorMessage || 'Validation error.');
    } else if (status === 403) {
      toast.error(errorMessage || 'Access forbidden.');
    } else if (status >= 500) {
      toast.error(errorMessage || 'Server error. Please try again later.');
    } else if (isIgnoredEndpoint && status === 401) {
      toast.error(errorMessage || 'Authentication failed.');
    }

    // S7746: Use throw instead of Promise.reject() inside async functions
    throw error;
  }
);

export default api;
