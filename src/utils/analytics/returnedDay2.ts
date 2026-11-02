import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getLocalDateString } from '@/shared/utils/dateUtil';
import { logMetaReturnedDay2 } from './metaAppEvents';

// Meta returned_day_2 (v10): fired once ever per install, the first time the
// app is opened (cold start or back to the foreground) on a later calendar
// day (device local time) than the install's first open. Never on the first
// day.
//
// Stored in AsyncStorage as { firstOpenDate, installTime, fired }:
// - firstOpenDate: YYYY-MM-DD of the first open, or null = unknown, never
//   fire. It is only recorded when the first open is on the install date
//   (expo-application's install time, which an app update doesn't change).
//   An install from before this code (an existing user) has an earlier
//   install date, so it is stored as unknown and never fires - we can't
//   know their real first open. A fresh install first opened on a later
//   day than it was installed is also unknown (a small, accepted undercount).
// - installTime: a record from another install (an Android backup restored
//   onto a reinstall) is thrown away and decided afresh.
// - Install time unreadable: nothing is stored or fired on this launch.
//
// Meta only, production only (metaAppEvents.ts); the bookkeeping runs on
// every build and never throws.

const STORAGE_KEY = 'returned-day-2';

interface ReturnedDay2Record {
  firstOpenDate: string | null;
  installTime: number;
  fired: boolean;
}

let started = false;
let checking: Promise<void> | null = null;

async function readInstallTime(): Promise<number | null> {
  try {
    const installedAt: unknown = await require('expo-application').getInstallationTimeAsync();
    const ms = installedAt instanceof Date ? installedAt.getTime() : NaN;
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

async function readRecord(): Promise<ReturnedDay2Record | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) return null;
    const value = JSON.parse(stored) as Partial<ReturnedDay2Record> | null;
    if (!value || typeof value.installTime !== 'number' || typeof value.fired !== 'boolean') return null;
    return {
      firstOpenDate: typeof value.firstOpenDate === 'string' ? value.firstOpenDate : null,
      installTime: value.installTime,
      fired: value.fired,
    };
  } catch {
    return null;
  }
}

async function writeRecord(record: ReturnedDay2Record): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

async function check(): Promise<void> {
  const installTime = await readInstallTime();
  if (installTime === null) return;

  const today = getLocalDateString();
  const stored = await readRecord();
  if (!stored || stored.installTime !== installTime) {
    const installDate = getLocalDateString(new Date(installTime));
    await writeRecord({ firstOpenDate: installDate === today ? today : null, installTime, fired: false });
    return; // the first open is never day 2
  }

  if (stored.fired || stored.firstOpenDate === null) return;
  // YYYY-MM-DD strings compare in date order.
  if (today <= stored.firstOpenDate) return;

  // Saved first, so a failed write can't make it fire again next launch.
  if (await writeRecord({ ...stored, fired: true })) {
    logMetaReturnedDay2();
  }
}

function runCheck(): void {
  if (checking) return;
  checking = check()
    .catch(() => {})
    .finally(() => {
      checking = null;
    });
}

// Called once at app start (app/_layout.tsx): checks now and on every return
// to the foreground, since the app can stay alive in the background across
// midnight.
export function startReturnedDay2Tracking(): void {
  if (started) return;
  started = true;
  runCheck();
  AppState.addEventListener('change', (next) => {
    if (next === 'active') runCheck();
  });
}
