import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '@/shared/config/api';
import { secureStorage } from '@/shared/utils/secureStorage';
import { AuthTokens, ApiError } from '@/features/authentication/types';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

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
        console.log('🚀 API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`
        });

        const tokens = await secureStorage.getTokens();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
          console.log('🔐 Auth token added to request');
        } else {
          console.log('ℹ️ No auth token available');
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
        console.log('✅ API Response:', {
          status: response.status,
          url: response.config?.url,
          method: response.config?.method?.toUpperCase(),
          dataType: typeof response.data
        });
        return response;
      },
      async (error: AxiosError) => {
        console.log('❌ API Response Error:', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          hasResponse: !!error.response,
          hasRequest: !!error.request
        });

        const originalRequest = error.config as any;


        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Token refresh logic would go here
            // const newTokens = await this.refreshToken();
            // this.refreshSubscribers.forEach((callback) =>
            //   callback(newTokens.accessToken)
            // );
            // this.refreshSubscribers = [];

            // if (originalRequest.headers) {
            //   originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            // }
            // return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            await secureStorage.clearAll();
            // You can emit an event here to redirect to login
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.handleApiError(error));
      }
    );
  }

 

  private handleApiError(error: AxiosError): ApiError {
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
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();