import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo-modules-core';
import { isValidInstallId } from './guestStartRules';

const INSTALL_ID_KEY = 'guest_install_id';

/**
 * A random id for this install, and the only way back to its guest account.
 * Saved BEFORE the first network call, so an app killed mid-start returns to
 * the same row instead of making a second one. A random UUID, never ANDROID_ID.
 *
 * A failed read throws rather than making a new id, which would strand the
 * guest's existing account. secureStorage.clearAll() doesn't touch it.
 */
export async function getOrCreateInstallId(): Promise<string> {
  const saved = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (isValidInstallId(saved)) {
    return saved;
  }
  const created = uuid.v4();
  await AsyncStorage.setItem(INSTALL_ID_KEY, created);
  return created;
}
