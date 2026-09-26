import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '@/shared/config/api';
import { secureStorage } from '@/shared/utils/secureStorage';
import { AuthTokens, ApiError } from '@/features/authentication/types';
import i18n from '@/shared/i18n';
import { handleSessionExpired } from './sessionExpiry';

// Login/logout requests - a 401 from these is a failed login, not an expired
// session, so it must not trigger the session-expired prompt.
const isAuthEndpoint = (url?: string): boolean => !!url && url.includes('/v1/auth/');

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and log requests
    this.client.interceptors.request.use(
      async (config) => {
        const tokens = await secureStorage.getTokens();
        if ( tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        if (__DEV__) {
          console.log('🚀 API Request:', {
            url: `URL===>${config.baseURL}${config.url}`,
            payload: config.data,
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh and log responses
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if (__DEV__) {
          console.log('✅ API Response:', {
            data: response.data?.data,
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Log API error details
        if (__DEV__) {
          console.error('❌ API Error:', {
            method: error.config?.method?.toUpperCase(),
            url: `${error.config?.baseURL}${error.config?.url}`,
            status: error.response?.status,
            statusText: error.response?.statusText,
            headers: error.response?.headers,
            errorData: error.response?.data,
            message: error.message,
            timestamp: new Date().toISOString(),
          });
        }

        // A network-level failure (no response at all - DNS not resolving, connection
        // refused, timeout) against the primary hosted domain: retry once against the
        // Railway fallback, then keep using it for the rest of this app session. Not
        // re-tried per request after that, since a custom-domain outage rarely clears
        // mid-session and re-trying the primary every time would just double the
        // failure latency of every call until the app restarts.
        if (
          !error.response &&
          API_CONFIG.FALLBACK_BASE_URL &&
          this.client.defaults.baseURL === API_CONFIG.BASE_URL &&
          !originalRequest?._fallbackRetry
        ) {
          console.warn(
            `⚠️ Primary API host unreachable (${API_CONFIG.BASE_URL}) - switching to fallback (${API_CONFIG.FALLBACK_BASE_URL}) for this session.`
          );
          this.client.defaults.baseURL = API_CONFIG.FALLBACK_BASE_URL;
          originalRequest.baseURL = API_CONFIG.FALLBACK_BASE_URL;
          originalRequest._fallbackRetry = true;
          return this.client(originalRequest);
        }

        // A dead session - the backend's 401 for an expired token, a token it no
        // longer accepts, or a deleted user - is handled here, for every request:
        // the session is cleared and the "Session Expired" prompt shown, once
        // (see sessionExpiry.ts). There is no token refresh; the user logs in
        // again. The login/logout endpoints themselves are excluded, so a failed
        // login attempt never triggers it.
        const isDeadSession = error.response?.status === 401 && !isAuthEndpoint(originalRequest?.url);
        if (isDeadSession) {
          handleSessionExpired();
        }

        return Promise.reject(this.handleApiError(error, isDeadSession));
      }
    );
  }



  private handleApiError(error: AxiosError, isDeadSession = false): ApiError {
    if (isDeadSession) {
      // Friendly, translated text instead of the server's raw token error
      // ("jwt expired", "invalid signature") - screens show this message as-is.
      // Not applied to a failed login (auth endpoints keep their own message).
      return {
        message: i18n.t('auth.sessionExpired.errorMessage'),
        code: 'SESSION_EXPIRED',
        statusCode: 401,
      };
    }
    if (error.response) {
      return {
        message: (error.response.data as any)?.message || 'An error occurred',
        code: (error.response.data as any)?.code || 'UNKNOWN_ERROR',
        statusCode: error.response.status,
      };
    } else if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 0,
      };
    }
  }

  // Public methods
  async get<T>(url: string, config?: any): Promise<T> {
    if (__DEV__) {
      console.log(`url:${url}`)
    }
    const response = await this.client.get(url, config);
    if (__DEV__) {
      console.log("response",response)
    }
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    if (__DEV__) {
      console.log(`url:${url}`,data)
    }
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    if (__DEV__) {
      console.log(`url:${url}`,data)
    }
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();