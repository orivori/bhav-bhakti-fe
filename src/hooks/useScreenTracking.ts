import { useEffect } from 'react';
import { mixpanel } from '@/services/mixpanel';

export function useScreenTracking(screenName: string) {
  useEffect(() => {
    // Track screen view when component mounts
    mixpanel.trackScreenView(screenName);
  }, [screenName]);
}