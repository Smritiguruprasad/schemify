import AsyncStorage from '@react-native-async-storage/async-storage';
import { Application } from '../engine/types';

const K_PROFILE = 'fs.profile.v1';
const K_APPS = 'fs.apps.v1';
const K_SETTINGS = 'fs.settings.v1';
const K_LANG = 'fs.lang.v1';

export interface StoredSettings {
  voiceEnabled: boolean;
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const storage = {
  loadProfile: () => loadJSON<object | null>(K_PROFILE, null),
  saveProfile: (p: unknown) => saveJSON(K_PROFILE, p),
  clearProfile: () => AsyncStorage.removeItem(K_PROFILE),
  loadApps: () => loadJSON<Application[]>(K_APPS, []),
  saveApps: (a: Application[]) => saveJSON(K_APPS, a),
  clearApps: () => AsyncStorage.removeItem(K_APPS),
  loadSettings: () => loadJSON<StoredSettings>(K_SETTINGS, { voiceEnabled: false }),
  saveSettings: (s: StoredSettings) => saveJSON(K_SETTINGS, s),
  loadLang: () => loadJSON<'en' | 'hi'>(K_LANG, 'en'),
  saveLang: (l: 'en' | 'hi') => saveJSON(K_LANG, l),
};

export async function clearAllDemoData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(K_PROFILE),
    AsyncStorage.removeItem(K_APPS),
    AsyncStorage.removeItem(K_SETTINGS),
  ]);
}
