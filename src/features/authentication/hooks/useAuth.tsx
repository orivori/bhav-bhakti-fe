import React, { createContext, useContext, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/shared/stores/authStore';
import { authService } from '../services/authService';
import { SendOTPRequest, VerifyOTPRequest, ApiError, AuthTokens } from '../types';

interface AuthContextType {
  // State
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  sendOTP: (data: SendOTPRequest) => Promise<{ success: boolean; sessionId: string; orderId: string }>;
  verifyOTP: (data: VerifyOTPRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout: storeLogout,
    initializeAuth,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const sendOTP = async (data: SendOTPRequest) => {
    try {
      setLoading(true);
      // Use mock service for development
      const response = await authService.sendOTP(data);

      return {
        success: response.success,
        sessionId: '', // API doesn't return sessionId
        orderId: response.data.orderId,
      };
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (data: VerifyOTPRequest) => {
    try {
      setLoading(true);
      const response = await authService.verifyOTP(data);

      if (response.success) {
        // Convert token to tokens format expected by the store
        const tokens: AuthTokens = {
          accessToken: response.data.token,
          refreshToken: '', // API doesn't provide refresh token
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
        };

        await login(response.data.user, tokens);

        // Force navigation to main after successful login
        router.replace('/(main)');
      }
    } catch (error) {
      console.error('💥 OTP verification error:', error);
      const apiError = error as ApiError;
      throw new Error(apiError.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // Call API to logout if needed
      // await authService.logout();

      await storeLogout();

      // Redirect to login screen
      router.replace('/(auth)/phone-login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      await storeLogout();
      // Ensure redirect happens even if there's an error
      router.replace('/(auth)/phone-login');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    sendOTP,
    verifyOTP,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}