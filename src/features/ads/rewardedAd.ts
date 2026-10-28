import { AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getCrashlytics, setAttribute } from '@react-native-firebase/crashlytics';
import type { RewardedAd } from 'react-native-google-mobile-ads';
import { getAdsLib, getRewardedAdUnitId, initializeAds } from './adsModule';
import { useAdFlowStore } from '@/store/adFlowStore';

// One rewarded ad at a time (Revenue Model §5e sections 3 and 8).
//
// Loading starts the moment the opt-in card appears (prepareRewardedAd) and
// the ad is released on "Not now". After "Watch", the flow waits at most
// AD_LOAD_TIMEOUT_MS for it, then falls through to no_fill.
//
// The NEXT ad is preloaded only after an ad has been shown in this session,
// and only on phones reporting more than 4 GB of memory (a "4 GB" phone
// reports about 3.7 GB, so that means 6 GB-class phones and up) - out-of-
// memory crashes are this app's main crash class (CLAUDE.md §125).

export const AD_LOAD_TIMEOUT_MS = 8000;
const PRELOAD_MIN_TOTAL_MEMORY_BYTES = 4 * 1024 ** 3;
// Google expires a loaded ad after an hour.
const LOADED_AD_MAX_AGE_MS = 50 * 60 * 1000;

const IS_PRODUCTION = Constants.expoConfig?.extra?.appVariant === 'production';

export type AdLoadFailure = 'no_fill' | 'load_error';
export type AdLoadOutcome = { ok: true; loadMs: number } | { ok: false; reason: AdLoadFailure | 'timeout' };
export type AdShowOutcome = 'rewarded' | 'closed_no_reward' | 'failed';

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; loadMs: number; loadedAt: number }
  | { status: 'failed'; reason: AdLoadFailure };

// Type-only: erased at build time, so this never loads the library.
type RewardedAdInstance = RewardedAd;

function setAdShowingKey(showing: boolean): void {
  try {
    setAttribute(getCrashlytics(), 'ad_showing', showing ? '1' : '0');
  } catch {
    // Crashlytics unavailable - never block the ad over a diagnostics key.
  }
}

function toLoadFailure(error: unknown): AdLoadFailure {
  const text = `${(error as { code?: string })?.code ?? ''} ${(error as Error)?.message ?? ''}`.toLowerCase();
  return text.includes('no-fill') || text.includes('no fill') ? 'no_fill' : 'load_error';
}

class PreparedRewardedAd {
  private state: LoadState = { status: 'loading' };
  private ad: RewardedAdInstance | null = null;
  private unsubscribers: (() => void)[] = [];
  private waiters = new Set<() => void>();
  private used = false;

  constructor(private readonly unitId: string, private readonly simulateNoAd: boolean) {}

  get loadMs(): number | undefined {
    return this.state.status === 'loaded' ? this.state.loadMs : undefined;
  }

  // Still worth handing out from the preload slot.
  get isUsable(): boolean {
    if (this.used) return false;
    if (this.state.status === 'loading') return true;
    return this.state.status === 'loaded' && Date.now() - this.state.loadedAt < LOADED_AD_MAX_AGE_MS;
  }

  async start(): Promise<void> {
    if (this.simulateNoAd) {
      this.setState({ status: 'failed', reason: 'no_fill' });
      return;
    }
    const lib = getAdsLib();
    if (!lib || !(await initializeAds()) || this.used) {
      this.setState({ status: 'failed', reason: 'load_error' });
      return;
    }
    try {
      const startedAt = Date.now();
      const ad = lib.RewardedAd.createForAdRequest(this.unitId);
      this.ad = ad;
      this.unsubscribers.push(
        ad.addAdEventListener(lib.RewardedAdEventType.LOADED, () => {
          this.setState({ status: 'loaded', loadMs: Date.now() - startedAt, loadedAt: Date.now() });
        }),
        ad.addAdEventListener(lib.AdEventType.ERROR, (error) => {
          // Errors before the ad is shown are load failures; show() handles
          // its own.
          if (this.state.status === 'loading') this.setState({ status: 'failed', reason: toLoadFailure(error) });
        })
      );
      ad.load();
    } catch (error) {
      this.setState({ status: 'failed', reason: toLoadFailure(error) });
    }
  }

