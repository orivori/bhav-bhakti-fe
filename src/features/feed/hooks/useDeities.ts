import { useQuery } from '@tanstack/react-query';
import { deityService } from '../services/deityService';
import { Deity } from '@/types/feed';

interface UseDeitiesOptions {
  enabled?: boolean;
}

// The deity chips (DeityFilterRow) show only deities that have at least one
// active feed of any type - one global list for every hub screen. If that
// request fails, fall back to the full list, which is what the chips showed
// before. An older backend ignores hasContent and returns the full list.
async function getDeitiesForChips(): Promise<Deity[]> {
  try {
    return await deityService.getDeities(true, true);
  } catch (error) {
    console.warn('Deities-with-content request failed, falling back to the full list:', error);
    return deityService.getDeities();
  }
}

export function useDeities(options: UseDeitiesOptions = {}) {
  const { enabled = true } = options;

  return useQuery<Deity[], Error>({
    queryKey: ['deities', 'withContent'],
    queryFn: getDeitiesForChips,
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes - deity list is near-static, unlike per-type categories
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useDeityById(deityId: number, enabled: boolean = true) {
  return useQuery<Deity, Error>({
    queryKey: ['deity', deityId],
    queryFn: () => deityService.getDeityById(deityId),
    enabled: enabled && !!deityId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
