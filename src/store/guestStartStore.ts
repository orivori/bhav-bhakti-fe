import { create } from 'zustand';
import type { GuestStartFailure } from '@/features/authentication/utils/guestStartRules';

// What app/index.tsx shows while there's no session: a spinner, or
// GuestStartScreen with a Retry button after a failed start.
type GuestStartStatus = 'idle' | 'starting' | GuestStartFailure;

interface GuestStartState {
  status: GuestStartStatus;
  setStatus: (status: GuestStartStatus) => void;
}

export const useGuestStartStore = create<GuestStartState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
