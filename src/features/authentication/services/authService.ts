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

  // Mock implementation for development
  async sendOTPMock(data: SendOTPRequest): Promise<SendOTPResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock success response
    return {
      success: true,
      message: 'OTP sent successfully',
      sessionId: 'mock-session-' + Date.now(),
    };
  }

  async verifyOTPMock(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For development, accept "123456" as valid OTP
    if (data.otp === '123456') {
      const mockUser: User = {
        id: 'user-' + Date.now(),
        phoneNumber: data.phoneNumber,
        countryCode: data.countryCode,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'OTP verified successfully',
        user: mockUser,
        tokens: {
          accessToken: 'mock-access-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        },
      };
    } else {
      throw {
        message: 'Invalid OTP. Please try again.',
        code: 'INVALID_OTP',
        statusCode: 400,
      };
    }
  }
}

export const authService = new AuthService();