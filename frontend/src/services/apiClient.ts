import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiError, type ApiErrorPayload } from '../types/api';

/**
 * Resolves and sanitizes the API base URL from Vite environment.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';
  return envUrl.trim().replace(/\/+$/, '');
}

/**
 * Default timeout in milliseconds.
 */
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Centralized Axios client instance configured for the application.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: sanitization and secure header propagation
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Ensure clean URL routing
    if (config.url && !config.url.startsWith('http')) {
      // Ensure leading slash if relative
      if (!config.url.startsWith('/')) {
        config.url = `/${config.url}`;
      }
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(
      new ApiError(
        error instanceof Error ? error.message : 'Failed to initialize request configuration.'
      )
    );
  }
);

// Response Interceptor: Safe typed error handling and normalization
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<ApiErrorPayload>) => {
    let message = 'An unexpected network error occurred.';
    const status = error.response?.status;
    const code = error.code;
    const data = error.response?.data;

    if (axios.isCancel(error) || error.name === 'CanceledError') {
      message = 'The request was cancelled.';
    } else if (error.response?.data) {
      const payload = error.response.data;
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload.message && typeof payload.message === 'string') {
        message = payload.message;
      } else if (payload.detail) {
        if (typeof payload.detail === 'string') {
          message = payload.detail;
        } else if (Array.isArray(payload.detail)) {
          message = payload.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
        } else {
          message = JSON.stringify(payload.detail);
        }
      } else if (error.message) {
        message = error.message;
      }
    } else if (code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      message = 'Request timed out. Please check your backend connection.';
    } else if (code === 'ERR_NETWORK' || error.message === 'Network Error') {
      message = 'Unable to reach backend service. Verify that the server is online and CORS is configured.';
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(new ApiError(message, status, code, data));
  }
);

export default apiClient;
