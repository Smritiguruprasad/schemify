import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Application,
  ApplicationStatus,
  BeneficiaryProfile,
  Lang,
} from '../engine/types';
import { storage, StoredSettings, clearAllDemoData } from '../services/storage';
import { generateTrackingId } from '../services/api';

export const STATUS_FLOW: ApplicationStatus[] = [
  'submitted',
  'acknowledged',
  'under_review',
  'sanctioned',
];

interface AppState {
  ready: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  profile: BeneficiaryProfile | null;
  setProfile: (p: BeneficiaryProfile) => void;
  clearProfile: () => void;
  applications: Application[];
  addApplication: (
    a: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'timeline'>
  ) => Promise<Application>;
  advanceApplication: (id: string) => Promise<void>;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  resetDemoData: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const now = () => new Date().toISOString();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>('en');
  const [profile, setProfileState] = useState<BeneficiaryProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [voiceEnabled, setVoiceEnabledState] = useState(false);

  useEffect(() => {
    (async () => {
      const [l, p, apps, s] = await Promise.all([
        storage.loadLang(),
        storage.loadProfile() as Promise<BeneficiaryProfile | null>,
        storage.loadApps(),
        storage.loadSettings(),
      ]);
      setLangState(l);
      setProfileState(p);
      setApplications(apps);
      setVoiceEnabledState(s.voiceEnabled);
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.saveLang(l);
  }, []);

  const setProfile = useCallback((p: BeneficiaryProfile) => {
    setProfileState(p);
    storage.saveProfile(p);
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    storage.clearProfile();
  }, []);

  const persistApps = useCallback((apps: Application[]) => {
    setApplications(apps);
    storage.saveApps(apps);
  }, []);

  const addApplication = useCallback<AppState['addApplication']>(
    async (partial) => {
      const ts = now();
      const app: Application = {
        ...partial,
        id: generateTrackingId(),
        status: 'submitted',
        createdAt: ts,
        updatedAt: ts,
        timeline: [{ status: 'submitted', at: ts }],
      };
      persistApps([app, ...applications]);
      return app;
    },
    [applications, persistApps]
  );

  const advanceApplication = useCallback(
    async (id: string) => {
      const updated = applications.map((a) => {
        if (a.id !== id || a.status === 'sanctioned' || a.status === 'rejected') return a;
        const idx = STATUS_FLOW.indexOf(a.status);
        if (idx < 0 || idx === STATUS_FLOW.length - 1) return a;
        const nextStatus = STATUS_FLOW[idx + 1];
        const ts = now();
        return {
          ...a,
          status: nextStatus,
          updatedAt: ts,
          timeline: [...a.timeline, { status: nextStatus, at: ts }],
        };
      });
      persistApps(updated);
    },
    [applications, persistApps]
  );

  const setVoiceEnabled = useCallback((v: boolean) => {
    setVoiceEnabledState(v);
    const s: StoredSettings = { voiceEnabled: v };
    storage.saveSettings(s);
  }, []);

  const resetDemoData = useCallback(async () => {
    await clearAllDemoData();
    setProfileState(null);
    setApplications([]);
    setVoiceEnabledState(false);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      lang,
      setLang,
      profile,
      setProfile,
      clearProfile,
      applications,
      addApplication,
      advanceApplication,
      voiceEnabled,
      setVoiceEnabled,
      resetDemoData,
    }),
    [
      ready,
      lang,
      setLang,
      profile,
      setProfile,
      clearProfile,
      applications,
      addApplication,
      advanceApplication,
      voiceEnabled,
      setVoiceEnabled,
      resetDemoData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
