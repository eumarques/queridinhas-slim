import { CaretLeft, ClockCounterClockwise, CaretRight, PencilSimple, Syringe, Trash, Warning } from 'phosphor-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, Card, Chip, Field, IconBadge, Notice, SectionLabel, Title } from './components';
import {
  addDays,
  Application,
  APPLICATION_INTERVAL_DAYS,
  dateKey,
  daysBetween,
  fmtDate,
  fromKey,
  InjectionSite,
  nextApplicationDate,
  parseNum,
  useStore,
  weekday,
} from './store';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

export const DOSES = ['2,5', '5', '7,5', '10', '12,5', '15'];
export const siteLabels: Record<InjectionSite, string> = {
  abdomen_esq: 'Abdômen esq.',
  abdomen_dir: 'Abdômen dir.',
  coxa_esq: 'Coxa esq.',
  coxa_dir: 'Coxa dir.',
  braco_esq: 'Braço esq.',
  braco_dir: 'Braço dir.',
};
const ROTATION: InjectionSite[] = ['abdomen_esq', 'abdomen_dir', 'coxa_esq', 'coxa_dir', 'braco_esq', 'braco_dir'];
const SIDE_EFFECTS = ['Sem efeitos', 'Náusea', 'Vômito', 'Diarreia', 'Prisão de ventre', 'Azia/refluxo', 'Dor de cabeça', 'Cansaço', 'Tontura', 'Reação no local'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Rodízio do local: sugere o próximo da sequência depois do último usado. */
const suggestedSite = (apps: Application[]) => {
  const last = [...apps].reverse().find((a) => a.site)?.site;
  return last ? ROTATION[(ROTATION.indexOf(last) + 1) % ROTATION.length] : ROTATION[0];
};
const doseNum = (d: string) => parseNum(d);
const maskTime = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
};
const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** Situação da próxima aplicação em texto curto. */
export function nextApplicationText(apps: Application[], today = dateKey()) {
  const next = nextApplicationDate(apps);
  if (!next) return { next, text: 'Nenhuma aplicação registrada ainda.', late: false };
  const diff = daysBetween(today, next);
  if (diff > 1) return { next, text: `Próxima em ${diff} dias • ${weekday(next)}, ${fmtDate(next)}`, late: false };
  if (diff === 1) return { next, text: `Próxima amanhã • ${fmtDate(next)}`, late: false };
  if (diff === 0) return { next, text: 'A próxima aplicação é hoje!', late: false };
  return { next, text: `Aplicação atrasada ${-diff} dia${diff === -1 ? '' : 's'} (prevista para ${fmtDate(next)})`, late: true };
}

// ---------------------------------------------------------------------------
// Mini calendário
// ---------------------------------------------------------------------------