  waitForLoad(timeoutMs: number): Promise<AdLoadOutcome> {
    return new Promise((resolve) => {
      const settle = (): boolean => {
        if (this.state.status === 'loaded') {
          resolve({ ok: true, loadMs: this.state.loadMs });
          return true;
        }
        if (this.state.status === 'failed') {
          resolve({ ok: false, reason: this.state.reason });
          return true;
        }
        return false;
      };
      if (settle()) return;
      const timer = setTimeout(() => {
        this.waiters.delete(waiter);
        resolve({ ok: false, reason: 'timeout' });
      }, timeoutMs);
      const waiter = () => {
        if (settle()) {
          clearTimeout(timer);
          this.waiters.delete(waiter);
        }
      };
      this.waiters.add(waiter);
    });
  }

  // Resolves once the ad has closed. 'rewarded' only if Google's
  // earned-reward event fired - a click is never a reward.
  show(): Promise<AdShowOutcome> {
    const lib = getAdsLib();
    const ad = this.ad;
    if (!lib || !ad || this.state.status !== 'loaded' || this.used) return Promise.resolve('failed');
    this.used = true;

    return new Promise<AdShowOutcome>((resolve) => {
      let earned = false;
      let settled = false;
      const finish = (outcome: AdShowOutcome) => {
        if (settled) return;
        settled = true;
        setAdShowingKey(false);
        this.release();
        resolve(outcome);
      };
      this.unsubscribers.push(
        ad.addAdEventListener(lib.RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
        ad.addAdEventListener(lib.AdEventType.CLOSED, () => finish(earned ? 'rewarded' : 'closed_no_reward')),
        ad.addAdEventListener(lib.AdEventType.ERROR, () => finish(earned ? 'rewarded' : 'failed'))
      );
      setAdShowingKey(true);
      Promise.resolve()
        .then(() => ad.show())
        .catch(() => finish('failed'));
    });
  }

  release(): void {
    this.used = true;
    this.unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        // already gone
      }
    });
    this.unsubscribers = [];
    this.waiters.clear();
    this.ad = null;
  }

  private setState(state: LoadState): void {
    this.state = state;
    this.waiters.forEach((waiter) => waiter());
  }
}

export type RewardedAdHandle = Pick<PreparedRewardedAd, 'waitForLoad' | 'show' | 'release' | 'loadMs'>;

let preloaded: PreparedRewardedAd | null = null;
let hasShownAdThisSession = false;

function createAndStart(unitId: string, simulateNoAd: boolean): PreparedRewardedAd {
  const prepared = new PreparedRewardedAd(unitId, simulateNoAd);
  prepared.start().catch(() => {});
  return prepared;
}

/**
 * Starts getting an ad ready (or hands over the preloaded one). Null when ads
 * can't run at all in this build.
 */
export function prepareRewardedAd(): RewardedAdHandle | null {
  const unitId = getRewardedAdUnitId();
  if (!unitId) return null;

  // .dev-only "Simulate no ad" (Profile > Debug): this load fails as no_fill.
  if (!IS_PRODUCTION && useAdFlowStore.getState().consumeSimulateNoAd()) {
    return createAndStart(unitId, true);
  }

  if (preloaded?.isUsable) {
    const handle = preloaded;
    preloaded = null;
    return handle;
  }
  preloaded?.release();
  preloaded = null;
  return createAndStart(unitId, false);
}

/**
 * Called once an ad has been shown: preloads the next one on phones with
 * enough memory.
 */
export function noteAdShownAndMaybePreload(): void {
  hasShownAdThisSession = true;
  if (preloaded?.isUsable) return;
  const totalMemory = Device.totalMemory;
  if (!totalMemory || totalMemory <= PRELOAD_MIN_TOTAL_MEMORY_BYTES) return;
  const unitId = getRewardedAdUnitId();
  if (!unitId || !hasShownAdThisSession) return;
  preloaded = createAndStart(unitId, false);
}

// True when the app is in the foreground - an ad is never shown otherwise.
export function isAppInForeground(): boolean {
  return AppState.currentState === 'active';
}

/**
 * .dev Debug button: load and show one test ad with no feed and no backend
 * call, and report what happened.
 */
export async function showTestRewardedAd(): Promise<'rewarded' | 'closed_no_reward' | 'failed' | AdLoadOutcome> {
  const handle = prepareRewardedAd();
  if (!handle) return 'failed';
  const loaded = await handle.waitForLoad(AD_LOAD_TIMEOUT_MS);
  if (!loaded.ok) {
    handle.release();
    return loaded;
  }
  if (!isAppInForeground()) {
    handle.release();
    return 'failed';
  }
  const outcome = await handle.show();
  noteAdShownAndMaybePreload();
  return outcome;
}
