import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backing state only - all the actual decide/log logic lives in
// analytics/retentionEvents.ts, the same "store holds state, a separate
// events module reads/decides/logs" split already used by
// activationEventsStore.ts.
interface RetentionTrackingState {
  // getLocalDateString() value (YYYY-MM-DD, device-local) from the last
  // recorded cold start - compared against today's to detect a genuine
  // day-boundary gap, never raw timestamps (see CLAUDE.md's horoscope
  // timezone bug for why local calendar dates, not UTC math, matter here).
  lastSessionDateString: string | null;
  // Armed at a qualifying cold start (a real day-boundary gap detected),
  // consumed by whichever real signal resolves "was Rashifal the first
  // action" first. null when there's nothing pending.
  pendingReopenDays: number | null;
  setLastSessionDateString: (date: string) => void;
  setPendingReopenDays: (days: number | null) => void;
}

export const useRetentionTrackingStore = create<RetentionTrackingState>()(
  persist(
    (set) => ({
      lastSessionDateString: null,
      pendingReopenDays: null,
      setLastSessionDateString: (date) => set({ lastSessionDateString: date }),
      setPendingReopenDays: (days) => set({ pendingReopenDays: days }),
    }),
    {
      name: 'retention-tracking-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // pendingReopenDays deliberately NOT persisted - it's a same-cold-start-
      // lifetime flag (mirrors playbackStore's/chantHintStore's reasoning for
      // similar session-scoped fields), so an unresolved pending reopen from
      // one cold start doesn't leak into and get wrongly resolved by actions
      // taken during a later, unrelated cold start.
      partialize: (state) => ({ lastSessionDateString: state.lastSessionDateString }),
    }
  )
);
