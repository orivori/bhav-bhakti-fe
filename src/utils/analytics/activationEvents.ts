import { logAnalyticsEvent } from './logEvent';
import { useActivationEventsStore } from '@/store/activationEventsStore';

// Activation bucket only - see Bhav_Bhakti_Analytics_Event_Plan.md §2. Every
// function here is a thin, purpose-named wrapper so call sites never build
// Firebase param objects by hand (keeps event/param names consistent and
// centralizes the "first-time-only" gating in one place, not re-implemented
// per call site).

export function logLoginStarted(): void {
  logAnalyticsEvent('login_started');
}

export function logOtpSent(params: { is_resend: boolean }): void {
  logAnalyticsEvent('otp_sent', params);
}

export function logLoginCompleted(params: { is_new_user: boolean }): void {
  logAnalyticsEvent('login_completed', params);

  // Arms the three "new user's first X" milestones below - see
  // activationEventsStore.ts. A returning user's login_completed
  // (is_new_user: false) never sets this, so none of the three can ever
  // fire for them.
  if (params.is_new_user) {
    useActivationEventsStore.getState().markNewUserSignup();
  }
}

export function logLoginFailed(params: { stage: 'otp_request' | 'otp_verify'; reason: string }): void {
  logAnalyticsEvent('login_failed', params);
}

// Fires once, ever - the first time a genuinely new user's Home screen
// mounts. Safe to call unconditionally on every Home mount (every returning
// user, and a new user's every subsequent visit): the store-level gate is
// what actually decides whether anything happens.
export function logHomeFirstViewedIfNewUser(): void {
  const { isNewUserPendingActivation, hasLoggedHomeFirstViewed, markHomeFirstViewedLogged } =
    useActivationEventsStore.getState();

  if (!isNewUserPendingActivation || hasLoggedHomeFirstViewed) {
    return;
  }

  logAnalyticsEvent('home_first_viewed');
  markHomeFirstViewedLogged();
}

// Fires once, ever - the first bottom-nav tab press following a new user's
// signup. Deliberately not wired to the Home tab (see _layout.tsx) - Home is
// where every new user already lands automatically, so tapping it isn't a
// "choice" the same way explicitly switching to Mantra/Audio/Wallpapers/
// Rashifal is; matches the plan's own example tag set, which omits Home.
export function logFirstNavigationChoiceIfNewUser(tabName: string): void {
  const { isNewUserPendingActivation, hasLoggedFirstNavigationChoice, markFirstNavigationChoiceLogged } =
    useActivationEventsStore.getState();

  if (!isNewUserPendingActivation || hasLoggedFirstNavigationChoice) {
    return;
  }

  logAnalyticsEvent('first_navigation_choice', { tab_name: tabName });
  markFirstNavigationChoiceLogged();
}

// NOT gated by isNewUserPendingActivation - unlike the other three "first
// new-user X" events, this is a real app-specific milestone for ANY user
// (new or long-returning) setting a zodiac sign for the first time, per the
// plan's own wording. Each call site (Home's BirthdateModal flow,
// edit-profile.tsx's Save flow) determines "first time" itself by checking
// whether the user's profile had no zodiac sign before this exact write -
// see those files' own comments - so no shared one-shot flag is needed here.
export function logZodiacSignSet(zodiacSign: string): void {
  logAnalyticsEvent('zodiac_sign_set', { zodiac_sign: zodiacSign });
}

// Fires once, ever - the first time a genuinely new user's content reaches
// genuine completion (natural end of playback), not just an open. Safe to
// call unconditionally on every real completion event for every user - see
// logHomeFirstViewedIfNewUser's comment, same pattern.
export function logFirstContentCompletedIfNewUser(contentType: string): void {
  const { isNewUserPendingActivation, hasLoggedFirstContentCompleted, markFirstContentCompletedLogged } =
    useActivationEventsStore.getState();

  if (!isNewUserPendingActivation || hasLoggedFirstContentCompleted) {
    return;
  }

  logAnalyticsEvent('first_content_completed', { content_type: contentType });
  markFirstContentCompletedLogged();
}
