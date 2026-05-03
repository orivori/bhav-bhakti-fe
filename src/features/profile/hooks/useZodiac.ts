import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { profileService, ZodiacCalculationRequest, ZodiacCalculationResponse } from '../services/profileService';

export interface UseZodiacCalculationOptions extends Omit<UseMutationOptions<ZodiacCalculationResponse, Error, ZodiacCalculationRequest>, 'mutationFn'> {}

/**
 * Hook for calculating zodiac sign and rashi from date of birth
 */
export const useZodiacCalculation = (options?: UseZodiacCalculationOptions) => {
  return useMutation<ZodiacCalculationResponse, Error, ZodiacCalculationRequest>({
    mutationFn: profileService.calculateZodiac.bind(profileService),
    ...options,
  });
};