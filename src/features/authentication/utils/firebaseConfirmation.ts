import type { ConfirmationResult } from '@react-native-firebase/auth';

// The object signInWithPhoneNumber() hands back is live and non-serializable
// (it wraps a native verification session) - it can't go through
// router.push params (those only carry strings) and doesn't belong in a
// persisted/Zustand store either: nothing renders based on it, and
// persisting an imperative SDK object across app restarts makes no sense -
// a stale one just needs a fresh sendOTP call. A plain module-level variable
// mirrors the same pattern AutoplayFeedCard.tsx already uses for other
// short-lived, non-reactive cross-call state (inFlightBackgroundDownloads/
// inFlightCancellations) - simplest thing that works, no store overhead for
// something only two imperative call sites (sendOTP, verifyOTP) ever touch.
let currentConfirmation: ConfirmationResult | null = null;

export const setFirebaseConfirmation = (confirmation: ConfirmationResult): void => {
  currentConfirmation = confirmation;
};

export const getFirebaseConfirmation = (): ConfirmationResult | null => currentConfirmation;

export const clearFirebaseConfirmation = (): void => {
  currentConfirmation = null;
};
