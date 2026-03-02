import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';
import {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  User,
} from '../types';

class AuthService {
  async sendOTP(data: SendOTPRequest): Promise<SendOTPResponse> {
    return apiClient.post<SendOTPResponse>(API_ENDPOINTS.AUTH.SEND_OTP, data);
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    return apiClient.post<VerifyOTPResponse>(API_ENDPOINTS.AUTH.VERIFY_OTP, data);
  }

  async getUserProfile(): Promise<User> {
    return apiClient.get<User>(API_ENDPOINTS.USER.PROFILE);
  }

  async logout(): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
  }

}

export const authService = new AuthService();