import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FoodPrefs, nutritionTargets, SlotId, slotsFor } from './menu';
import { deletePhoto } from './photos';
import { isSupabaseConfigured, supabase } from './supabase';
import { hasPending, pullAndMerge, push, Snapshot } from './sync';

// ---------- Tipos ----------

export type Sex = 'feminino' | 'masculino' | 'outro';
export type Profile = {
  id: string; // identifica a usuária dona dos registros deste aparelho
  name: string;
  age: number;
  sex: Sex;
  height: number; // cm
  phone: string;
  email: string;
  goalWeight?: number;
  createdAt: string; // YYYY-MM-DD
  /** Consentimento LGPD (dados de saúde): data/hora do aceite e versão da política aceita. */
  consent?: { at: string; version: string };
};

export type MealId = SlotId;
export type Mood = 'bem' | 'regular' | 'enjoo';
export type Intensity = 'leve' | 'moderada';

export type DayLog = {
  glasses: number;
  meals: Partial<Record<MealId, boolean>>;
  protein: number;
  fiber: number;
  walk: { done: boolean; minutes: number; intensity: Intensity };
  mood?: Mood;
  note: string;
  done: boolean;
  /** Check-in diário: respostas às três perguntas principais. */
  checkin?: { walk: boolean; diet: boolean; water: boolean; savedAt: string };
};

export type Reminders = {
  water: { enabled: boolean; start: string; end: string; everyHours: number };
  walk: { enabled: boolean; time: string };
  checkin: { enabled: boolean; time: string };
  /** Aplicação de TG: avisa no dia previsto (última aplicação + intervalo). */
  application: { enabled: boolean; time: string };
  /** Fotos e medidas: avisa quando completar 15 dias da última avaliação. */
  body: { enabled: boolean; time: string };
};
export const defaultReminders: Reminders = {
  water: { enabled: true, start: '09:00', end: '20:00', everyHours: 3 },
  walk: { enabled: true, time: '18:00' },
  checkin: { enabled: true, time: '21:00' },
  application: { enabled: true, time: '20:00' },
  body: { enabled: true, time: '10:00' },
};
export const defaultFood: FoodPrefs = { likes: [], avoid: [], restrictions: [], mealsPerDay: 4, activity: 'leve', seed: 1 };

export type WeightEntry = { id: string; date: string; kg: number };
export type InjectionSite = 'abdomen_esq' | 'abdomen_dir' | 'coxa_esq' | 'coxa_dir' | 'braco_esq' | 'braco_dir';
export type Application = {
  id: string;
  date: string;
  /** HH:MM, opcional */
  time?: string;
  dose: string;
  site?: InjectionSite;
  sideEffects?: string[];
  note: string;
};
export type MeasureId = 'waist' | 'abdomen' | 'hip' | 'bust' | 'arm' | 'thigh';
export type Pose = 'front' | 'side' | 'back';
/** Avaliação a cada 15 dias: medidas (cm) + fotos (referências locais ou "sb:<caminho>" no Supabase). */
export type BodyCheck = { id: string; date: string; measures: Partial<Record<MeasureId, number>>; photos: Partial<Record<Pose, string>>; note: string };

export type AppData = {
  profile: Profile | null;
  logs: Record<string, DayLog>;
  weights: WeightEntry[];
  applications: Application[];
  bodyChecks: BodyCheck[];
  food: FoodPrefs | null;
  reminders: Reminders;
};
type Data = AppData;

// ---------- Regras ----------

export const GLASS_ML = 180;
/** Tirzepatida: aplicação semanal. */
export const APPLICATION_INTERVAL_DAYS = 7;
/** Fotos e medidas: a cada 15 dias. */
export const BODY_CHECK_INTERVAL_DAYS = 15;
export const goals = { walkMinutes: 30, fiber: 25 };

/** Meta de água: 1 L a cada 20 kg de peso corporal. */
export const waterGoalMl = (kg: number) => Math.round((kg / 20) * 1000);

/** Estimativa de gasto: MET × peso (kg) × horas. Caminhada leve ≈ 2,8 MET; moderada ≈ 3,5 MET. */
export const MET: Record<Intensity, number> = { leve: 2.8, moderada: 3.5 };
export const walkKcal = (kg: number, minutes: number, intensity: Intensity) => Math.round(MET[intensity] * kg * (minutes / 60));

