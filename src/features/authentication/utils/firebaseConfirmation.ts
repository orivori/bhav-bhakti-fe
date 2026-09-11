import type { ConfirmationResult, User, Unsubscribe } from '@react-native-firebase/auth';
import { getAuth, onIdTokenChanged } from '@react-native-firebase/auth';

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

// Android's native phone-auth flow can silently auto-complete sign-in in the
// background (SMS Retriever), independently of confirmationResult.confirm() -
// confirmed via a real device logcat capture: Firebase's own SDK logs
// "signInWithPhoneNumber:autoVerified:signInWithCredential:onComplete:success"
// several seconds BEFORE our own "confirmationResultConfirm:...:onComplete:
// failure" for the same login attempt, once the background path has already
// won. This tracks that background winner per verification attempt, so
// useAuth.tsx's verifyOTP can use it once the user's own typed input is
// ready, instead of only ever trusting confirm()'s own result (which is
// guaranteed to fail once the background path has already completed).
let autoVerifiedUser: User | null = null;
let autoVerifiedUnsubscribe: Unsubscribe | null = null;

// verify-otp.tsx registers this so it can react the MOMENT background
// auto-verification wins, rather than only discovering it lazily whenever
// the user's own typing happens to reach 6 digits (the getAutoVerifiedUser()
// path below, still used by verifyOTP's own read at submit time). Deliberately
// a plain module-level slot, not reset by setFirebaseConfirmation() below -
// unlike autoVerifiedUser/autoVerifiedUnsubscribe (which are genuinely
// per-attempt), the screen's listener registration must survive a resend
// (a fresh sendOTP() call), since the screen itself never unmounts across one.
let autoVerifiedListener: ((user: User) => void) | null = null;

export const registerAutoVerifiedListener = (listener: ((user: User) => void) | null): void => {
  autoVerifiedListener = listener;
};

export const setFirebaseConfirmation = (confirmation: ConfirmationResult): void => {
  currentConfirmation = confirmation;

  // Every sendOTP() call (initial send or resend) starts its own
  // verification session - reset tracking and start watching fresh so a
  // previous attempt's listener/result can never leak into this one.
  autoVerifiedUnsubscribe?.();
  autoVerifiedUser = null;

  // onIdTokenChanged fires immediately on subscribe with whatever auth state
  // already exists (e.g. a stale session left over from an earlier
  // successful login with the same account) - that first callback is not a
  // real event from THIS attempt, so it's ignored; only a later invocation
  // represents a genuinely new token, which is what a real background
  // auto-verification for this attempt produces.
  let isFirstCallback = true;
  autoVerifiedUnsubscribe = onIdTokenChanged(getAuth(), (user) => {
    if (isFirstCallback) {
      isFirstCallback = false;
      return;
    }
    autoVerifiedUser = user;
    if (user) {
      autoVerifiedListener?.(user);
    }
  });
};

export const getFirebaseConfirmation = (): ConfirmationResult | null => currentConfirmation;

// The background auto-verification winner for the CURRENT verification
// attempt, if it has already completed - null otherwise. This is the lazy
// read verifyOTP() falls back on (e.g. the narrow in-flight-confirm() race
// window); verify-otp.tsx's own reaction to the SAME event is no longer
// lazy - see registerAutoVerifiedListener above, which fires the moment it
// happens rather than waiting for a caller to ask.
export const getAutoVerifiedUser = (): User | null => autoVerifiedUser;

export const clearFirebaseConfirmation = (): void => {
  currentConfirmation = null;
  autoVerifiedUnsubscribe?.();
  autoVerifiedUnsubscribe = null;
  autoVerifiedUser = null;
};
