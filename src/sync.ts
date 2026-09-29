// Sincronização do armazenamento local com o Supabase.
//
// O app continua "offline first": tudo é gravado no aparelho na hora e enviado ao Supabase
// em seguida (com alguns segundos de atraso para agrupar mudanças). Para saber o que mudou,
// guardamos um "retrato" (snapshot) de como cada registro estava na última sincronização.
import { supabase } from './supabase';
import type { AppData, Application, BodyCheck, DayLog, Profile, Reminders, Sex } from './store';
import type { FoodPrefs } from './menu';

type Row = Record<string, unknown>;
type Table = 'profiles' | 'day_logs' | 'weights' | 'applications' | 'body_checks';
const TABLES: Table[] = ['profiles', 'day_logs', 'weights', 'applications', 'body_checks'];
const KEY_COL: Record<Table, string> = { profiles: 'id', day_logs: 'day', weights: 'id', applications: 'id', body_checks: 'id' };
const CONFLICT: Record<Table, string> = { profiles: 'id', day_logs: 'user_id,day', weights: 'id', applications: 'id', body_checks: 'id' };

/** "tabela:chave" → JSON do registro na última sincronização. */
export type Snapshot = Record<string, string>;
type Rows = Record<Table, Map<string, Row>>;

/** JSON com chaves ordenadas, para comparar registros sem falso positivo. */
const stable = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v as Row).filter((k) => (v as Row)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Row)[k])}`).join(',')}}`
  : JSON.stringify(v ?? null);

function toRows(d: AppData, uid: string): Rows {
  const rows: Rows = { profiles: new Map(), day_logs: new Map(), weights: new Map(), applications: new Map(), body_checks: new Map() };
  const p = d.profile;
  if (p) {
    rows.profiles.set(uid, {
      id: uid, name: p.name, age: p.age, sex: p.sex, height_cm: p.height, phone: p.phone, email: p.email,
      goal_weight: p.goalWeight ?? null, created_on: p.createdAt, consent: p.consent ?? null, food: d.food ?? null, reminders: d.reminders,
    });
  }
  for (const [day, log] of Object.entries(d.logs)) rows.day_logs.set(day, { user_id: uid, day, data: log });
  for (const w of d.weights) rows.weights.set(w.id, { id: w.id, user_id: uid, day: w.date, kg: w.kg });
  for (const a of d.applications) {
    rows.applications.set(a.id, { id: a.id, user_id: uid, day: a.date, time: a.time ?? null, dose: a.dose, site: a.site ?? null, side_effects: a.sideEffects ?? [], note: a.note ?? '' });
  }
  for (const b of d.bodyChecks) rows.body_checks.set(b.id, { id: b.id, user_id: uid, day: b.date, measures: b.measures, photos: b.photos, note: b.note ?? '' });
  return rows;
}

function fromRows(rows: Rows, base: AppData): AppData {
  const pr = [...rows.profiles.values()][0];
  const byDate = <T extends { date: string }>(l: T[]) => l.sort((a, b) => a.date.localeCompare(b.date));
  return {
    ...base,
    profile: pr
      ? {
          id: pr.id as string, name: pr.name as string, age: Number(pr.age), sex: pr.sex as Sex,
          height: Number(pr.height_cm), phone: (pr.phone as string) ?? '', email: (pr.email as string) ?? '',
          goalWeight: pr.goal_weight == null ? undefined : Number(pr.goal_weight), createdAt: pr.created_on as string,
          consent: (pr.consent as Profile['consent']) ?? undefined,
        }
      : null,
    food: (pr?.food as FoodPrefs | null) ?? base.food,
    reminders: pr?.reminders ? { ...base.reminders, ...(pr.reminders as Reminders) } : base.reminders,
    logs: Object.fromEntries([...rows.day_logs.values()].map((r) => [r.day as string, r.data as DayLog])),
    weights: byDate([...rows.weights.values()].map((r) => ({ id: r.id as string, date: r.day as string, kg: Number(r.kg) }))),
    applications: byDate([...rows.applications.values()].map((r) => ({
      id: r.id as string, date: r.day as string, time: (r.time as string) ?? undefined, dose: r.dose as string,
      site: (r.site as Application['site']) ?? undefined, sideEffects: (r.side_effects as string[]) ?? [], note: (r.note as string) ?? '',
    }))),
    bodyChecks: byDate([...rows.body_checks.values()].map((r) => ({
      id: r.id as string, date: r.day as string, measures: (r.measures as BodyCheck['measures']) ?? {},
      photos: (r.photos as BodyCheck['photos']) ?? {}, note: (r.note as string) ?? '',
    }))),
  };
}

