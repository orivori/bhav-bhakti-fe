import { useQuery } from '@tanstack/react-query';
import { deityService } from '../services/deityService';
import { Deity } from '@/types/feed';

interface UseDeitiesOptions {
  enabled?: boolean;
}

export function useDeities(options: UseDeitiesOptions = {}) {
  const { enabled = true } = options;

  return useQuery<Deity[], Error>({
    queryKey: ['deities'],
    queryFn: () => deityService.getDeities(),
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
