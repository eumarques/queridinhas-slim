import * as Notifications from 'expo-notifications';
import { Bell, CaretLeft, Drop, CheckCircle, Minus, PersonSimpleWalk, Plus } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { ActionButton, Card, Chip, IconBadge, Notice, Title } from './components';
import { dateKey, dayProgress, fmtLiters, GLASS_ML, Reminders, useStore } from './store';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

/** Lembretes locais só existem no app instalado (Android/iOS); no navegador não há agendamento. */
export const remindersSupported = Platform.OS !== 'web';
const CHANNEL = 'lembretes';
const DAYS_AHEAD = 3; // reagendado sempre que o app abre ou algo muda
const MAX_WATER_PER_DAY = 6;

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Horários dos lembretes de água dentro da janela, com intervalo mínimo de 2 h e no máximo 6 por dia.
 * Pula horários a menos de 30 min dos lembretes de caminhada e check-in para não acumular avisos.
 */
export function waterTimes(r: Reminders) {
  const busy = [r.walk.enabled && toMin(r.walk.time), r.checkin.enabled && toMin(r.checkin.time)].filter((x): x is number => x !== false);
  const times: string[] = [];
  const step = Math.max(2, r.water.everyHours) * 60;
  for (let t = toMin(r.water.start); t <= toMin(r.water.end) && times.length < MAX_WATER_PER_DAY; t += step) {
    if (!busy.some((b) => Math.abs(b - t) < 30)) times.push(toHHMM(t));
  }
  return times;
}

export async function ensurePermission() {
  if (!remindersSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Lembretes', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export type TodayState = { waterMl: number; goalMl: number; walkDone: boolean; checkinDone: boolean };

// Operações de agendamento rodam uma de cada vez, para duas sincronizações simultâneas não duplicarem avisos.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job);
  queue = run.catch(() => {});
  return run;
}

/** Remove todos os lembretes agendados (ex.: ao apagar os dados do aparelho). */
export function cancelReminders() {
  if (!remindersSupported) return Promise.resolve();
  return enqueue(() => Notifications.cancelAllScheduledNotificationsAsync());
}

/** Cancela e recria os lembretes conforme configurações e registros de hoje. */
export function syncReminders(r: Reminders, today: TodayState) {
  if (!remindersSupported) return Promise.resolve();
  return enqueue(() => doSync(r, today));
}

async function doSync(r: Reminders, today: TodayState) {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const at = (offset: number, hhmm: string) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(Math.floor(toMin(hhmm) / 60), toMin(hhmm) % 60, 0, 0);
    return d;
  };
  const schedule = async (date: Date, title: string, body: string) => {
    if (date.getTime() <= now) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  };

  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const isToday = offset === 0;
    if (r.water.enabled && !(isToday && today.waterMl >= today.goalMl)) {
      for (const t of waterTimes(r)) {
        const left = today.goalMl - today.waterMl;
        await schedule(
          at(offset, t),
          'Hora de se hidratar 💧',
          isToday ? `Faltam ${Math.ceil(left / GLASS_ML)} copos (${fmtLiters(left)}) para sua meta de hoje.` : `Sua meta é ${fmtLiters(today.goalMl)} por dia. Que tal um copo de água agora?`
        );
      }
    }
    if (r.walk.enabled && !(isToday && today.walkDone)) {
      await schedule(at(offset, r.walk.time), 'Bora caminhar? 🚶', 'Uma caminhada leve já faz diferença. Depois, registre no Meu Dia.');
    }
    if (r.checkin.enabled && !(isToday && today.checkinDone)) {
      await schedule(at(offset, r.checkin.time), 'Seu check-in de hoje ✨', 'Três perguntas rápidas para acompanhar sua evolução.');
    }
  }
}

