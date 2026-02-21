import { ApiError } from '@/features/authentication/types';

export const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as ApiError).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

export const createApiError = (
  message: string,
  code: string = 'UNKNOWN_ERROR',
  statusCode: number = 0
): ApiError => ({
  message,
  code,
  statusCode,
});