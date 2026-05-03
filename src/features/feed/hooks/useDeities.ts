import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/services/apiClient';

export interface Deity {
  id: number;
  name: string;
  displayName: {
    en: string;
    hi?: string;
    [key: string]: string | undefined;
  };
  icon?: string;
  colors?: string[];
  isActive: boolean;
  sortOrder: number;
}

interface UseDeitiesOptions {
  isActive?: boolean;
  enabled?: boolean;
  type?: 'mantra' | 'ringtone' | 'wallpaper' | 'general';
}

export function useDeities(options: UseDeitiesOptions = {}) {
  const { isActive = true, enabled = true, type } = options;

  return useQuery<Deity[]>({
    queryKey: ['deities', { isActive, type }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (isActive !== undefined) {
        searchParams.append('isActive', isActive.toString());
      }
      if (type) {
        searchParams.append('type', type);
      }

      const apiUrl = `/v1/deities?${searchParams.toString()}`;
      console.log('🔍 API Call - Deities:', {
        url: apiUrl,
        parameters: { isActive, type }
      });

      const response = await apiClient.get<{ success: boolean; data: Deity[] }>(apiUrl);
      return response.data;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - deities don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
    refetchOnWindowFocus: false,
  });
}