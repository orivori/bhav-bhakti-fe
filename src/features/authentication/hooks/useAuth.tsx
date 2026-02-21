import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/shared/stores/authStore';
import { authService } from '../services/authService';
import { SendOTPRequest, VerifyOTPRequest, ApiError } from '../types';

interface AuthContextType {
  // State
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  sendOTP: (data: SendOTPRequest) => Promise<{ success: boolean; sessionId: string }>;
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
        sessionId: response.sessionId,
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

      // Use mock service for development
      const response = await authService.verifyOTPMock(data);

      if (response.success) {
        await login(response.user, response.tokens);
      }
    } catch (error) {
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
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      await storeLogout();
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