import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';
import { Category } from '@/types/feed';

interface UseCategoriesOptions {
  type: string;
  enabled?: boolean;
}

export function useCategories(options: UseCategoriesOptions) {
  const { type, enabled = true } = options;

  return useQuery<Category[], Error>({
    queryKey: ['categories', type],
    queryFn: () => categoryService.getCategoriesByType(type),
    enabled: enabled && !!type,
    staleTime: 0, // Force fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useMantraCategories(enabled: boolean = true) {
  return useCategories({
    type: 'mantra',
    enabled,
  });
}

export function useCategoryById(categoryId: number, enabled: boolean = true) {
  return useQuery<Category, Error>({
    queryKey: ['category', categoryId],
    queryFn: () => categoryService.getCategoryById(categoryId),
    enabled: enabled && !!categoryId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
