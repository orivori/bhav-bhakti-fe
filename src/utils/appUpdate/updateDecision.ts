// Pure show/hide rules for the "update available" prompt - no React Native
// imports, so they can be checked on their own. The inputs are gathered by
// useUpdateRequirement.ts and UpdatePromptModal.tsx.
//
// Two levels, both driven by the backend's /feature-flags (Railway variables
// UPDATE_PROMPT_ENABLED, ANDROID_LATEST_BUILD, ANDROID_MIN_BUILD):
// - 'required': installed build below the minimum -> UpdateRequiredScreen,
//   which replaces the whole app until the user updates.
// - 'soft': installed build below the latest -> UpdatePromptModal, dismissible.
// Anything unclear - no successful fetch, a malformed number, an unknown
// installed build, a build variant that isn't allowed - means 'none'.

// A build that can't load expo-application predates v8 (see
// installedBuild.ts); 'older' means "NEWEST_BUILD_WITHOUT_MODULE or lower".
export const OLDER_BUILD = 'older' as const;
export const NEWEST_BUILD_WITHOUT_MODULE = 7;

// number = the real versionCode; 'older' = v7 or lower; null = unknown.
export type InstalledBuild = number | typeof OLDER_BUILD | null;

export type UpdateRequirement = 'none' | 'soft' | 'required';

// Same bounds as the backend's parseBuildNumber.
const MAX_BUILD_NUMBER = 9999;

export function isValidBuildNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_BUILD_NUMBER;
}

// Which builds may show the prompt at all:
// - the production app: production channel, production variant;
// - the .dev app: preview channel, with the variant its OTAs are published
//   under ('development', per the dev OTA command) or its embedded bundle's
//   ('preview', from eas.json's preview profile).
// Anything else - a local Metro bundle (__DEV__), a development-profile build
// with no channel, a mismatched channel/variant pair - stays off.
export function isUpdatePromptVariantAllowed({
  isDevBundle,
  channel,
  appVariant,
}: {
  isDevBundle: boolean;
  channel: string | null | undefined;
  appVariant: string | null | undefined;
}): boolean {
  if (isDevBundle) return false;
  if (channel === 'production') return appVariant === 'production';
  if (channel === 'preview') return appVariant === 'development' || appVariant === 'preview';
  return false;
}

// 'below' only when it's certain; 'unknown' when an 'older' build is compared
// against a target it can't be placed against (7 or lower).
function compareToTarget(installed: number | typeof OLDER_BUILD, target: number): 'below' | 'notBelow' | 'unknown' {
  if (installed === OLDER_BUILD) {
    return target > NEWEST_BUILD_WITHOUT_MODULE ? 'below' : 'unknown';
  }
  return installed < target ? 'below' : 'notBelow';
}

export interface UpdateRequirementInput {
  variantAllowed: boolean;
  // A /feature-flags response actually arrived this run (the store's
  // hasFetchedRemote). Defaults alone never prompt.
  hasFetchedFlags: boolean;
  maintenanceMode: boolean;
  updatePromptEnabled: boolean;
  latestBuild: number | null;
  minSupportedBuild: number | null;
  installedBuild: InstalledBuild;
}

export function decideUpdateRequirement(input: UpdateRequirementInput): UpdateRequirement {
  const { variantAllowed, hasFetchedFlags, maintenanceMode, updatePromptEnabled, installedBuild } = input;
  // Maintenance mode wins: its screen is already up.
  if (!variantAllowed || !hasFetchedFlags || maintenanceMode || updatePromptEnabled !== true) return 'none';
  if (installedBuild === null) return 'none';

  const latest = isValidBuildNumber(input.latestBuild) ? input.latestBuild : null;
  // Same safety rule as the backend: a minimum only counts alongside a valid
  // latest build it doesn't exceed.
  const min =
    latest !== null && isValidBuildNumber(input.minSupportedBuild) && input.minSupportedBuild <= latest
      ? input.minSupportedBuild
      : null;

  if (min !== null && compareToTarget(installedBuild, min) === 'below') return 'required';
  if (latest !== null && compareToTarget(installedBuild, latest) === 'below') return 'soft';
  return 'none';
}

// "Later" brings the soft prompt back after this long, for the same latest
// build. A higher latest build brings it back at the next calm moment.
export const SOFT_PROMPT_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

// The main tabs (expo-router pathnames of app/(main)'s tab screens). The soft
// prompt only appears on one of these - never on the login screens, the
// player or any other pushed screen.
export const MAIN_TAB_PATHNAMES: readonly string[] = ['/', '/mantras', '/ringtones', '/daily-status', '/stories'];

export interface SoftPromptInput {
  requirement: UpdateRequirement;
  latestBuild: number | null;
  isAuthenticated: boolean;
  pathname: string;
  // Anything in either playbackStore slot playing (mantra/aarti/bhajan/story
  // or a ringtone). Home's autoplay previews aren't counted - they're paused
  // while the prompt is open instead.
  isSomethingPlaying: boolean;
  // Another full-screen modal (paywall, session-expired prompt) is up.
  isOtherModalOpen: boolean;
  isFirstSession: boolean;
  hasShownThisSession: boolean;
  dismissedForLatest: number | null;
  dismissedAt: number | null;
  now: number;
}

export function shouldShowSoftPrompt(input: SoftPromptInput): boolean {
  if (input.requirement !== 'soft' || !isValidBuildNumber(input.latestBuild)) return false;
  if (!input.isAuthenticated || input.isFirstSession || input.hasShownThisSession) return false;
  if (input.isSomethingPlaying || input.isOtherModalOpen) return false;
  if (!MAIN_TAB_PATHNAMES.includes(input.pathname)) return false;

  const { dismissedForLatest, dismissedAt } = input;
  if (dismissedForLatest !== null && dismissedAt !== null && dismissedForLatest >= input.latestBuild) {
    // Snoozed for this latest build. A clock moved backwards (negative age)
    // counts as still snoozed.
    if (input.now - dismissedAt < SOFT_PROMPT_SNOOZE_MS) return false;
  }
  return true;
}
