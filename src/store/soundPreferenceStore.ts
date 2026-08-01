import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Separate from playbackStore deliberately - this is a plain user preference
// (like i18nStore's language choice), not live playback state bound to a
// mounted player instance. Video content in the Home autoplay feed is muted
// by default; unmuting once persists app-wide (not per-card) for the rest of
// the session and beyond, matching the Instagram-pattern behavior scoped in
// CLAUDE.md §29.
interface SoundPreferenceState {
  isVideoMuted: boolean;
  setVideoMuted: (muted: boolean) => void;
}

export const useSoundPreferenceStore = create<SoundPreferenceState>()(
  persist(
    (set) => ({
      isVideoMuted: true,
      setVideoMuted: (muted: boolean) => set({ isVideoMuted: muted }),
    }),
    {
      name: 'sound-preference-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
