import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/services/apiClient';
import type { Feed } from '@/types/feed';

interface TrendingMantrasResponse {
  feeds: Feed[];
}

interface UseTrendingMantrasOptions {
  limit?: number;
  days?: number;
  enabled?: boolean;
}

export function useTrendingMantras(options: UseTrendingMantrasOptions = {}) {
  const { limit = 5, days = 7, enabled = true } = options;

  console.log('🔧 TrendingMantras Hook Setup:', { limit, days, enabled });

  const result = useQuery<TrendingMantrasResponse>({
    queryKey: ['feed', 'trending', 'mantras', { limit, days }],
    queryFn: async () => {
      console.log('🚀 API Call: Fetching trending mantras', { limit, days });

      try {
        const response = await apiClient.get<{ success: boolean; data: TrendingMantrasResponse }>(`/v1/feed/trending/mantras?limit=${limit}&days=${days}`);
        console.log('📦 Full API Response:', response);

        console.log('📦 API Response - Trending Mantras:', {
          status: (response as any).status,
          success: (response.data as any).success,
          feedsCount: (response.data as any).data?.feeds?.length || response.data.feeds?.length || 0,
          rawResponse: response.data
        });

        // Handle different response structures
        if ((response.data as any).data?.feeds) {
          return (response.data as any).data;
        } else if (response.data.feeds) {
          return response.data;
        } else {
          console.warn('⚠️ Unexpected API response structure:', response.data);
          return response.data;
        }
      } catch (error) {
        console.error('❌ API Error - Trending Mantras:', error);
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (was cacheTime)
    refetchOnWindowFocus: false,
  });

  console.log('📊 Query Result:', {
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    data: result.data,
    status: result.status
  });

  return result;
}