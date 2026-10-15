import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useFeatureFlagStore, type FeatureFlags } from '@/store/featureFlagStore';
import { getInstalledBuild } from './installedBuild';
import {
  decideUpdateRequirement,
  isUpdatePromptVariantAllowed,
  type UpdateRequirement,
} from './updateDecision';

// Fixed for the life of the JS runtime: the native channel comes from the
// build, and appVariant from the running bundle (the OTA it was published as).
const IS_VARIANT_ALLOWED = isUpdatePromptVariantAllowed({
  isDevBundle: __DEV__,
  channel: Updates.channel,
  appVariant: Constants.expoConfig?.extra?.appVariant,
});

// For Profile's .dev-only debug row.
export function isUpdatePromptAllowedOnThisBuild(): boolean {
  return IS_VARIANT_ALLOWED;
}

function computeRequirement(flags: FeatureFlags, hasFetchedFlags: boolean): UpdateRequirement {
  return decideUpdateRequirement({
    variantAllowed: IS_VARIANT_ALLOWED,
    hasFetchedFlags,
    maintenanceMode: flags.maintenanceMode,
    updatePromptEnabled: flags.updatePromptEnabled,
    latestBuild: flags.latestBuild,
    minSupportedBuild: flags.minSupportedBuild,
    // Only read once the prompt is switched on, so builds where it's off
    // never even try to load expo-application.
    installedBuild: flags.updatePromptEnabled ? getInstalledBuild() : null,
  });
}

// For non-React callers (the foreground re-check, notification taps).
export function getUpdateRequirement(): UpdateRequirement {
  const { flags, hasFetchedRemote } = useFeatureFlagStore.getState();
  return computeRequirement(flags, hasFetchedRemote);
}

export function useUpdateRequirement(): UpdateRequirement {
  const flags = useFeatureFlagStore((state) => state.flags);
  const hasFetchedRemote = useFeatureFlagStore((state) => state.hasFetchedRemote);
  return computeRequirement(flags, hasFetchedRemote);
}
