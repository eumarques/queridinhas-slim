import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { FoodPrefs, nutritionTargets, SlotId, slotsFor } from './menu';

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
};
export const defaultReminders: Reminders = {
  water: { enabled: true, start: '09:00', end: '20:00', everyHours: 3 },
  walk: { enabled: true, time: '18:00' },
  checkin: { enabled: true, time: '21:00' },
};
export const defaultFood: FoodPrefs = { likes: [], avoid: [], restrictions: [], mealsPerDay: 4, activity: 'leve', seed: 1 };

export type WeightEntry = { id: string; date: string; kg: number };
export type Application = { id: string; date: string; dose: string; note: string };

type Data = {
  profile: Profile | null;
  logs: Record<string, DayLog>;
  weights: WeightEntry[];
  applications: Application[];
  food: FoodPrefs | null;
  reminders: Reminders;
};

// ---------- Regras ----------

export const GLASS_ML = 180;
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

/** Peso vigente numa data: última medição até aquele dia. */
export const weightOn = (weights: WeightEntry[], k: string) => {
  const before = weights.filter((w) => w.date <= k);
  return (before.length ? before[before.length - 1] : weights[0])?.kg ?? 70;
};

// ---------- Estado global ----------

const KEY = 'queridinhas:v1';

// ---------- Contato protegido ----------
// Telefone e e-mail ficam fora do armazenamento comum: no celular vão para o armazenamento
// criptografado do sistema (Keychain no iOS, Keystore no Android). No navegador não existe
// esse recurso, então ficam no armazenamento local, em uma chave separada.
type Contact = { phone: string; email: string };
const CONTACT_KEY = 'queridinhas.contato';
const secureAvailable = () => SecureStore.isAvailableAsync().catch(() => false);
const contactStore = {
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
/** Perfil sem telefone/e-mail, para gravar no armazenamento comum. */
const withoutContact = (p: Profile | null) => {
  if (!p) return null;
  const { phone: _phone, email: _email, ...rest } = p;
  return rest;
};
const initial: Data = { profile: null, logs: {}, weights: [], applications: [], food: null, reminders: defaultReminders };
const byDate = <T extends { date: string }>(list: T[]) => [...list].sort((a, b) => a.date.localeCompare(b.date));
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function useAppState() {
  const [data, setData] = useState<Data>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.profile) {
        // migração: perfis antigos sem id
        if (!saved.profile.id) saved.profile.id = uid();
        // migração: versões antigas guardavam telefone/e-mail no armazenamento comum
        const contact = (await contactStore.read().catch(() => null)) ?? { phone: saved.profile.phone ?? '', email: saved.profile.email ?? '' };
        saved.profile = { ...saved.profile, ...contact };
      }
      setData({ ...initial, ...saved, reminders: { ...defaultReminders, ...saved.reminders } });
    })()
      .catch((e) => console.warn('Falha ao carregar os dados salvos', e))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ ...data, profile: withoutContact(data.profile) })).catch((e) => console.warn('Falha ao salvar os dados', e));
  }, [data, ready]);

  const phone = data.profile?.phone;
  const email = data.profile?.email;
  useEffect(() => {
    if (!ready) return;
    contactStore.write(phone !== undefined && email !== undefined ? { phone, email } : null).catch((e) => console.warn('Falha ao salvar o contato protegido', e));
  }, [phone, email, ready]);

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

  const addApplication = useCallback((date: string, dose: string, note: string) => {
    setData((prev) => ({ ...prev, applications: byDate([...prev.applications, { id: uid(), date, dose, note }]) }));
  }, []);

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

  const resetAll = useCallback(() => setData(initial), []);

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
    saveFood,
    regenerateMenu,
    saveReminders,
    giveConsent,
    resetAll,
    hasFoodPrefs: !!data.food,
    foodPrefs: food,
    mealsPerDay: food.mealsPerDay,
    targets,
  };
}

type Store = ReturnType<typeof useAppState>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppState();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}