function MiniCalendar({ month, onMonth, done, due, selected, onSelect }: {
  month: string; // YYYY-MM
  onMonth: (m: string) => void;
  done: Set<string>;
  due?: string;
  selected: string;
  onSelect: (k: string) => void;
}) {
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(y, m - 1, i + 1)))];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    onMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <View>
      <View style={s.calHead}>
        <Pressable onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} style={s.calNav}>
          <CaretLeft size={16} weight="bold" color={colors.primaryDark} />
        </Pressable>
        <Text style={s.calTitle}>{MONTHS[m - 1]} {y}</Text>
        <Pressable onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel="Próximo mês" hitSlop={8} style={s.calNav}>
          <CaretRight size={16} weight="bold" color={colors.primaryDark} />
        </Pressable>
      </View>
      <View style={s.calRow}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <Text key={i} style={s.calWeek}>{d}</Text>)}
      </View>
      <View style={s.calGrid}>
        {cells.map((k, i) => {
          if (!k) return <View key={`e${i}`} style={s.calCell} />;
          const isDone = done.has(k);
          const isDue = k === due && !isDone;
          const isSel = k === selected;
          return (
            <Pressable
              key={k}
              onPress={() => onSelect(k)}
              accessibilityRole="button"
              accessibilityLabel={`${fmtDate(k)}${isDone ? ', aplicação registrada' : ''}${isDue ? ', aplicação prevista' : ''}`}
              accessibilityState={{ selected: isSel }}
              style={s.calCell}
            >
              <View style={[s.calDay, isDone && s.calDone, isDue && s.calDue, isSel && s.calSel]}>
                <Text style={[s.calNum, k === today && s.calToday, isDone && { color: colors.onPrimary }]}>{Number(k.slice(8))}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={s.legend}>
        <View style={s.legendItem}><View style={[s.legendDot, s.calDone]} /><Text style={s.legendText}>Aplicação feita</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, s.calDue]} /><Text style={s.legendText}>Próxima prevista</Text></View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

type Form = { dose: string; time: string; site?: InjectionSite; effects: string[]; note: string };

export function ApplicationsScreen({ close, initialDate }: { close: () => void; initialDate?: string }) {
  const { applications, addApplication, updateApplication, removeApplication } = useStore();
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const [selected, setSelected] = useState(initialDate ?? today);
  const [month, setMonth] = useState((initialDate ?? today).slice(0, 7));
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const last = applications[applications.length - 1];
  // sugestões (dose e local) sempre calculadas a partir da lista mais recente
  const blankFor = (list: Application[]): Form => ({ dose: list[list.length - 1]?.dose ?? DOSES[0], time: '', site: suggestedSite(list), effects: [], note: '' });
  const blank = () => blankFor(applications);
  const [form, setForm] = useState<Form>(blank);

  const done = useMemo(() => new Set(applications.map((a) => a.date)), [applications]);
  const status = nextApplicationText(applications, today);
  const dayApps = applications.filter((a) => a.date === selected);
  const history = [...applications].reverse();
  const intervals = applications.slice(1).map((a, i) => daysBetween(applications[i].date, a.date));
  const onTime = intervals.filter((d) => d >= APPLICATION_INTERVAL_DAYS - 1 && d <= APPLICATION_INTERVAL_DAYS + 1).length;

  const select = (k: string) => { setSelected(k); setMonth(k.slice(0, 7)); setEditing(null); setForm(blank()); setMsg(null); };
  const toggleEffect = (e: string) => {
    const on = form.effects.includes(e);
    // "Sem efeitos" exclui os demais e vice-versa
    const effects = e === 'Sem efeitos' ? (on ? [] : ['Sem efeitos']) : on ? form.effects.filter((x) => x !== e) : [...form.effects.filter((x) => x !== 'Sem efeitos'), e];
    setForm({ ...form, effects });
  };

  const save = () => {
    const dose = doseNum(form.dose);
    if (selected > today) return setMsg({ text: 'Não é possível registrar aplicação em data futura.', ok: false });
    if (!(dose > 0 && dose <= 20)) return setMsg({ text: 'Informe a dose em mg (ex.: 2,5).', ok: false });
    if (form.time && !validTime(form.time)) return setMsg({ text: 'Horário inválido. Use o formato 20:30.', ok: false });
    const payload = { date: selected, dose: form.dose.replace('.', ','), time: form.time || undefined, site: form.site, sideEffects: form.effects, note: form.note.trim() };
    const prev = [...applications].reverse().find((a) => a.date < selected && a.id !== editing);
    if (editing) updateApplication(editing, payload);
    else addApplication(payload);
    const updated = (editing ? applications.map((a) => (a.id === editing ? { ...a, ...payload } : a)) : [...applications, { ...payload, id: 'novo' }]).sort((a, b) => a.date.localeCompare(b.date));
    const gap = prev ? daysBetween(prev.date, selected) : undefined;
    setMsg({
      text: `${editing ? 'Aplicação atualizada' : 'Aplicação registrada'} em ${fmtDate(selected)}.${gap !== undefined && gap < APPLICATION_INTERVAL_DAYS - 1 ? ` Atenção: a anterior foi há só ${gap} dia${gap === 1 ? '' : 's'}.` : ''}`,
      ok: true,
    });
    setEditing(null);
    setForm(blankFor(updated));
  };

  const edit = (a: Application) => {
    setSelected(a.date);
    setMonth(a.date.slice(0, 7));
    setEditing(a.id);
    setForm({ dose: a.dose, time: a.time ?? '', site: a.site, effects: a.sideEffects ?? [], note: a.note ?? '' });
    setMsg(null);
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={s.back}>
        <CaretLeft size={16} weight="bold" color={colors.primary} />
        <Text style={s.backText}>Voltar</Text>
      </Pressable>
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><Syringe size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle="Calendário, registro e histórico das suas aplicações semanais.">Aplicações</Title>
      </View>

      <Card tone="primary">
        <Text style={s.eyebrow}>PRÓXIMA APLICAÇÃO</Text>
        <Text style={[s.heroText, status.late && { color: colors.accent }]}>{status.text}</Text>
        {last && (
          <View style={s.heroStats}>
            <View style={{ flex: 1 }}><Text style={s.heroValue}>{last.dose} mg</Text><Text style={s.heroLabel}>dose atual</Text></View>
            <View style={{ flex: 1 }}><Text style={s.heroValue}>{applications.length}</Text><Text style={s.heroLabel}>aplicações</Text></View>
            <View style={{ flex: 1 }}><Text style={s.heroValue}>{intervals.length ? `${Math.round((onTime / intervals.length) * 100)}%` : '—'}</Text><Text style={s.heroLabel}>no intervalo certo</Text></View>
          </View>
        )}
      </Card>

      <Card>
        <MiniCalendar month={month} onMonth={setMonth} done={done} due={status.next} selected={selected} onSelect={select} />
      </Card>

      <Card>
        <Text style={s.cardTitle}>{editing ? 'Editar aplicação' : selected === today ? 'Registrar aplicação de hoje' : `Aplicação em ${weekday(selected)}, ${fmtDate(selected)}`}</Text>
        {!editing && dayApps.map((a) => (
          <Notice key={a.id}>Já registrada: {a.dose} mg{a.time ? ` às ${a.time}` : ''}{a.site ? ` • ${siteLabels[a.site]}` : ''}</Notice>
        ))}
        {selected > today ? (
          <Text style={s.small}>Datas futuras não podem ser registradas. {status.next === selected ? 'Este é o dia previsto da próxima aplicação.' : ''}</Text>
        ) : (
          <>
            <Text style={s.label}>Dose (mg)</Text>
            <View style={s.chips}>
              {DOSES.map((d) => <Chip key={d} label={`${d} mg`} active={form.dose === d} onPress={() => setForm({ ...form, dose: d })} />)}
            </View>
            <View style={s.twoCols}>
              <View style={{ flex: 1 }}><Field label="Outra dose (mg)" value={DOSES.includes(form.dose) ? '' : form.dose} onChangeText={(t) => setForm({ ...form, dose: t.replace(/[^\d.,]/g, '').slice(0, 5) })} keyboardType="decimal-pad" placeholder="Ex.: 3,75" /></View>
              <View style={{ flex: 1 }}><Field label="Horário (opcional)" value={form.time} onChangeText={(t) => setForm({ ...form, time: maskTime(t) })} keyboardType="number-pad" placeholder="20:30" /></View>
            </View>
            <Text style={s.label}>Local da aplicação</Text>
            <View style={s.chips}>
              {ROTATION.map((site) => (
                <Chip key={site} label={`${siteLabels[site]}${!editing && site === suggestedSite(applications) ? ' • sugerido' : ''}`} active={form.site === site} onPress={() => setForm({ ...form, site })} />
              ))}
            </View>
            <Text style={s.small}>Fazer rodízio do local ajuda a evitar irritação na pele.</Text>
            <Text style={s.label}>Efeitos colaterais</Text>
            <View style={s.chips}>
              {SIDE_EFFECTS.map((e) => <Chip key={e} label={e} active={form.effects.includes(e)} onPress={() => toggleEffect(e)} />)}
            </View>
            <Field label="Observações" value={form.note} onChangeText={(note) => setForm({ ...form, note })} placeholder="Ex.: fome, saciedade, energia..." />
            {msg && <Notice tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Notice>}
            <ActionButton label={editing ? 'Salvar alterações' : 'Registrar aplicação'} onPress={save} />
            {editing && <ActionButton label="Cancelar edição" onPress={() => { setEditing(null); setForm(blank()); }} secondary />}
          </>
        )}
      </Card>

      <SectionLabel>Histórico</SectionLabel>
      <Card>
        {history.length === 0 && <Text style={s.body}>Nenhuma aplicação registrada ainda.</Text>}
        {(showAll ? history : history.slice(0, 8)).map((a) => {
          const idx = applications.findIndex((x) => x.id === a.id);
          const prev = applications[idx - 1];
          const gap = prev ? daysBetween(prev.date, a.date) : undefined;
          const offGap = gap !== undefined && (gap < APPLICATION_INTERVAL_DAYS - 1 || gap > APPLICATION_INTERVAL_DAYS + 1);
          const up = prev && doseNum(a.dose) > doseNum(prev.dose);
          return (
            <View key={a.id} style={s.item}>
              <View style={s.itemHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{a.dose} mg {up && <Text style={s.up}> aumento de dose</Text>}</Text>
                  <Text style={s.small}>{weekday(a.date)}, {fmtDate(a.date)}{a.time ? ` às ${a.time}` : ''}{a.site ? ` • ${siteLabels[a.site]}` : ''}</Text>
                </View>
                <Pressable onPress={() => edit(a)} accessibilityRole="button" accessibilityLabel={`Editar aplicação de ${fmtDate(a.date)}`} hitSlop={6} style={s.iconBtn}>
                  <PencilSimple size={17} color={colors.primaryDark} />
                </Pressable>
                <Pressable
                  onPress={() => (confirmDelete === a.id ? (removeApplication(a.id), setConfirmDelete(null)) : setConfirmDelete(a.id))}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir aplicação de ${fmtDate(a.date)}`}
                  hitSlop={6}
                  style={[s.iconBtn, confirmDelete === a.id && { backgroundColor: colors.dangerBg }]}
                >
                  <Trash size={17} color={confirmDelete === a.id ? colors.danger : colors.muted} />
                </Pressable>
              </View>
              {confirmDelete === a.id && <Text style={s.danger}>Toque na lixeira de novo para excluir.</Text>}
              {gap !== undefined && (
                <View style={s.gapRow}>
                  {offGap ? <Warning size={14} weight="fill" color={colors.warning} /> : <ClockCounterClockwise size={14} color={colors.muted} />}
                  <Text style={[s.small, { marginTop: 0 }, offGap && { color: colors.warning }]}>{gap} dias depois da anterior</Text>
                </View>
              )}
              {!!a.sideEffects?.length && <Text style={s.effects}>{a.sideEffects.join(' • ')}</Text>}
              {!!a.note && <Text style={s.small}>“{a.note}”</Text>}
            </View>
          );
        })}
        {history.length > 8 && <ActionButton label={showAll ? 'Mostrar menos' : `Ver todas (${history.length})`} onPress={() => setShowAll(!showAll)} secondary />}
      </Card>
      <Text style={s.disclaimer}>Siga sempre a dose e o esquema prescritos pelo seu médico. Em caso de efeitos intensos, procure atendimento.</Text>
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md, minHeight: 44 },
  backText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  eyebrow: { color: colors.blush, fontFamily: fonts.bodyBold, fontSize: type.caption, letterSpacing: 1 },
  heroText: { color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: type.heading, marginTop: spacing.sm, lineHeight: 26 },
  heroStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  heroValue: { color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: type.title },
  heroLabel: { color: colors.blush, fontFamily: fonts.body, fontSize: type.caption },
  cardTitle: { fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  body: { color: colors.textSecondary, lineHeight: 21, fontFamily: fonts.body, fontSize: type.body },
  small: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.small, marginTop: spacing.xs, lineHeight: 17 },
  label: { fontSize: type.small, color: colors.textSecondary, fontFamily: fonts.bodyBold, marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  twoCols: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  calNav: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontFamily: fonts.headingBold, fontSize: type.title, color: colors.primaryDark },
  calRow: { flexDirection: 'row' },
  calWeek: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: type.caption, color: colors.muted, paddingVertical: spacing.xs },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, maxHeight: 48, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDone: { backgroundColor: colors.primary },
  calDue: { borderWidth: 2, borderColor: colors.accentDark, borderStyle: 'dashed' },
  calSel: { borderWidth: 2, borderColor: colors.text, borderStyle: 'solid' },
  calNum: { fontFamily: fonts.bodyMedium, fontSize: type.body, color: colors.text },
  calToday: { fontFamily: fonts.bodyBold, color: colors.primary, textDecorationLine: 'underline' },
  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontFamily: fonts.body, fontSize: type.small, color: colors.textSecondary },
  item: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: type.bodyLg, color: colors.text },
  up: { fontFamily: fonts.bodySemiBold, fontSize: type.small, color: colors.accentDark },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  effects: { fontFamily: fonts.bodySemiBold, fontSize: type.small, color: colors.primaryDark, marginTop: spacing.xs },
  danger: { color: colors.danger, fontFamily: fonts.bodySemiBold, fontSize: type.small, marginTop: spacing.xs },
  disclaimer: { fontSize: type.caption, color: colors.muted, lineHeight: 16, textAlign: 'center', marginVertical: spacing.md, fontFamily: fonts.body },
}));
