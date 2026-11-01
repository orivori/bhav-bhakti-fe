import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { parseContentLink } from './contentLink';
import { savePendingContentLink } from '@/store/pendingContentLinkStore';
import {
  logDeferredLinkChecked,
  logDeferredLinkReceived,
  type DeferredLinkResult,
} from '@/utils/analytics/deepLinkEvents';

// Switch for the probe below - set to false and ship an OTA to stop it.
export const DEFERRED_LINK_PROBE_ENABLED = true;
// Switch for the future Home/hub pin that will show the pending link.
// Nothing reads it yet: the pin isn't built.
export const DEFERRED_LINK_PIN_ENABLED = false;

// Deferred-link probe: asks Meta's SDK for a deferred app link (the link of
// an install ad the person tapped before installing) and only reports what
// came back - it never navigates. Answers whether the link arrives on the
// first, second or third launch this code runs on, or never.
//
// - Production app only: the Meta App is registered for the production
//   package alone and the .dev app has no Meta plugin (metaEvents.ts).
// - The SDK is required lazily inside try/catch, never at app start (the
//   pattern of metaAdEvents.ts), and the fetch call itself is inside the try:
//   AppLink.fetchDeferredAppLink() reads NativeModules.FBAppLink, which
//   throws if the native module is missing.
// - At most once per launch, on at most MAX_PROBE_LAUNCHES launches per
//   install. Progress is kept in AsyncStorage with the install time; a record
//   from another install (an Android backup restored onto a reinstall) is
//   reset.
// - A valid content link (contentLink.ts) is saved as the pending link; the
//   raw link is never stored or logged.
// - Every failure ends quietly: runDeferredLinkProbe() never throws.

const IS_PRODUCTION_VARIANT = Constants.expoConfig?.extra?.appVariant === 'production';
const PROBE_STORAGE_KEY = 'deferred-link-probe';
const MAX_PROBE_LAUNCHES = 3;
// The SDK's server call normally answers in a few seconds; past this the
// launch is reported as 'error' rather than never reported at all.
const FETCH_TIMEOUT_MS = 20000;
const OPEN_LINK_PREFIX = 'bhavbhakti://open/';

interface ProbeRecord {
  launches: number;
  result: DeferredLinkResult | null;
  installTime: number | null;
}

type AppLinkApi = { fetchDeferredAppLink: () => Promise<string | null> };

let hasRunThisLaunch = false;
let cachedAppLink: AppLinkApi | null | undefined; // undefined = not tried yet

function getAppLink(): AppLinkApi | null {
  if (cachedAppLink !== undefined) return cachedAppLink;
  try {
    const appLink = require('react-native-fbsdk-next').AppLink;
    cachedAppLink = appLink && typeof appLink.fetchDeferredAppLink === 'function' ? appLink : null;
  } catch (error) {
    if (__DEV__) console.warn('deferredAppLink: Meta SDK failed to load', error);
    cachedAppLink = null;
  }
  return cachedAppLink ?? null;
}

// Install time in ms, or null when it can't be read.
async function readInstallTime(): Promise<number | null> {
  try {
    const installedAt: unknown = await require('expo-application').getInstallationTimeAsync();
    const ms = installedAt instanceof Date ? installedAt.getTime() : NaN;
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

async function readProbeRecord(): Promise<ProbeRecord | null> {
  try {
    const stored = await AsyncStorage.getItem(PROBE_STORAGE_KEY);
    if (stored === null) return null;
    const value = JSON.parse(stored) as Partial<ProbeRecord> | null;
    if (!value || typeof value.launches !== 'number' || !Number.isInteger(value.launches)) return null;
    return {
      launches: value.launches,
      result: value.result ?? null,
      installTime: typeof value.installTime === 'number' ? value.installTime : null,
    };
  } catch {
    return null;
  }
}

async function writeProbeRecord(record: ProbeRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Not saved: this launch may be probed again next time - harmless.
  }
}

async function fetchDeferredLink(): Promise<{ result: DeferredLinkResult; link: string | null }> {
  const appLink = getAppLink();
  if (!appLink) return { result: 'unavailable', link: null };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = new Promise<'timeout'>((resolve) => {
      timeout = setTimeout(() => resolve('timeout'), FETCH_TIMEOUT_MS);
    });
    // Inside the try: throws at once if NativeModules.FBAppLink is missing.
    const answer = await Promise.race([appLink.fetchDeferredAppLink(), timedOut]);
    if (answer === 'timeout') return { result: 'error', link: null };
    return typeof answer === 'string' && answer.length > 0
      ? { result: 'received', link: answer }
      : { result: 'none', link: null };
  } catch {
    return { result: 'error', link: null };
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function isEmbeddedLaunch(): boolean {
  try {
    return Updates.isEmbeddedLaunch === true;
  } catch {
    return false;
  }
}

// Called once the navigator is mounted (app/_layout.tsx). Never throws.
export async function runDeferredLinkProbe(): Promise<void> {
  if (!DEFERRED_LINK_PROBE_ENABLED || !IS_PRODUCTION_VARIANT || hasRunThisLaunch) return;
  hasRunThisLaunch = true;
  try {
    const installTime = await readInstallTime();
    const stored = await readProbeRecord();
    const isOtherInstall =
      stored !== null &&
      typeof stored.installTime === 'number' &&
      typeof installTime === 'number' &&
      stored.installTime !== installTime;
    const record = stored && !isOtherInstall ? stored : null;
    if (record && record.launches >= MAX_PROBE_LAUNCHES) return;

    const probeLaunch = (record?.launches ?? 0) + 1;
    // Counted before the fetch, so a launch that dies mid-fetch still uses
    // up one of the 3.
    await writeProbeRecord({ launches: probeLaunch, result: record?.result ?? null, installTime });

    const startedAt = Date.now();
    const { result, link } = await fetchDeferredLink();
    logDeferredLinkChecked({
      result,
      probe_launch: probeLaunch,
      embedded_launch: isEmbeddedLaunch(),
      ms: Date.now() - startedAt,
    });

    if (link !== null) {
      const contentLink = parseContentLink(link);
      logDeferredLinkReceived({
        content_type: contentLink?.type ?? 'other',
        route: link.startsWith(OPEN_LINK_PREFIX) ? 'open' : 'other',
      });
      if (contentLink) {
        await savePendingContentLink(contentLink, installTime ?? undefined);
      }
    }

    await writeProbeRecord({ launches: probeLaunch, result, installTime });
  } catch (error) {
    if (__DEV__) console.warn('deferredAppLink: probe failed', error);
  }
}
