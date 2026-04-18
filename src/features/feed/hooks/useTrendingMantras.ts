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

  return useQuery<TrendingMantrasResponse>({
    queryKey: ['feed', 'trending', 'mantras', { limit, days }],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: TrendingMantrasResponse }>(`/v1/feed/trending/mantras?limit=${limit}&days=${days}`);
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (was cacheTime)
    refetchOnWindowFocus: false,
  });
}