const snapKey = (t: Table, k: string) => `${t}:${k}`;
const snapshotOf = (rows: Rows): Snapshot => {
  const s: Snapshot = {};
  for (const t of TABLES) for (const [k, r] of rows[t]) s[snapKey(t, k)] = stable(r);
  return s;
};

/** Busca tudo do servidor e combina com o que existe no aparelho. */
export async function pullAndMerge(uid: string, local: AppData, snap: Snapshot): Promise<{ data: AppData; snapshot: Snapshot }> {
  if (!supabase) throw new Error('Supabase não configurado');
  const server = {} as Record<Table, Row[]>;
  for (const t of TABLES) {
    const q = supabase.from(t).select('*');
    const { data, error } = await (t === 'profiles' ? q.eq('id', uid) : q.eq('user_id', uid));
    if (error) throw error;
    server[t] = data ?? [];
  }
  // normaliza o formato do servidor passando pelo mesmo conversor usado no envio
  const rawRows = {} as Rows;
  for (const t of TABLES) rawRows[t] = new Map(server[t].map((r) => [String(r[KEY_COL[t]]), r]));
  const remoteData = fromRows(rawRows, local);
  const remote = toRows(remoteData, uid);
  const mine = toRows(local, uid);

  const merged = {} as Rows;
  for (const t of TABLES) {
    const out = new Map(remote[t]);
    for (const [k, row] of mine[t]) {
      const before = snap[snapKey(t, k)];
      if (!remote[t].has(k)) {
        if (before === undefined) out.set(k, row); // criado no aparelho e ainda não enviado
        // se já tinha sido sincronizado e sumiu do servidor, foi apagado em outro aparelho
      } else if (before !== undefined && stable(row) !== before) {
        out.set(k, row); // alterado no aparelho depois da última sincronização
      }
    }
    for (const k of remote[t].keys()) {
      if (!mine[t].has(k) && snap[snapKey(t, k)] !== undefined) out.delete(k); // apagado no aparelho, ainda não enviado
    }
    merged[t] = out;
  }
  return { data: fromRows(merged, local), snapshot: snapshotOf(remote) };
}

/** Envia ao servidor só o que mudou desde o último snapshot. */
export async function push(uid: string, data: AppData, snap: Snapshot): Promise<Snapshot> {
  if (!supabase) throw new Error('Supabase não configurado');
  const rows = toRows(data, uid);
  for (const t of TABLES) {
    const changed = [...rows[t].entries()].filter(([k, r]) => snap[snapKey(t, k)] !== stable(r)).map(([, r]) => r);
    if (changed.length) {
      const { error } = await supabase.from(t).upsert(changed, { onConflict: CONFLICT[t] });
      if (error) throw error;
    }
    const removed = Object.keys(snap).filter((k) => k.startsWith(`${t}:`)).map((k) => k.slice(t.length + 1)).filter((k) => !rows[t].has(k));
    if (removed.length && t !== 'profiles') {
      const { error } = await supabase.from(t).delete().eq('user_id', uid).in(KEY_COL[t], removed);
      if (error) throw error;
    }
  }
  return snapshotOf(rows);
}

/** Existe algo no aparelho ainda não enviado? */
export const hasPending = (uid: string, data: AppData, snap: Snapshot) => {
  const now = snapshotOf(toRows(data, uid));
  const keys = new Set([...Object.keys(now), ...Object.keys(snap)]);
  for (const k of keys) if (now[k] !== snap[k]) return true;
  return false;
};
