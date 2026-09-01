import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '@/shared/utils/dateUtil';

const MAX_SHOWS_PER_DAY = 3;

// shownDate/shownCountToday are the only persisted fields (see partialize
// below) - a simple count + last-shown-date pair, resetting whenever the
// stored date no longer matches today's real local date (getLocalDateString,
// not toISOString - see that util's own comment for why, same UTC-rollover
// bug class as CLAUDE.md's horoscope timezone fix). hasShownThisSession is
// deliberately NOT persisted - it's a same-JS-runtime-lifetime flag (mirrors
// playbackStore's "deliberately not persisted" reasoning), so navigating
// away and back to the mantra player within one app session won't re-show
// the bubble even if the daily cap hasn't been hit yet, but a fresh app
// launch always starts a new session regardless of the date/count.
interface ChantHintState {
  shownDate: string;
  shownCountToday: number;
  hasShownThisSession: boolean;
  canShow: () => boolean;
  recordShown: () => void;
}

export const useChantHintStore = create<ChantHintState>()(
  persist(
    (set, get) => ({
      shownDate: '',
      shownCountToday: 0,
      hasShownThisSession: false,
      canShow: () => {
        const { shownDate, shownCountToday, hasShownThisSession } = get();
        if (hasShownThisSession) return false;
        const countToday = shownDate === getLocalDateString() ? shownCountToday : 0;
        return countToday < MAX_SHOWS_PER_DAY;
      },
      recordShown: () => {
        const today = getLocalDateString();
        set((state) => ({
          shownDate: today,
          shownCountToday: state.shownDate === today ? state.shownCountToday + 1 : 1,
          hasShownThisSession: true,
        }));
      },
    }),
    {
      name: 'chant-hint-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ shownDate: state.shownDate, shownCountToday: state.shownCountToday }),
    }
  )
);