export const emptyDay = (): DayLog => ({
  glasses: 0,
  meals: {},
  protein: 0,
  fiber: 0,
  walk: { done: false, minutes: 0, intensity: 'leve' },
  note: '',
  done: false,
});

// ---------- Datas ----------

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const fmtDate = (k: string) => {
  const [y, m, d] = k.split('-');
  return `${d}/${m}/${y}`;
};
export const fmtShort = (k: string) => fmtDate(k).slice(0, 5);
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const weekday = (k: string) => weekdays[fromKey(k).getDay()];
/** Converte "dd/mm/aaaa" em chave; null se inválida. */
export const parseDateBR = (s: string) => {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const k = `${m[3]}-${m[2]}-${m[1]}`;
  const d = fromKey(k);
  return dateKey(d) === k ? k : null;
};

export const fmtNum = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');
export const parseNum = (s: string) => {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() !== '' && Number.isFinite(n) ? n : NaN;
};
export const fmtLiters = (ml: number) => `${fmtNum(ml / 1000)} L`;

// ---------- Cálculos ----------

export function dayProgress(log: DayLog, kg: number, mealsPerDay = 4) {
  const waterMl = log.glasses * GLASS_ML;
  const goalMl = waterGoalMl(kg);
  const slots = slotsFor(mealsPerDay);
  const mealsDone = slots.filter((m) => log.meals[m.id]).length;
  const parts = {
    water: Math.min(1, waterMl / goalMl),
    food: mealsDone / slots.length,
    walk: log.walk.done ? Math.min(1, log.walk.minutes / goals.walkMinutes) : 0,
    checkin: log.checkin ? 1 : 0,
  };
  const pct = Math.round(((parts.water + parts.food + parts.walk + parts.checkin) / 4) * 100);
  return { waterMl, goalMl, mealsDone, mealsTotal: slots.length, parts, pct };
}

export const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
/** Próxima aplicação prevista (última + 7 dias). */
export const nextApplicationDate = (apps: Application[]) => (apps.length ? addDays(apps[apps.length - 1].date, APPLICATION_INTERVAL_DAYS) : undefined);
/** Próxima avaliação de fotos e medidas (última + 15 dias). */
export const nextBodyCheckDate = (checks: BodyCheck[]) => (checks.length ? addDays(checks[checks.length - 1].date, BODY_CHECK_INTERVAL_DAYS) : undefined);

/** Peso vigente numa data: última medição até aquele dia. */
export const weightOn = (weights: WeightEntry[], k: string) => {
  const before = weights.filter((w) => w.date <= k);
  return (before.length ? before[before.length - 1] : weights[0])?.kg ?? 70;
};

// ---------- Estado global ----------

const LOCAL_KEY = 'queridinhas:v1';
/** Cada conta tem seu próprio espaço no aparelho; sem Supabase, usa o espaço local de sempre. */
const dataKeyFor = (userId?: string) => (userId ? `${LOCAL_KEY}:${userId}` : LOCAL_KEY);

