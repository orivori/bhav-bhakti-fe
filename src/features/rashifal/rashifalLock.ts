// Rashifal ad-unlock - pure rules (no React Native, no path aliases, so
// rashifalLock.test.mjs can load this file directly in Node).
//
// One rewarded ad unlocks ONE zodiac sign's reading for the rest of the IST
// day. The server decides everything (backend services/rashifalLock.service
// .js); this app code only reads what it says:
//   - GET /rashifal-unlocks/today -> { date, gateActive, signs[] } for the grid
//   - a reading request answers 403 + unlock 'ad' + scope 'rashifal' when
//     the sign is locked
// gateActive false (switches off, premium, a failed status call) = no locks
// anywhere and every sign opens exactly as before.

export const ZODIAC_SIGN_KEYS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export interface RashifalSignStatus {
  sign: string;
  unlocked: boolean;
  available: boolean;
}

export interface RashifalStatus {
  date: string;
  gateActive: boolean;
  signs: RashifalSignStatus[];
}

// Where an unlock started (analytics `trigger`).
export type RashifalTrigger = 'home_card' | 'sign_grid' | 'notification' | 'reading_screen';

// What opening a sign should do.
//   open           - no gate here: open the reading as before
//   open_unlocked  - already unlocked today: open, no prompt
//   prompt         - offer the ad first
export type RashifalOpenDecision = 'open' | 'open_unlocked' | 'prompt';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Anything unexpected reads as "gate not active" - never lock by mistake.
export function parseRashifalStatus(raw: unknown): RashifalStatus | null {
  if (!isRecord(raw) || typeof raw.date !== 'string' || typeof raw.gateActive !== 'boolean') return null;
  const signs = Array.isArray(raw.signs)
    ? raw.signs
        .filter((entry): entry is Record<string, unknown> => isRecord(entry) && typeof entry.sign === 'string')
        .map((entry) => ({
          sign: entry.sign as string,
          unlocked: entry.unlocked === true,
          available: entry.available === true,
        }))
    : [];
  return { date: raw.date, gateActive: raw.gateActive, signs };
}

export function decideRashifalOpen(status: RashifalStatus | null | undefined, sign: string): RashifalOpenDecision {
  if (!status || !status.gateActive) return 'open';
  const entry = status.signs.find((item) => item.sign === sign);
  // Unknown sign or no reading today (cron failure): open normally, so the
  // reading screen shows its usual error - never an ad for nothing.
  if (!entry || !entry.available) return 'open';
  return entry.unlocked ? 'open_unlocked' : 'prompt';
}

// Should the grid draw a lock on this sign?
export function isRashifalSignLocked(status: RashifalStatus | null | undefined, sign: string): boolean {
  return decideRashifalOpen(status, sign) === 'prompt';
}

// A reading request the server refused because the sign is locked.
export function isRashifalLockedError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return error.statusCode === 403 && error.unlock === 'ad';
}

// Never retry a refusal or a missing reading - only real failures.
export function shouldRetryRashifalReading(failureCount: number, error: unknown): boolean {
  const status = isRecord(error) ? error.statusCode : undefined;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

// POST /rashifal-unlocks outcome.
export type RashifalUnlockResponse = 'granted' | 'disabled' | 'no_reading' | 'unauthorized' | 'failed';

export function classifyRashifalUnlockResponse(statusCode: number | undefined, code: string | undefined): RashifalUnlockResponse {
  if (statusCode === 403 && code === 'RASHIFAL_GATE_DISABLED') return 'disabled';
  if (statusCode === 404 && code === 'NO_READING') return 'no_reading';
  if (statusCode === 401) return 'unauthorized';
  return 'failed';
}

// rashifal_reading_shown's `access`: how this reading came to be readable.
//   serverReason      - the reading's rashifalAccess field (backend gate
//                       reason; missing on an older backend = treated as off)
//   unlockedThisVisit - the unlock recorded in this visit, if any
export type RashifalReadingAccess = 'gate_off' | 'ad' | 'no_fill' | 'already_unlocked' | 'premium';

export function rashifalReadingAccess(
  serverReason: unknown,
  unlockedThisVisit: 'reward' | 'no_fill' | null | undefined
): RashifalReadingAccess {
  if (serverReason === 'premium') return 'premium';
  if (serverReason === 'unlocked') {
    if (unlockedThisVisit === 'reward') return 'ad';
    if (unlockedThisVisit === 'no_fill') return 'no_fill';
    return 'already_unlocked';
  }
  // gate_off, client_not_gated, no_user, missing or unknown: no gate here.
  return 'gate_off';
}

// The opener's route param -> an unlock source, or null.
export function parseUnlockedVia(value: unknown): 'reward' | 'no_fill' | null {
  return value === 'reward' || value === 'no_fill' ? value : null;
}
