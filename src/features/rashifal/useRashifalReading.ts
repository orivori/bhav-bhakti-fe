import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { horoscopeService } from '@/features/horoscope/services/horoscopeService';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { getLocalDateString } from '@/shared/utils/dateUtil';
import type { ZodiacSign } from '@/types/horoscope';
import { shouldRetryRashifalReading } from './rashifalLock';

// Today's reading for one sign, for horoscope-detail.tsx.
//
// "Today" is decided by the server, in IST: the first request sends no date.
// The date of the reading that came back is then pinned, so a later re-fetch
// on the same visit (language switch, Try again, a screen left open past
// midnight) asks for that same day - and that day's unlock still counts -
// instead of silently switching to tomorrow's (locked) reading.
//
// The screen is a hidden tab that stays mounted between visits, so the
// visit's day is re-checked every time it gains focus: a new phone day starts
// fresh (no pinned date, a new cache entry).
export function useRashifalReading(sign: ZodiacSign | undefined) {
  const { language } = useI18nStore();
  const [visitDay, setVisitDay] = useState(() => getLocalDateString(new Date()));
  const pinnedRef = useRef<{ day: string; date: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const today = getLocalDateString(new Date());
      if (today !== visitDay) {
        pinnedRef.current = null;
        setVisitDay(today);
      }
    }, [visitDay])
  );

  return useQuery({
    queryKey: ['rashifal', 'reading', sign, language, visitDay],
    queryFn: async () => {
      const pinned = pinnedRef.current?.day === visitDay ? pinnedRef.current.date : undefined;
      const horoscope = await horoscopeService.getHoroscopeBySign(sign as ZodiacSign, language, pinned);
      const servedDate = typeof horoscope?.date === 'string' ? horoscope.date.slice(0, 10) : null;
      if (servedDate && !pinned) pinnedRef.current = { day: visitDay, date: servedDate };
      return horoscope;
    },
    enabled: !!sign,
    staleTime: 1000 * 60 * 30,
    retry: shouldRetryRashifalReading,
  });
}
