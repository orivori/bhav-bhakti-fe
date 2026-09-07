import { create } from 'zustand';
import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';

export interface FeatureFlags {
  enablePremiumSubscriptionUI: boolean;
}

// Hardcoded defaults, checked into the app bundle. These are what every
// flag reads as BEFORE the remote fetch below ever resolves (there's no
// gating/loading state anywhere in the app for this - see _layout.tsx),
// and they're also the permanent fallback if that fetch ever fails or the
// device is offline. Change a value here + normal EAS Update push when a
// flag's shipped default itself should change; use the backend
// (bhav-bhakti-be/src/config/featureFlags.config.js) when you need to flip
// a flag live, with no app update at all.
export const FEATURE_FLAG_DEFAULTS: FeatureFlags = {
  enablePremiumSubscriptionUI: false,
};

interface FeatureFlagState {
  flags: FeatureFlags;
  hasFetchedRemote: boolean;
  fetchRemoteFlags: () => Promise<void>;
}

export const useFeatureFlagStore = create<FeatureFlagState>((set) => ({
  flags: FEATURE_FLAG_DEFAULTS,
  hasFetchedRemote: false,

  fetchRemoteFlags: async () => {
    try {
      const response = await apiClient.get<{ data: Partial<FeatureFlags> }>(
        API_ENDPOINTS.FEATURE_FLAGS.GET
      );
      set({
        // Remote values win key-by-key; a flag the backend doesn't return
        // (or a malformed/empty response) simply keeps its hardcoded
        // default rather than becoming undefined.
        flags: { ...FEATURE_FLAG_DEFAULTS, ...response.data },
        hasFetchedRemote: true,
      });
    } catch (error) {
      // Silent, deliberate fallback - an offline device or a backend
      // hiccup on cold start should never block app usage or surface an
      // error to the user. The defaults already in state stand as-is.
      console.warn('Feature flag fetch failed, using hardcoded defaults:', error);
    }
  },
}));
