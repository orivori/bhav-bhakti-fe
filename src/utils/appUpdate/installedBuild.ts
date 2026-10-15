import { OLDER_BUILD, type InstalledBuild } from './updateDecision';

// The installed app's Android build number (versionCode), for the update
// prompt.
//
// Read from expo-application, which is only in v8 and later native builds -
// older builds (v1-v7) still receive the same OTA bundles (runtimeVersion is
// 1.0.0 everywhere), and there the module's native half is missing, so it is
// required lazily inside try/catch, like metaEvents.ts does for the Meta SDK.
//
// Never Constants.expoConfig.android.versionCode: that comes from the running
// OTA's manifest, so after any production OTA it says 8 on every phone.
let cached: InstalledBuild | undefined; // undefined = not read yet

export function getInstalledBuild(): InstalledBuild {
  if (cached !== undefined) return cached;
  try {
    const raw: unknown = require('expo-application').nativeBuildVersion;
    const build = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
    // Unknown (null) when the module loads but gives nothing usable - never
    // triggers anything.
    cached = Number.isInteger(build) && build > 0 ? build : null;
  } catch {
    // "Cannot find native module 'ExpoApplication'" - a pre-v8 build.
    cached = OLDER_BUILD;
  }
  return cached;
}