// ---------- Contato protegido ----------
// Telefone e e-mail ficam fora do armazenamento comum: no celular vão para o armazenamento
// criptografado do sistema (Keychain no iOS, Keystore no Android). No navegador não existe
// esse recurso, então ficam no armazenamento local, em uma chave separada.
type Contact = { phone: string; email: string };
const secureAvailable = () => SecureStore.isAvailableAsync().catch(() => false);
const contactStore = (userId?: string) => {
  const CONTACT_KEY = userId ? `queridinhas.contato.${userId}` : 'queridinhas.contato';
  return {
    async read(): Promise<Contact | null> {
      const raw = (await secureAvailable()) ? await SecureStore.getItemAsync(CONTACT_KEY) : await AsyncStorage.getItem(CONTACT_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    async write(c: Contact | null) {
      const secure = await secureAvailable();
      if (!c) return secure ? SecureStore.deleteItemAsync(CONTACT_KEY) : AsyncStorage.removeItem(CONTACT_KEY);
      const raw = JSON.stringify(c);
      return secure ? SecureStore.setItemAsync(CONTACT_KEY, raw) : AsyncStorage.setItem(CONTACT_KEY, raw);
    },
  };
};
/** Perfil sem telefone/e-mail, para gravar no armazenamento comum. */
const withoutContact = (p: Profile | null) => {
  if (!p) return null;
  const { phone: _phone, email: _email, ...rest } = p;
  return rest;
};
const initial: Data = { profile: null, logs: {}, weights: [], applications: [], bodyChecks: [], food: null, reminders: defaultReminders };
const byDate = <T extends { date: string }>(list: T[]) => [...list].sort((a, b) => a.date.localeCompare(b.date));
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Lê os dados salvos de um espaço do aparelho (com as migrações de versões antigas). */
async function readLocal(userId?: string): Promise<Data | null> {
  const raw = await AsyncStorage.getItem(dataKeyFor(userId));
  if (!raw) return null;
  const saved = JSON.parse(raw);
  if (saved.profile) {
    // migração: perfis antigos sem id
    if (!saved.profile.id) saved.profile.id = uid();
    // migração: versões antigas guardavam telefone/e-mail no armazenamento comum
    const contact = (await contactStore(userId).read().catch(() => null)) ?? { phone: saved.profile.phone ?? '', email: saved.profile.email ?? '' };
    saved.profile = { ...saved.profile, ...contact };
  }
  return { ...initial, ...saved, reminders: { ...defaultReminders, ...saved.reminders } };
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'pending' | 'error';

function useAppState(userId?: string) {
  const cloud = !!userId && isSupabaseConfigured;
  const KEY = dataKeyFor(userId);
  const SNAP_KEY = `${KEY}:sync`;
  const [data, setData] = useState<Data>(initial);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloud ? 'syncing' : 'local');
  const [legacy, setLegacy] = useState<Data | null>(null);
  const snapRef = useRef<Snapshot>({});
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    (async () => {
      const local = (await readLocal(userId)) ?? initial;
      if (!cloud) return setData(local);
      snapRef.current = JSON.parse((await AsyncStorage.getItem(SNAP_KEY)) ?? '{}');
      setData(local);
      try {
        const merged = await pullAndMerge(userId!, local, snapRef.current);
        snapRef.current = merged.snapshot;
        await AsyncStorage.setItem(SNAP_KEY, JSON.stringify(merged.snapshot));
        setData(merged.data);
        setSyncStatus(hasPending(userId!, merged.data, merged.snapshot) ? 'pending' : 'synced');
        // conta nova e vazia: oferece importar os dados usados antes do login neste aparelho
        if (!merged.data.profile) {
          const old = await readLocal();
          if (old?.profile) setLegacy(old);
        }
      } catch (e) {
        console.warn('Falha ao sincronizar com o Supabase', e);
        setSyncStatus('error');
      }
    })()
      .catch((e) => console.warn('Falha ao carregar os dados salvos', e))
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ ...data, profile: withoutContact(data.profile) })).catch((e) => console.warn('Falha ao salvar os dados', e));
  }, [data, ready, KEY]);

  const phone = data.profile?.phone;
  const email = data.profile?.email;
  useEffect(() => {
    if (!ready) return;
    contactStore(userId).write(phone !== undefined && email !== undefined ? { phone, email } : null).catch((e) => console.warn('Falha ao salvar o contato protegido', e));
  }, [phone, email, ready, userId]);

  // Envio para o Supabase: agrupa mudanças por 1,5 s; em caso de falha tenta de novo em 30 s.
  const pushing = useRef<Promise<void> | null>(null);
  const flush = useCallback(async () => {
    if (!cloud) return;
    await pushing.current;
    const current = dataRef.current;
    if (!hasPending(userId!, current, snapRef.current)) return setSyncStatus('synced');
    setSyncStatus('syncing');
    pushing.current = (async () => {
      try {
        snapRef.current = await push(userId!, current, snapRef.current);
        await AsyncStorage.setItem(SNAP_KEY, JSON.stringify(snapRef.current));
        setSyncStatus(hasPending(userId!, dataRef.current, snapRef.current) ? 'pending' : 'synced');
      } catch (e) {
        console.warn('Falha ao enviar dados ao Supabase', e);
        setSyncStatus('error');
      }
    })();
    await pushing.current;
    pushing.current = null;
  }, [cloud, userId, SNAP_KEY]);

  useEffect(() => {
    if (!ready || !cloud) return;
    if (hasPending(userId!, data, snapRef.current)) setSyncStatus('pending');
    const t = setTimeout(flush, 1500);
    return () => clearTimeout(t);
  }, [data, ready, cloud, flush, userId]);

  useEffect(() => {
    if (!cloud || syncStatus !== 'error') return;
    const t = setTimeout(flush, 30000);
    return () => clearTimeout(t);
  }, [cloud, syncStatus, flush]);

  const weights = data.weights;
  const initialWeight = weights[0]?.kg;
  const currentWeight = weights[weights.length - 1]?.kg;

  const getDay = useCallback((k: string) => {
    const log = data.logs[k];
    return log ? { ...emptyDay(), ...log, walk: { ...emptyDay().walk, ...log.walk } } : emptyDay();
  }, [data.logs]);

  const updateDay = useCallback((k: string, patch: Partial<DayLog> | ((d: DayLog) => Partial<DayLog>)) => {
    setData((prev) => {
      const cur = prev.logs[k] ? { ...emptyDay(), ...prev.logs[k] } : emptyDay();
      const p = typeof patch === 'function' ? patch(cur) : patch;
      return { ...prev, logs: { ...prev.logs, [k]: { ...cur, ...p } } };
    });
  }, []);

  /** Registra (ou substitui) a medição de peso de uma data. */
  const addWeight = useCallback((date: string, kg: number) => {
    setData((prev) => ({
      ...prev,
      weights: byDate([...prev.weights.filter((w) => w.date !== date), { id: uid(), date, kg }]),
    }));
  }, []);

  const removeWeight = useCallback((id: string) => {
    setData((prev) => (prev.weights.length <= 1 ? prev : { ...prev, weights: prev.weights.filter((w) => w.id !== id) }));
  }, []);

  /** Cadastro inicial e edição de perfil. O peso informado vira a medição do dia. */
  const saveProfile = useCallback((profile: Omit<Profile, 'createdAt' | 'id'>, weightKg: number) => {
    const today = dateKey();
    setData((prev) => {
      const next = {
        ...prev,
        profile: { ...profile, id: prev.profile?.id ?? uid(), createdAt: prev.profile?.createdAt ?? today, consent: profile.consent ?? prev.profile?.consent },
      };
      if (weightKg !== prev.weights[prev.weights.length - 1]?.kg) {
        next.weights = byDate([...prev.weights.filter((w) => w.date !== today), { id: uid(), date: today, kg: weightKg }]);
      }
      return next;
    });
  }, []);

  const addApplication = useCallback((a: Omit<Application, 'id'>) => {
    setData((prev) => ({ ...prev, applications: byDate([...prev.applications, { ...a, id: uid() }]) }));
  }, []);

  const updateApplication = useCallback((id: string, patch: Partial<Omit<Application, 'id'>>) => {
    setData((prev) => ({ ...prev, applications: byDate(prev.applications.map((a) => (a.id === id ? { ...a, ...patch } : a))) }));
  }, []);

  const removeApplication = useCallback((id: string) => {
    setData((prev) => ({ ...prev, applications: prev.applications.filter((a) => a.id !== id) }));
  }, []);

  /** Cria ou atualiza uma avaliação de fotos e medidas. */
  const saveBodyCheck = useCallback((check: Omit<BodyCheck, 'id'> & { id?: string }) => {
    setData((prev) => {
      const id = check.id ?? uid();
      return { ...prev, bodyChecks: byDate([...prev.bodyChecks.filter((b) => b.id !== id), { ...check, id }]) };
    });
  }, []);

  const removeBodyCheck = useCallback((id: string) => {
    const check = dataRef.current.bodyChecks.find((b) => b.id === id);
    Object.values(check?.photos ?? {}).forEach((ref) => ref && deletePhoto(ref).catch(() => {}));
    setData((prev) => ({ ...prev, bodyChecks: prev.bodyChecks.filter((b) => b.id !== id) }));
  }, []);

  /** Traz para a conta os dados usados neste aparelho antes do login. */
  const importLegacy = useCallback(() => {
    if (!legacy) return;
    setData((prev) => ({ ...legacy, profile: legacy.profile ? { ...legacy.profile, id: userId ?? legacy.profile.id } : null, reminders: prev.reminders }));
    setLegacy(null);
  }, [legacy, userId]);

  const saveFood = useCallback((food: Omit<FoodPrefs, 'seed'>) => {
    setData((prev) => ({ ...prev, food: { ...food, seed: prev.food?.seed ?? 1 } }));
  }, []);

  /** Gera outra combinação de pratos mantendo as preferências. */
  const regenerateMenu = useCallback(() => {
    setData((prev) => ({ ...prev, food: { ...(prev.food ?? defaultFood), seed: (prev.food?.seed ?? 1) + 1 } }));
  }, []);

  const saveReminders = useCallback((reminders: Reminders) => setData((prev) => ({ ...prev, reminders })), []);

  /** Registra o aceite da política de privacidade (usuárias cadastradas antes do consentimento existir). */
  const giveConsent = useCallback((version: string) => {
    setData((prev) => (prev.profile ? { ...prev, profile: { ...prev.profile, consent: { at: new Date().toISOString(), version } } } : prev));
  }, []);

  /**
   * Apaga tudo: fotos, registros e perfil. Com conta no Supabase, apaga também os dados do servidor
   * e a própria conta (função delete_my_account). Retorna mensagem de erro, se houver.
   */
  const resetAll = useCallback(async (): Promise<string | null> => {
    const photos = dataRef.current.bodyChecks.flatMap((b) => Object.values(b.photos)).filter((p): p is string => !!p);
    if (cloud && supabase) {
      try {
        await Promise.all(photos.map((p) => deletePhoto(p)));
        const { error } = await supabase.rpc('delete_my_account');
        if (error) throw error;
      } catch (e) {
        console.warn('Falha ao apagar a conta', e);
        return 'Não foi possível apagar seus dados no servidor. Verifique a internet e tente novamente.';
      }
      await AsyncStorage.multiRemove([KEY, SNAP_KEY]).catch(() => {});
      await contactStore(userId).write(null).catch(() => {});
      await supabase.auth.signOut().catch(() => {});
      return null;
    }
    await Promise.all(photos.map((p) => deletePhoto(p).catch(() => {})));
    setData(initial);
    return null;
  }, [cloud, userId, KEY, SNAP_KEY]);

  /** Sair da conta: envia o que falta e remove a cópia local (aparelho compartilhado). */
  const signOutAndClear = useCallback(async (): Promise<string | null> => {
    if (!cloud || !supabase) return null;
    await flush();
    if (hasPending(userId!, dataRef.current, snapRef.current)) return 'Há alterações que ainda não foram enviadas. Conecte-se à internet e tente sair de novo.';
    await AsyncStorage.multiRemove([KEY, SNAP_KEY]).catch(() => {});
    await contactStore(userId).write(null).catch(() => {});
    await supabase.auth.signOut();
    return null;
  }, [cloud, userId, flush, KEY, SNAP_KEY]);

  const food = data.food ?? defaultFood;
  const targets = data.profile ? nutritionTargets(data.profile, currentWeight ?? 70, food.activity) : undefined;

  return {
    ready,
    ...data,
    initialWeight,
    currentWeight,
    getDay,
    updateDay,
    addWeight,
    removeWeight,
    saveProfile,
    addApplication,
    updateApplication,
    removeApplication,
    saveBodyCheck,
    removeBodyCheck,
    saveFood,
    regenerateMenu,
    saveReminders,
    giveConsent,
    resetAll,
    signOutAndClear,
    userId,
    cloud,
    syncStatus,
    syncNow: flush,
    legacyAvailable: !!legacy,
    importLegacy,
    hasFoodPrefs: !!data.food,
    foodPrefs: food,
    mealsPerDay: food.mealsPerDay,
    targets,
  };
}

type Store = ReturnType<typeof useAppState>;
const StoreContext = createContext<Store | null>(null);

/** userId: conta do Supabase (troque a key do provider ao trocar de conta). */
export function StoreProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const store = useAppState(userId);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}
