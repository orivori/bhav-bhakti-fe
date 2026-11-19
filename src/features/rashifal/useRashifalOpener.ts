import { useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { showStoryNotice } from '@/store/storyNoticeStore';
import { logRashifalGateTap } from '@/utils/analytics/gateTapEvents';
import { logRashifalOpenedUnlocked } from '@/utils/analytics/rashifalEvents';
import { fetchRashifalStatus } from './rashifalUnlockApi';
import { decideRashifalOpen, type RashifalStatus, type RashifalTrigger } from './rashifalLock';
import { runRashifalUnlockFlow, shouldOpenAfterFlow } from './rashifalUnlockFlow';

export const RASHIFAL_STATUS_QUERY_KEY = ['rashifal', 'unlocks', 'today'] as const;
const STATUS_FRESH_MS = 15 * 1000;

function rashifalStatusQuery() {
  return {
    queryKey: RASHIFAL_STATUS_QUERY_KEY,
    queryFn: fetchRashifalStatus,
    staleTime: STATUS_FRESH_MS,
    retry: false,
  };
}

// The grid's lock marks. Any failure = no data = no locks (the reading screen
// still handles a locked answer).
export function useRashifalStatus() {
  return useQuery(rashifalStatusQuery());
}

export function invalidateRashifalStatus(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: RASHIFAL_STATUS_QUERY_KEY });
}

async function readStatus(queryClient: QueryClient): Promise<RashifalStatus | null> {
  try {
    return await queryClient.fetchQuery(rashifalStatusQuery());
  } catch {
    return null; // open as before; the reading screen catches a locked answer
  }
}

export interface OpenRashifalInput {
  zodiacSign: string;
  trigger: Extract<RashifalTrigger, 'home_card' | 'sign_grid'>;
  returnTo: string;
  isOwnSign?: boolean;
}

// The one way Home's card and the 12-sign grid open a reading: check today's
// unlock state first, offer the ad for a locked sign, and open the reading
// only once it can be read. Declining keeps the user where they were. With
// the gate off (or the status call failing) it simply opens, as before.
export function useRashifalOpener() {
  const queryClient = useQueryClient();
  const busyRef = useRef(false);

  return useCallback(
    async ({ zodiacSign, trigger, returnTo, isOwnSign }: OpenRashifalInput): Promise<void> => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        logRashifalGateTap(zodiacSign);
        const open = () =>
          router.push({ pathname: '/(main)/horoscope-detail', params: { zodiacSign, returnTo } });

        const decision = decideRashifalOpen(await readStatus(queryClient), zodiacSign);
        if (decision === 'open') {
          open();
          return;
        }
        if (decision === 'open_unlocked') {
          logRashifalOpenedUnlocked({ trigger, isOwnSign });
          open();
          return;
        }

        const result = await runRashifalUnlockFlow({ zodiacSign, trigger, isOwnSign });
        if (result === 'unlocked') void invalidateRashifalStatus(queryClient);
        if (shouldOpenAfterFlow(result)) {
          open();
          return;
        }
        if (result === 'failed') await showStoryNotice('rashifalLock.unlockFailed');
      } finally {
        busyRef.current = false;
      }
    },
    [queryClient]
  );
}
