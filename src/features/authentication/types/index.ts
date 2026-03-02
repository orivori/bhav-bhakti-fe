export interface User {
  id: string;
  phoneNumber: string;
  countryCode: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface SendOTPRequest {
  phoneNumber: string;
  countryCode: string;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
  };
}

export interface VerifyOTPRequest {
  phoneNumber: string;
  countryCode: string;
  otp: string;
  sessionId?: string;
  orderId: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    sessionId: string;
    isNewUser: boolean;
  };
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}