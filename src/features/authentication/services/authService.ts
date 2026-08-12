import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';
import {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  VerifyFirebasePhoneAuthRequest,
  User,
} from '../types';

class AuthService {
  // OTPless-backed - left untouched, same rollback path documented in
  // api.ts, retired in Phase 5, not this one.
  async sendOTP(data: SendOTPRequest): Promise<SendOTPResponse> {
    return apiClient.post<SendOTPResponse>(API_ENDPOINTS.AUTH.SEND_OTP, data);
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    return apiClient.post<VerifyOTPResponse>(API_ENDPOINTS.AUTH.VERIFY_OTP, data);
  }

  // Real Firebase phone-auth path - what useAuth.tsx actually calls now.
  // Response envelope is identical in shape to VerifyOTPResponse (both wrap
  // {token, sessionId, user, isNewUser}), so it's reused rather than
  // duplicated under a new name.
  async verifyFirebasePhoneAuth(data: VerifyFirebasePhoneAuthRequest): Promise<VerifyOTPResponse> {
    return apiClient.post<VerifyOTPResponse>(API_ENDPOINTS.AUTH.FIREBASE_VERIFY, data);
  }

  async getUserProfile(): Promise<User> {
    // Same envelope-unwrapping bug class as horoscopeService.calculateZodiac
    // (see that file), opposite direction: sendOTP/verifyOTP above are
    // correctly NOT unwrapped because their declared types ARE the
    // {success, message, data} envelope - but User isn't, so this was
    // silently returning the whole envelope instead of the user. Still
    // unused (zero call sites) - fixed alongside the URL fix since it's the
    // same root cause (this endpoint was never actually exercised).
    const response = await apiClient.get<{ data: User }>(API_ENDPOINTS.USER.PROFILE);
    return response.data;
  }

  async logout(): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
  }

}

export const authService = new AuthService();