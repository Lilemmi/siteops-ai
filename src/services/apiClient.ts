import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {API_BASE_URL} from '../config';

/** Legacy AsyncStorage key — migrated once into Keychain/Keystore, then removed. */
const LEGACY_AUTH_TOKEN_KEY = '@siteops/auth-token/v1';
const KEYCHAIN_SERVICE = 'com.siteopsai.auth';
const KEYCHAIN_USERNAME = 'session';

let memoryToken: string | null | undefined;

function keychainWriteOptions(): Keychain.SetOptions {
  const options: Keychain.SetOptions = {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
  // Android Keystore security level; ignored on iOS.
  if (Platform.OS === 'android') {
    options.securityLevel = Keychain.SECURITY_LEVEL.SECURE_SOFTWARE;
  }
  return options;
}

async function readKeychainToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
    if (credentials && typeof credentials.password === 'string' && credentials.password.length > 0) {
      return credentials.password;
    }
  } catch {
    // Fall through to legacy storage / empty.
  }
  return null;
}

/**
 * Prefer hardware-backed Keychain (iOS) / Keystore (Android).
 * Migrates any leftover AsyncStorage token once, then deletes it.
 */
export async function getAuthToken(): Promise<string | null> {
  if (memoryToken !== undefined) {
    return memoryToken;
  }

  const fromKeychain = await readKeychainToken();
  if (fromKeychain) {
    memoryToken = fromKeychain;
    return fromKeychain;
  }

  try {
    const legacy = await AsyncStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
    if (legacy) {
      await setAuthToken(legacy);
      await AsyncStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
      return legacy;
    }
  } catch {
    // Ignore legacy read failures.
  }

  memoryToken = null;
  return null;
}

export async function setAuthToken(token: string): Promise<void> {
  memoryToken = token;
  try {
    await Keychain.setGenericPassword(KEYCHAIN_USERNAME, token, keychainWriteOptions());
  } catch {
    // Last-resort fallback if Keychain is unavailable (rare simulator/edge cases).
    await AsyncStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
    return;
  }

  try {
    await AsyncStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {
    // Best-effort cleanup of plaintext token.
  }
}

export async function clearAuthToken(): Promise<void> {
  memoryToken = null;
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
  } catch {
    // Ignore Keychain wipe failures; still clear legacy.
  }
  await AsyncStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

/** Authenticated fetch against the SiteOps API. Attaches Bearer token when present. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has('Content-Type') && !headers.has('content-type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
}
