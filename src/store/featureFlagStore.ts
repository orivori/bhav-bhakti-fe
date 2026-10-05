import { create } from 'zustand';
import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';

export interface FeatureFlags {
  enablePremiumSubscriptionUI: boolean;
  // Maintenance mode kill switch - the backend's MAINTENANCE_MODE /
  // MAINTENANCE_MESSAGE Railway variables. While on, app/_layout.tsx swaps
  // the whole navigator for MaintenanceScreen.
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}

// Hardcoded defaults, checked into the app bundle. These are what every
// flag reads as BEFORE the remote fetch below ever resolves, and they're
// also the permanent fallback if that fetch ever fails or the device is
// offline. Change a value here + normal EAS Update push when a flag's
// shipped default itself should change; use the backend
// (bhav-bhakti-be/src/config/featureFlags.config.js) when you need to flip
// a flag live, with no app update at all.
export const FEATURE_FLAG_DEFAULTS: FeatureFlags = {
  enablePremiumSubscriptionUI: false,
  maintenanceMode: false,
  maintenanceMessage: null,
};

// 'checking' only until the cold-start fetch settles. A failed fetch ends in
// 'ok' (the app behaves exactly as it did before maintenance mode existed) -
// only a successful response carrying a real `true` can mean 'maintenance'.
export type FeatureFlagStatus = 'checking' | 'ok' | 'maintenance';

// Foreground re-fetches are throttled to one per this window, so flipping
// between apps doesn't hit the backend every time.
const FOREGROUND_REFETCH_INTERVAL_MS = 5 * 60 * 1000;

interface FeatureFlagState {
  flags: FeatureFlags;
  status: FeatureFlagStatus;
  hasFetchedRemote: boolean;
  isFetching: boolean;
  fetchRemoteFlags: () => Promise<void>;
  refetchOnForeground: () => void;
}

let inFlightFetch: Promise<void> | null = null;
let lastFetchStartedAt = 0;

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  flags: FEATURE_FLAG_DEFAULTS,
  status: 'checking',
  hasFetchedRemote: false,
  isFetching: false,

  // Cold start, foreground re-fetch and MaintenanceScreen's Retry all come
  // through here; overlapping calls share one request.
  fetchRemoteFlags: () => {
    if (inFlightFetch) return inFlightFetch;

    lastFetchStartedAt = Date.now();
    set({ isFetching: true });

    inFlightFetch = (async () => {
      try {
        const response = await apiClient.get<{ data: Partial<FeatureFlags> }>(
          API_ENDPOINTS.FEATURE_FLAGS.GET
        );
        const remote = response?.data ?? {};
        // Remote values win key-by-key; a flag the backend doesn't return
        // (or a malformed/empty response) simply keeps its hardcoded
        // default rather than becoming undefined.
        const flags: FeatureFlags = { ...FEATURE_FLAG_DEFAULTS, ...remote };
        // Strict: only a real boolean true turns maintenance on - a string,
        // a number or a missing key (an older backend) all mean off.
        flags.maintenanceMode = remote.maintenanceMode === true;
        flags.maintenanceMessage =
          typeof remote.maintenanceMessage === 'string' && remote.maintenanceMessage.trim()
            ? remote.maintenanceMessage.trim()
            : null;

        set({
          flags,
          status: flags.maintenanceMode ? 'maintenance' : 'ok',
          hasFetchedRemote: true,
        });
      } catch (error) {
        // Silent, deliberate fallback - an offline device or a backend
        // hiccup should never block app usage or surface an error to the
        // user. The flags already in state stand as-is: a failed cold-start
        // fetch lands on 'ok' with the defaults, and a failed re-fetch never
        // changes the current status either way.
        console.warn('Feature flag fetch failed, keeping current flags:', error);
        if (get().status === 'checking') {
          set({ status: 'ok' });
        }
      } finally {
        set({ isFetching: false });
        inFlightFetch = null;
      }
    })();

    return inFlightFetch;
  },

  // Called whenever the app returns to the foreground (app/_layout.tsx).
  // This app's screens stay mounted in the background, so without this a
  // user who only ever resumes the app would never see maintenance mode
  // switch on or off.
  refetchOnForeground: () => {
    if (Date.now() - lastFetchStartedAt < FOREGROUND_REFETCH_INTERVAL_MS) return;
    get().fetchRemoteFlags();
  },
}));