function TimeStepper({ label, value, onChange, min = 5 * 60, max = 23 * 60 }: { label: string; value: string; onChange: (v: string) => void; min?: number; max?: number }) {
  const colors = useColors();
  const s = useStyles();
  const m = toMin(value);
  return (
    <View style={s.timeRow}>
      <Text style={s.timeLabel}>{label}</Text>
      <View style={s.timeCtrl}>
        <Pressable onPress={() => onChange(toHHMM(Math.max(min, m - 30)))} accessibilityRole="button" accessibilityLabel={`${label}: 30 minutos antes`} hitSlop={6} style={s.timeBtn}>
          <Minus size={16} weight="bold" color={colors.primaryDark} />
        </Pressable>
        <Text style={s.timeValue}>{value}</Text>
        <Pressable onPress={() => onChange(toHHMM(Math.min(max, m + 30)))} accessibilityRole="button" accessibilityLabel={`${label}: 30 minutos depois`} hitSlop={6} style={s.timeBtn}>
          <Plus size={16} weight="bold" color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

export function RemindersScreen({ close }: { close: () => void }) {
  const { reminders, saveReminders, getDay, currentWeight, mealsPerDay } = useStore();
  const colors = useColors();
  const s = useStyles();
  const [r, setR] = useState<Reminders>(reminders);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (remindersSupported) Notifications.getPermissionsAsync().then((p) => setDenied(!p.granted && !p.canAskAgain)).catch(() => {});
  }, []);

  const set = <K extends keyof Reminders>(k: K, patch: Partial<Reminders[K]>) => { setR({ ...r, [k]: { ...r[k], ...patch } }); setStatus(null); };
  const times = waterTimes(r);
  const windowError = toMin(r.water.end) <= toMin(r.water.start) ? 'O horário final precisa ser depois do inicial.' : '';

  const save = async () => {
    if (windowError) return setStatus({ text: windowError, ok: false });
    saveReminders(r);
    if (!remindersSupported) return setStatus({ text: 'Preferências salvas. Os lembretes funcionam no app instalado no celular.', ok: true });
    try {
      const anyOn = r.water.enabled || r.walk.enabled || r.checkin.enabled;
      const granted = anyOn ? await ensurePermission() : true;
      setDenied(!granted);
      if (granted) {
        // agenda já com a permissão concedida (a sincronização automática pode ter rodado antes dela)
        const log = getDay(dateKey());
        const p = dayProgress(log, currentWeight ?? 70, mealsPerDay);
        await syncReminders(r, { waterMl: p.waterMl, goalMl: p.goalMl, walkDone: log.walk.done, checkinDone: !!log.checkin });
      }
      setStatus(granted ? { text: 'Lembretes atualizados.', ok: true } : { text: 'Permita notificações nas configurações do aparelho para receber os lembretes.', ok: false });
    } catch {
      setStatus({ text: 'Não foi possível configurar os lembretes agora. Tente novamente.', ok: false });
    }
  };

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ true: colors.primaryLight, false: colors.border }}
      thumbColor={value ? colors.primary : colors.card}
      {...({ activeThumbColor: colors.primary } as object)} // react-native-web
    />
  );

  return (
    <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={s.back}>
        <CaretLeft size={16} weight="bold" color={colors.primary} />
        <Text style={s.backText}>Voltar</Text>
      </Pressable>
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><Bell size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle="Escolha quais lembretes receber e em que horários.">Notificações</Title>
      </View>

      {(!remindersSupported || denied) && (
        <View style={{ marginBottom: spacing.lg }}>
          {!remindersSupported && <Notice tone="danger">No navegador os lembretes não são enviados. Suas escolhas ficam salvas e passam a valer no app do celular.</Notice>}
          {denied && <Notice tone="danger">As notificações estão bloqueadas para este app. Ative-as nas configurações do aparelho.</Notice>}
        </View>
      )}

      <Card>
        <View style={s.head}>
          <IconBadge tone="info" icon={<Drop size={18} weight="fill" color={colors.info} />} />
          <Text style={s.cardTitle}>Beber água</Text>
          <Toggle value={r.water.enabled} onChange={(enabled) => set('water', { enabled })} label="Lembretes de água" />
        </View>
        {r.water.enabled && (
          <>
            <TimeStepper label="Começar às" value={r.water.start} onChange={(start) => set('water', { start })} min={6 * 60} max={21 * 60} />
            <TimeStepper label="Terminar às" value={r.water.end} onChange={(end) => set('water', { end })} min={7 * 60} max={22 * 60} />
            <Text style={s.label}>Intervalo</Text>
            <View style={s.chips}>
              {[2, 3, 4].map((h) => <Chip key={h} label={`A cada ${h} h`} active={r.water.everyHours === h} onPress={() => set('water', { everyHours: h })} />)}
            </View>
            <Text style={s.small}>
              {windowError || `${times.length} lembrete${times.length === 1 ? '' : 's'} por dia: ${times.join(', ')}. Param de chegar quando você bate a meta do dia.`}
            </Text>
          </>
        )}
      </Card>

      <Card>
        <View style={s.head}>
          <IconBadge tone="success" icon={<PersonSimpleWalk size={18} weight="fill" color={colors.success} />} />
          <Text style={s.cardTitle}>Caminhada</Text>
          <Toggle value={r.walk.enabled} onChange={(enabled) => set('walk', { enabled })} label="Lembrete de caminhada" />
        </View>
        {r.walk.enabled && (
          <>
            <TimeStepper label="Horário" value={r.walk.time} onChange={(time) => set('walk', { time })} />
            <Text style={s.small}>Um lembrete por dia; não chega se a caminhada já estiver registrada.</Text>
          </>
        )}
      </Card>

      <Card>
        <View style={s.head}>
          <IconBadge icon={<CheckCircle size={18} weight="fill" color={colors.primaryDark} />} />
          <Text style={s.cardTitle}>Check-in diário</Text>
          <Toggle value={r.checkin.enabled} onChange={(enabled) => set('checkin', { enabled })} label="Lembrete de check-in" />
        </View>
        {r.checkin.enabled && (
          <>
            <TimeStepper label="Horário" value={r.checkin.time} onChange={(time) => set('checkin', { time })} />
            <Text style={s.small}>Um lembrete por dia; não chega se o check-in já estiver feito.</Text>
          </>
        )}
      </Card>

      {status && <Notice tone={status.ok ? 'success' : 'danger'}>{status.text}</Notice>}
      <ActionButton label="Salvar lembretes" onPress={save} />
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md, minHeight: 44 },
  backText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  label: { fontSize: type.small, color: colors.textSecondary, fontFamily: fonts.bodyBold, marginTop: spacing.md, marginBottom: spacing.sm },
  small: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.small, marginTop: spacing.sm, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  timeLabel: { fontFamily: fonts.bodySemiBold, fontSize: type.body, color: colors.text },
  timeCtrl: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  timeValue: { minWidth: 56, textAlign: 'center', fontFamily: fonts.headingBold, fontSize: type.title, color: colors.primaryDark },
}));
