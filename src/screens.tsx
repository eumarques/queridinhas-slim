import {
  BookOpen,
  CaretLeft,
  CaretRight,
  Camera,
  ChartBar,
  CheckCircle,
  Crown,
  Drop,
  Flame,
  ForkKnife,
  Heart,
  Lightbulb,
  NotePencil,
  PersonSimpleWalk,
  Question,
  Scales,
  Smiley,
  SmileyMeh,
  SmileySad,
  Sparkle,
  Syringe,
  Target,
  Trash,
  X,
  TrendDown,
  TrendUp,
} from 'phosphor-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, BarChart, Card, Chip, Field, IconBadge, LineChart, Metric, Notice, ProgressBar, SectionLabel, Stepper, Title } from './components';
import {
  addDays,
  dateKey,
  DayLog,
  dayProgress,
  fmtDate,
  fmtLiters,
  fmtNum,
  fmtShort,
  fromKey,
  GLASS_ML,
  goals,
  Intensity,
  Mood,
  parseDateBR,
  parseNum,
  useStore,
  walkKcal,
  weekday,
  weightOn,
} from './store';
import { buildWeekMenu, slotsFor } from './menu';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

const Screen = ({ children }: { children: React.ReactNode }) => {
  const s = useStyles();
  return <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>;
};
const Row = ({ children }: { children: React.ReactNode }) => <View style={useStyles().row}>{children}</View>;
const Bullet = ({ children }: { children: React.ReactNode }) => {
  const s = useStyles();
  const colors = useColors();
  return (
    <View style={s.bulletRow}>
      <CheckCircle size={18} weight="fill" color={colors.success} />
      <Text style={s.bullet}>{children}</Text>
    </View>
  );
};
const HeadingIcon = ({ icon }: { icon: React.ReactNode }) => <View style={{ marginTop: 3 }}>{icon}</View>;

const kgDiff = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmtNum(Math.abs(d))} kg`;
const moods: { id: Mood; label: string; Icon: typeof Smiley }[] = [
  { id: 'bem', label: 'Bem', Icon: Smiley },
  { id: 'regular', label: 'Mais ou menos', Icon: SmileyMeh },
  { id: 'enjoo', label: 'Com enjoo', Icon: SmileySad },
];
const intensities: { id: Intensity; label: string; hint: string }[] = [
  { id: 'leve', label: 'Leve', hint: 'Passo tranquilo, dá para conversar e cantar.' },
  { id: 'moderada', label: 'Moderada', hint: 'Passo acelerado, respiração mais rápida, dá para conversar.' },
];
const weekStart = (k: string) => addDays(k, -((fromKey(k).getDay() + 6) % 7));

// ---------------------------------------------------------------------------
// Início — Feedback diário
// ---------------------------------------------------------------------------

export function HomeScreen({ goPremium, goDay, goMenu, goWeekly }: { goPremium: () => void; goDay: () => void; goMenu: () => void; goWeekly: () => void }) {
  const { profile, getDay, weights, currentWeight, initialWeight, applications, mealsPerDay, foodPrefs, hasFoodPrefs, targets } = useStore();
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const kg = currentWeight ?? 70;
  const log = getDay(today);
  const p = dayProgress(log, kg, mealsPerDay);

  const headline =
    p.pct === 0 ? 'Vamos começar o dia?' : p.pct < 50 ? 'Bom começo!' : p.pct < 100 ? 'Você está quase lá!' : 'Dia completo, parabéns!';
  const tips: string[] = [];
  if (p.parts.water < 1) {
    const left = p.goalMl - p.waterMl;
    tips.push(`Beba mais ${Math.ceil(left / GLASS_ML)} copos (${fmtLiters(left)}) para bater a meta de água.`);
  }
  if (p.mealsDone < p.mealsTotal) tips.push(`Registre ${p.mealsTotal - p.mealsDone === 1 ? 'mais 1 refeição' : `mais ${p.mealsTotal - p.mealsDone} refeições`}.`);
  if (!log.walk.done) tips.push('Faça o check-in da sua caminhada.');
  else if (log.walk.minutes < goals.walkMinutes) tips.push(`Faltam ${goals.walkMinutes - log.walk.minutes} min para a meta de caminhada.`);
  if (!log.checkin) tips.push('Responda o check-in diário (3 perguntas rápidas).');

  const pillars = [
    { Icon: Drop, tint: colors.info, label: 'Água', value: `${fmtLiters(p.waterMl)} de ${fmtLiters(p.goalMl)}`, pct: p.parts.water },
    { Icon: ForkKnife, tint: colors.accentDark, label: 'Alimentação', value: `${p.mealsDone} de ${p.mealsTotal} refeições`, pct: p.parts.food },
    {
      Icon: PersonSimpleWalk,
      tint: colors.success,
      label: 'Caminhada',
      value: log.walk.done ? `${log.walk.minutes} min • ${walkKcal(kg, log.walk.minutes, log.walk.intensity)} kcal` : 'Check-in pendente',
      pct: p.parts.walk,
    },
    {
      Icon: CheckCircle,
      tint: colors.primaryDark,
      label: 'Check-in diário',
      value: log.checkin ? `${[log.checkin.walk, log.checkin.diet, log.checkin.water].filter(Boolean).length} de 3 metas cumpridas` : 'Pendente',
      pct: p.parts.checkin,
    },
  ];

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((k) => ({ k, pct: dayProgress(getDay(k), weightOn(weights, k), mealsPerDay).pct }));
  const diff = currentWeight !== undefined && initialWeight !== undefined ? currentWeight - initialWeight : 0;
  const goal = profile?.goalWeight;
  const goalPct = goal && initialWeight && initialWeight !== goal ? Math.max(0, Math.min(1, (initialWeight - (currentWeight ?? initialWeight)) / (initialWeight - goal))) : undefined;
  const todayMenu = targets ? buildWeekMenu(foodPrefs, targets)[(fromKey(today).getDay() + 6) % 7] : undefined;
  const lastApp = applications[applications.length - 1];
  const nextApp = lastApp ? addDays(lastApp.date, 7) : undefined;
  const daysToApp = nextApp ? Math.round((fromKey(nextApp).getTime() - fromKey(today).getTime()) / 86400000) : undefined;

  return (
    <Screen>
      <View style={s.greetingRow}>
        <Title subtitle={`${weekday(today)}, ${fmtDate(today)} • seu feedback diário`}>Olá, {profile?.name.split(' ')[0]}!</Title>
        <Sparkle size={22} weight="fill" color={colors.accentDark} style={{ marginTop: 2 }} />
      </View>

      <Card tone="primary">
        <Text style={s.eyebrow}>PROGRESSO DE HOJE</Text>
        <View style={s.heroRow}>
          <Text style={s.heroPct}>{p.pct}%</Text>
          <Text style={s.heroTitle}>{headline}</Text>
        </View>
        <ProgressBar value={p.pct / 100} color={colors.accent} track="rgba(255,255,255,0.18)" height={10} />
        {tips.length > 0 ? (
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
            {tips.slice(0, 3).map((t) => (
              <View key={t} style={s.tipRow}>
                <Lightbulb size={15} weight="fill" color={colors.accent} />
                <Text style={s.heroText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[s.heroText, { marginTop: spacing.md }]}>Você cumpriu todas as metas de hoje. Cuidar de si é constância.</Text>
        )}
        <ActionButton label={p.pct === 0 ? 'Preencher meu dia' : 'Continuar meu dia'} onPress={goDay} secondary />
      </Card>

      <SectionLabel>Resumo do dia</SectionLabel>
      <Card>
        {pillars.map(({ Icon, tint, label, value, pct }, i) => (
          <Pressable key={label} onPress={goDay} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={[s.pillar, i > 0 && s.pillarBorder]}>
            <Icon size={22} weight="fill" color={tint} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={s.pillarHead}>
                <Text style={s.pillarLabel}>{label}</Text>
                <Text style={s.pillarValue}>{value}</Text>
              </View>
              <ProgressBar value={pct} color={pct >= 1 ? colors.success : tint} height={6} />
            </View>
          </Pressable>
        ))}
      </Card>

      <SectionLabel>Últimos 7 dias</SectionLabel>
      <Card>
        <View style={s.weekRow}>
          {week.map(({ k, pct }) => (
            <View key={k} style={s.weekDay} accessibilityLabel={`${weekday(k)}: ${pct}%`}>
              <View style={[s.weekDot, pct >= 100 ? s.weekDotFull : pct > 0 ? s.weekDotPart : null, k === today && s.weekDotToday]}>
                <Text style={[s.weekPct, pct >= 100 && { color: colors.onPrimary }]}>{pct}</Text>
              </View>
              <Text style={[s.weekLabel, k === today && { color: colors.primaryDark, fontFamily: fonts.bodyBold }]}>{k === today ? 'Hoje' : weekday(k)}</Text>
            </View>
          ))}
        </View>
        <Text style={s.caption}>% das metas diárias cumpridas</Text>
      </Card>

      <Card>
        <View style={s.cardHeadRow}>
          <IconBadge icon={diff <= 0 ? <TrendDown size={18} weight="fill" color={colors.success} /> : <TrendUp size={18} weight="fill" color={colors.warning} />} tone={diff <= 0 ? 'success' : 'warning'} />
          <Text style={s.cardTitle}>Sua evolução</Text>
        </View>
        <Text style={s.big}>{kgDiff(diff)}</Text>
        <Text style={s.body}>
          Desde o início ({fmtNum(initialWeight ?? kg)} kg → {fmtNum(kg)} kg).
          {goalPct !== undefined ? ` Você já percorreu ${Math.round(goalPct * 100)}% da sua meta de ${fmtNum(goal!)} kg.` : ''}
        </Text>
        {goalPct !== undefined && <View style={{ marginTop: spacing.sm }}><ProgressBar value={goalPct} color={colors.success} /></View>}
      </Card>

      <Card>
        <View style={s.cardHeadRow}><IconBadge icon={<ForkKnife size={18} weight="fill" color={colors.accentDark} />} /><Text style={s.cardTitle}>Cardápio de hoje</Text></View>
        {todayMenu ? (
          <>
            {todayMenu.meals.map((m) => (
              <Text key={m.slot} style={s.menuLine} numberOfLines={2}><Text style={s.menuSlot}>{m.label}: </Text>{m.dish?.name ?? '—'}</Text>
            ))}
            <Text style={s.small}>≈ {todayMenu.kcal} kcal • {todayMenu.protein} g de proteína (meta {targets!.kcal} kcal • {targets!.protein} g)</Text>
          </>
        ) : null}
        {!hasFoodPrefs && <Text style={s.small}>Personalize com suas preferências alimentares para um cardápio do seu jeito.</Text>}
        <ActionButton label="Ver cardápio da semana" onPress={goMenu} secondary />
      </Card>

      <Card>
        <View style={s.cardHeadRow}><IconBadge tone="success" icon={<ChartBar size={18} weight="fill" color={colors.success} />} /><Text style={s.cardTitle}>Resultado semanal</Text></View>
        <Text style={s.body}>Veja o resumo da sua semana e compartilhe suas conquistas.</Text>
        <ActionButton label="Ver meu resultado" onPress={goWeekly} secondary />
      </Card>

      <Card>
        <View style={s.cardHeadRow}><IconBadge icon={<Syringe size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.cardTitle}>Aplicação</Text></View>
        {lastApp ? (
          <Text style={s.body}>
            Última: {fmtDate(lastApp.date)} • {lastApp.dose} mg.{'\n'}
            {daysToApp! > 0 ? `Próxima em ${daysToApp} dia${daysToApp === 1 ? '' : 's'} (${fmtDate(nextApp!)}).` : daysToApp === 0 ? 'A próxima é hoje.' : `A próxima estava prevista para ${fmtDate(nextApp!)}.`}
          </Text>
        ) : (
          <Text style={s.body}>Nenhuma aplicação registrada. Registre no Meu Dia para acompanhar as próximas.</Text>
        )}
      </Card>

      <Card style={s.premiumCard}>
        <View style={s.cardHeadRow}><IconBadge icon={<Crown size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.premiumTitle}>Queridinhas Premium</Text></View>
        <Text style={s.body}>Cardápio personalizado, relatórios, fotos e lembretes avançados.</Text>
        <ActionButton label="Conhecer o Premium" onPress={goPremium} />
      </Card>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Meu Dia — diário unificado (água, alimentação, caminhada, peso, humor, aplicação)
// ---------------------------------------------------------------------------

export function DayScreen({ goProgress, goMenu }: { goProgress: () => void; goMenu: () => void }) {
  const today = dateKey();
  const [date, setDate] = useState(today);
  const colors = useColors();
  const s = useStyles();
  return (
    <Screen>
      <View style={s.titleRow}><HeadingIcon icon={<NotePencil size={22} weight="bold" color={colors.primaryDark} />} /><Title subtitle="Registre tudo do seu dia em um só lugar.">Meu Dia</Title></View>
      <View style={s.dateNav}>
        <Pressable onPress={() => setDate(addDays(date, -1))} accessibilityRole="button" accessibilityLabel="Dia anterior" hitSlop={8} style={s.dateBtn}>
          <CaretLeft size={18} weight="bold" color={colors.primaryDark} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.dateTitle}>{date === today ? 'Hoje' : date === addDays(today, -1) ? 'Ontem' : weekday(date)}</Text>
          <Text style={s.dateSub}>{fmtDate(date)}</Text>
        </View>
        <Pressable onPress={() => date < today && setDate(addDays(date, 1))} disabled={date >= today} accessibilityRole="button" accessibilityLabel="Próximo dia" hitSlop={8} style={[s.dateBtn, date >= today && { opacity: 0.3 }]}>
          <CaretRight size={18} weight="bold" color={colors.primaryDark} />
        </Pressable>
      </View>
      {/* key: reinicia os campos de texto ao trocar de dia */}
      <DayForm key={date} date={date} goProgress={goProgress} goMenu={goMenu} />
    </Screen>
  );
}

function DayForm({ date, goProgress, goMenu }: { date: string; goProgress: () => void; goMenu: () => void }) {
  const { getDay, updateDay, weights, applications, addApplication, mealsPerDay, targets } = useStore();
  const colors = useColors();
  const s = useStyles();
  const log = getDay(date);
  const kg = weightOn(weights, date);
  const p = dayProgress(log, kg, mealsPerDay);
  const slots = slotsFor(mealsPerDay);
  const upd = (patch: Partial<DayLog>) => updateDay(date, patch);

  const [protein, setProtein] = useState(log.protein ? String(log.protein) : '');
  const [fiber, setFiber] = useState(log.fiber ? String(log.fiber) : '');
  const [dose, setDose] = useState(applications[applications.length - 1]?.dose ?? '2,5');
  const [appNote, setAppNote] = useState('');
  const [appSaved, setAppSaved] = useState(false);

  const numField = (setter: (v: string) => void, key: 'protein' | 'fiber') => (t: string) => {
    const clean = t.replace(/\D/g, '').slice(0, 3);
    setter(clean);
    upd({ [key]: clean ? Number(clean) : 0 });
  };
  const walk = log.walk;
  // a resposta de caminhada do check-in e o card de caminhada são o mesmo registro
  const setWalk = (patch: Partial<DayLog['walk']>) =>
    upd({ walk: { ...walk, ...patch }, ...(log.checkin && patch.done !== undefined ? { checkin: { ...log.checkin, walk: patch.done } } : {}) });
  const kcal = walkKcal(kg, walk.minutes, walk.intensity);
  const dayApps = applications.filter((a) => a.date === date);

  return (
    <>
      <CheckinCard date={date} log={log} pct={p.pct} waterHit={p.waterMl >= p.goalMl} mealsDone={p.mealsDone} mealsTotal={p.mealsTotal} />

      {/* Hidratação */}
      <Card>
        <View style={s.cardHeadRow}><IconBadge tone="info" icon={<Drop size={18} weight="fill" color={colors.info} />} /><Text style={s.cardTitle}>Hidratação</Text></View>
        <View style={s.stepRow}>
          <Stepper label="copos de água" value={String(log.glasses)} onMinus={() => upd({ glasses: Math.max(0, log.glasses - 1) })} onPlus={() => upd({ glasses: log.glasses + 1 })} />
          <View style={{ flex: 1 }}>
            <Text style={s.bigInline}>{fmtLiters(p.waterMl)}</Text>
            <Text style={s.small}>copos de {GLASS_ML} ml</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.md }}><ProgressBar value={p.waterMl / p.goalMl} color={p.waterMl >= p.goalMl ? colors.success : colors.info} /></View>
        <Text style={s.small}>
          {Math.round((p.waterMl / p.goalMl) * 100)}% da meta de {fmtLiters(p.goalMl)} (1 L a cada 20 kg • {fmtNum(kg)} kg)
          {p.waterMl < p.goalMl ? ` • faltam ${Math.ceil((p.goalMl - p.waterMl) / GLASS_ML)} copos` : ' • meta batida!'}
        </Text>
      </Card>

      {/* Alimentação */}
      <Card>
        <View style={s.cardHeadRow}><IconBadge icon={<ForkKnife size={18} weight="fill" color={colors.accentDark} />} /><Text style={s.cardTitle}>Alimentação</Text></View>
        <Text style={s.label}>Refeições feitas</Text>
        <View style={s.chips}>
          {slots.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              active={!!log.meals[m.id]}
              icon={log.meals[m.id] ? (c) => <CheckCircle size={15} weight="fill" color={c} /> : undefined}
              onPress={() => upd({ meals: { ...log.meals, [m.id]: !log.meals[m.id] } })}
            />
          ))}
        </View>
        <View style={s.twoCols}>
          <View style={{ flex: 1 }}><Field label={`Proteína (g) • meta ${targets?.protein ?? '—'}`} value={protein} onChangeText={numField(setProtein, 'protein')} keyboardType="number-pad" placeholder="0" /></View>
          <View style={{ flex: 1 }}><Field label={`Fibras (g) • meta ${goals.fiber}`} value={fiber} onChangeText={numField(setFiber, 'fiber')} keyboardType="number-pad" placeholder="0" /></View>
        </View>
        <ActionButton label="Ver meu plano alimentar" onPress={goMenu} secondary />
      </Card>

      {/* Caminhada */}
      <Card>
        <View style={s.cardHeadRow}><IconBadge tone="success" icon={<PersonSimpleWalk size={18} weight="fill" color={colors.success} />} /><Text style={s.cardTitle}>Caminhada</Text></View>
        <Text style={s.label}>Você fez sua caminhada{date === dateKey() ? ' hoje' : ' neste dia'}?</Text>
        <View style={s.chips}>
          <Chip label="Sim, caminhei" active={walk.done} onPress={() => setWalk({ done: true, minutes: walk.minutes || goals.walkMinutes })} />
          <Chip label="Ainda não" active={!walk.done} onPress={() => setWalk({ done: false })} />
        </View>
        {walk.done && (
          <>
            <Text style={s.label}>Intensidade</Text>
            <View style={s.chips}>
              {intensities.map((i) => <Chip key={i.id} label={i.label} active={walk.intensity === i.id} onPress={() => setWalk({ intensity: i.id })} />)}
            </View>
            <Text style={s.small}>{intensities.find((i) => i.id === walk.intensity)!.hint}</Text>
            <Text style={s.label}>Duração</Text>
            <View style={s.stepRow}>
              <Stepper label="minutos de caminhada" value={`${walk.minutes} min`} onMinus={() => setWalk({ minutes: Math.max(5, walk.minutes - 5) })} onPlus={() => setWalk({ minutes: Math.min(300, walk.minutes + 5) })} />
            </View>
            <View style={[s.chips, { marginTop: spacing.md }]}>
              {[15, 30, 45, 60].map((m) => <Chip key={m} label={`${m} min`} active={walk.minutes === m} onPress={() => setWalk({ minutes: m })} />)}
            </View>
            <View style={s.kcalBox}>
              <Flame size={22} weight="fill" color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={s.kcal}>≈ {kcal} kcal</Text>
                <Text style={s.small}>Estimativa: {walk.intensity} ({fmtNum(walk.intensity === 'leve' ? 2.8 : 3.5)} MET) × {fmtNum(kg)} kg × {walk.minutes} min</Text>
              </View>
            </View>
          </>
        )}
      </Card>

      {/* Evolução diária */}
      <Card>
        <View style={s.cardHeadRow}><IconBadge icon={<Scales size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.cardTitle}>Peso</Text></View>
        <WeightForm defaultDate={date} />
        <ActionButton label="Ver histórico e gráfico" onPress={goProgress} secondary />
      </Card>

      <Card>
        <View style={s.cardHeadRow}><IconBadge icon={<Heart size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.cardTitle}>Como estou me sentindo?</Text></View>
        <View style={s.chips}>
          {moods.map(({ id, label, Icon }) => (
            <Chip key={id} label={label} active={log.mood === id} onPress={() => upd({ mood: id })} icon={(c) => <Icon size={16} weight={log.mood === id ? 'fill' : 'regular'} color={c} />} />
          ))}
        </View>
        <Field
          label="Observações do dia"
          value={log.note}
          onChangeText={(note) => upd({ note })}
          placeholder="Ex.: fome, saciedade, energia, sono..."
          multiline
          style={s.textArea}
        />
      </Card>

      {/* Aplicação (antigo Diário) */}
      <Card>
        <View style={s.cardHeadRow}><IconBadge icon={<Syringe size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.cardTitle}>Aplicação</Text></View>
        {dayApps.map((a) => <Notice key={a.id}>Aplicação de {a.dose} mg registrada neste dia{a.note ? ` • ${a.note}` : ''}.</Notice>)}
        <Field label="Dose (mg)" value={dose} onChangeText={(t) => setDose(t.replace(/[^\d.,]/g, '').slice(0, 5))} keyboardType="decimal-pad" />
        <Field label="Observações" value={appNote} onChangeText={setAppNote} placeholder="Ex.: local, náusea, saciedade..." />
        {appSaved && <Notice>Aplicação registrada em {fmtDate(date)}.</Notice>}
        <ActionButton label="Registrar aplicação" disabled={!(parseNum(dose) > 0)} onPress={() => { addApplication(date, dose, appNote.trim()); setAppNote(''); setAppSaved(true); }} />
        {applications.length > 0 && (
          <>
            <Text style={s.label}>Histórico</Text>
            {[...applications].reverse().slice(0, 5).map((a) => (
              <Text key={a.id} style={s.history}>{fmtDate(a.date)} • {a.dose} mg{a.note ? ` • ${a.note}` : ''}</Text>
            ))}
          </>
        )}
      </Card>

    </>
  );
}

/** Check-in diário: três perguntas principais + resumo visual do dia. */
function CheckinCard({ date, log, pct, waterHit, mealsDone, mealsTotal }: { date: string; log: DayLog; pct: number; waterHit: boolean; mealsDone: number; mealsTotal: number }) {
  const { updateDay } = useStore();
  const colors = useColors();
  const s = useStyles();
  type Answers = { walk?: boolean; diet?: boolean; water?: boolean };
  const [editing, setEditing] = useState(!log.checkin);
  const [answers, setAnswers] = useState<Answers>(log.checkin ?? {});
  const [error, setError] = useState(false);
  const isToday = date === dateKey();
  const questions: { id: keyof Answers; label: string; Icon: typeof Drop; q: string; hint: string }[] = [
    { id: 'walk', label: 'Caminhada', Icon: PersonSimpleWalk, q: `Você realizou sua caminhada ${isToday ? 'hoje' : 'neste dia'}?`, hint: log.walk.done ? `Registrado: ${log.walk.minutes} min` : 'Nenhuma caminhada registrada' },
    { id: 'diet', label: 'Alimentação', Icon: ForkKnife, q: `Você seguiu corretamente seu plano alimentar ${isToday ? 'hoje' : 'neste dia'}?`, hint: `Refeições marcadas: ${mealsDone} de ${mealsTotal}` },
    { id: 'water', label: 'Água', Icon: Drop, q: 'Você atingiu sua meta diária de água?', hint: waterHit ? 'Pelos registros, a meta foi atingida' : 'Pelos registros, a meta ainda não foi atingida' },
  ];

  const save = () => {
    if (answers.walk === undefined || answers.diet === undefined || answers.water === undefined) return setError(true);
    setError(false);
    updateDay(date, (d) => ({
      done: true,
      checkin: { walk: answers.walk!, diet: answers.diet!, water: answers.water!, savedAt: new Date().toISOString() },
      walk: { ...d.walk, done: answers.walk!, minutes: answers.walk && !d.walk.minutes ? goals.walkMinutes : d.walk.minutes },
    }));
    setEditing(false);
  };

  const saved = log.checkin;
  const yes = saved ? [saved.walk, saved.diet, saved.water].filter(Boolean).length : 0;

  return (
    <Card>
      <View style={s.pillarHead}>
        <Text style={s.cardTitle}>Check-in diário</Text>
        <Text style={s.pctBadge}>{pct}%</Text>
      </View>
      <View style={{ marginTop: spacing.sm }}><ProgressBar value={pct / 100} /></View>
      <Text style={s.small}>Progresso do dia (água, refeições, caminhada e check-in)</Text>

      {saved && !editing ? (
        <>
          <View style={s.checkSummary}>
            {questions.map(({ id, label, Icon }) => {
              const ok = saved[id];
              return (
                <View key={id} style={s.checkItem} accessibilityLabel={`${label}: ${ok ? 'sim' : 'não'}`}>
                  <View style={[s.checkCircle, { backgroundColor: ok ? colors.success : colors.divider }]}>
                    <Icon size={22} weight="fill" color={ok ? colors.onPrimary : colors.muted} />
                  </View>
                  <Text style={s.checkLabel}>{label}</Text>
                  {ok ? <CheckCircle size={16} weight="fill" color={colors.success} /> : <X size={16} weight="bold" color={colors.muted} />}
                </View>
              );
            })}
          </View>
          <Text style={[s.body, { textAlign: 'center' }]}>
            {yes === 3 ? 'Três de três! Dia de muito cuidado com você.' : yes === 2 ? 'Muito bem! Duas metas cumpridas.' : yes === 1 ? 'Uma meta cumprida. Amanhã é uma nova chance.' : 'Tudo bem, o importante é seguir. Amanhã é um novo dia.'}
          </Text>
          <Notice>Check-in salvo em {fmtDate(date)}.</Notice>
          <ActionButton label="Editar respostas" onPress={() => { setAnswers(saved); setEditing(true); }} secondary />
        </>
      ) : (
        <>
          {questions.map(({ id, Icon, q, hint }) => (
            <View key={id} style={s.question}>
              <View style={s.questionHead}>
                <Icon size={18} weight="fill" color={colors.primaryDark} />
                <Text style={s.questionText}>{q}</Text>
              </View>
              <Text style={s.small}>{hint}</Text>
              <View style={[s.chips, { marginTop: spacing.sm }]}>
                <Chip label="Sim" active={answers[id] === true} onPress={() => setAnswers({ ...answers, [id]: true })} />
                <Chip label="Não" active={answers[id] === false} onPress={() => setAnswers({ ...answers, [id]: false })} />
              </View>
            </View>
          ))}
          {error && <Notice tone="danger">Responda as três perguntas para salvar.</Notice>}
          <ActionButton label="Salvar check-in" onPress={save} />
        </>
      )}
    </Card>
  );
}

/** Registro de nova medição de peso com data (Meu Dia e Progresso). */
function WeightForm({ defaultDate }: { defaultDate: string }) {
  const { addWeight, weights, currentWeight, initialWeight } = useStore();
  const s = useStyles();
  const [date, setDate] = useState(fmtDate(defaultDate));
  const [kg, setKg] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const maskDate = (t: string) => {
    const d = t.replace(/\D/g, '').slice(0, 8);
    return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
  };
  const save = () => {
    const k = parseDateBR(date);
    const v = parseNum(kg);
    if (!k || k > dateKey()) return setMsg({ text: 'Informe uma data válida (dd/mm/aaaa), sem datas futuras.', ok: false });
    if (!(v >= 30 && v <= 350)) return setMsg({ text: 'Informe um peso entre 30 e 350 kg.', ok: false });
    const replaced = weights.some((w) => w.date === k);
    addWeight(k, Math.round(v * 10) / 10);
    setKg('');
    setMsg({ text: `${replaced ? 'Medição atualizada' : 'Medição registrada'}: ${fmtNum(v)} kg em ${fmtDate(k)}.`, ok: true });
  };

  return (
    <>
      {currentWeight !== undefined && initialWeight !== undefined && (
        <View style={s.weightSummary}>
          <View style={{ flex: 1 }}><Text style={s.small}>Atual</Text><Text style={s.bigInline}>{fmtNum(currentWeight)} kg</Text></View>
          <View style={{ flex: 1 }}><Text style={s.small}>Inicial</Text><Text style={s.bigInline}>{fmtNum(initialWeight)} kg</Text></View>
          <View style={{ flex: 1 }}><Text style={s.small}>Diferença</Text><Text style={[s.bigInline, currentWeight <= initialWeight ? s.good : s.warn]}>{kgDiff(currentWeight - initialWeight)}</Text></View>
        </View>
      )}
      <View style={s.twoCols}>
        <View style={{ flex: 1 }}><Field label="Data" value={date} onChangeText={(t) => setDate(maskDate(t))} keyboardType="number-pad" placeholder="dd/mm/aaaa" /></View>
        <View style={{ flex: 1 }}><Field label="Peso (kg)" value={kg} onChangeText={(t) => setKg(t.replace(/[^\d.,]/g, '').slice(0, 5))} keyboardType="decimal-pad" placeholder="Ex.: 78,4" /></View>
      </View>
      {msg && <Notice tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Notice>}
      <ActionButton label="Registrar peso" onPress={save} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Progresso — peso e caminhadas
// ---------------------------------------------------------------------------

export function ProgressScreen({ goPremium, goWeekly }: { goPremium: () => void; goWeekly: () => void }) {
  const [view, setView] = useState<'peso' | 'caminhada' | 'checkins'>('peso');
  const colors = useColors();
  const s = useStyles();
  return (
    <Screen>
      <View style={s.titleRow}><HeadingIcon icon={<ChartBar size={22} weight="bold" color={colors.primaryDark} />} /><Title subtitle="Olhe o caminho percorrido, não apenas o destino.">Progresso</Title></View>
      <View style={s.segment}>
        {(['peso', 'caminhada', 'checkins'] as const).map((v) => (
          <Pressable key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: view === v }} style={[s.segBtn, view === v && s.segBtnOn]}>
            <Text style={[s.segText, view === v && s.segTextOn]}>{v === 'peso' ? 'Peso' : v === 'caminhada' ? 'Caminhada' : 'Check-ins'}</Text>
          </Pressable>
        ))}
      </View>
      <ActionButton label="Ver resultado semanal e compartilhar" onPress={goWeekly} secondary />
      <View style={{ height: spacing.lg }} />
      {view === 'peso' ? <WeightProgress goPremium={goPremium} /> : view === 'caminhada' ? <WalkProgress /> : <CheckinHistory />}
    </Screen>
  );
}

function WeightProgress({ goPremium }: { goPremium: () => void }) {
  const { weights, currentWeight, initialWeight, profile, removeWeight } = useStore();
  const [all, setAll] = useState(false);
  const colors = useColors();
  const s = useStyles();
  const recent = weights.slice(-12);
  const diff = (currentWeight ?? 0) - (initialWeight ?? 0);
  const history = [...weights].reverse();

  return (
    <>
      <Row>
        <Metric icon={<Scales size={20} weight="fill" color={colors.primaryDark} />} value={`${fmtNum(currentWeight ?? 0)} kg`} label="Peso atual" />
        <Metric icon={<Target size={20} weight="fill" color={colors.accentDark} />} value={profile?.goalWeight ? `${fmtNum(profile.goalWeight)} kg` : '—'} label="Meta" />
        <Metric icon={diff <= 0 ? <TrendDown size={20} weight="fill" color={colors.success} /> : <TrendUp size={20} weight="fill" color={colors.warning} />} value={kgDiff(diff)} label={`Desde ${fmtNum(initialWeight ?? 0)} kg`} />
      </Row>
      <Card>
        <Text style={s.cardTitle}>Evolução do peso</Text>
        {recent.length >= 2 ? (
          <>
            <LineChart points={recent.map((w) => w.kg)} labels={recent.map((w) => fmtShort(w.date))} format={(n) => fmtNum(n)} />
            <Text style={s.caption}>{recent.length < weights.length ? `Últimas ${recent.length} medições` : 'Todas as medições'}</Text>
          </>
        ) : (
          <Text style={[s.body, { marginTop: spacing.sm }]}>Registre pelo menos duas medições para ver o gráfico da sua evolução.</Text>
        )}
      </Card>
      <Card>
        <Text style={s.cardTitle}>Nova medição</Text>
        <View style={{ height: spacing.md }} />
        <WeightForm defaultDate={dateKey()} />
      </Card>
      <SectionLabel>Histórico de peso</SectionLabel>
      <Card>
        {(all ? history : history.slice(0, 8)).map((w) => {
          const idx = weights.findIndex((x) => x.id === w.id);
          const prev = weights[idx - 1];
          return (
            <View key={w.id} style={s.histRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.histMain}>{fmtNum(w.kg)} kg</Text>
                <Text style={s.small}>{weekday(w.date)}, {fmtDate(w.date)}{idx === 0 ? ' • inicial' : ''}</Text>
              </View>
              {prev && <Text style={[s.histDelta, w.kg <= prev.kg ? s.good : s.warn]}>{kgDiff(w.kg - prev.kg)}</Text>}
              {weights.length > 1 && (
                <Pressable onPress={() => removeWeight(w.id)} accessibilityRole="button" accessibilityLabel={`Excluir medição de ${fmtDate(w.date)}`} hitSlop={8} style={s.iconBtn}>
                  <Trash size={17} color={colors.muted} />
                </Pressable>
              )}
            </View>
          );
        })}
        {history.length > 8 && <ActionButton label={all ? 'Mostrar menos' : `Ver todos (${history.length})`} onPress={() => setAll(!all)} secondary />}
      </Card>
      <Card>
        <View style={s.cardHeadRow}><IconBadge icon={<Camera size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.cardTitle}>Fotos e medidas</Text></View>
        <Text style={s.body}>Compare o início com o momento atual e acompanhe cintura, quadril e outras medidas.</Text>
        <ActionButton label="Desbloquear comparativo" icon={<Crown size={16} weight="fill" color={colors.onPrimary} />} onPress={goPremium} />
      </Card>
    </>
  );
}

function WalkProgress() {
  const { logs, weights } = useStore();
  const [all, setAll] = useState(false);
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();

  const walks = Object.entries(logs)
    .filter(([, l]) => l.walk?.done && l.walk.minutes > 0)
    .map(([date, l]) => ({ date, ...l.walk, kcal: walkKcal(weightOn(weights, date), l.walk.minutes, l.walk.intensity) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const byDate = Object.fromEntries(walks.map((w) => [w.date, w]));

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const thisWeek = weekStart(today);
  const weeks = Array.from({ length: 6 }, (_, i) => addDays(thisWeek, (i - 5) * 7)).map((start) => {
    const days = walks.filter((w) => w.date >= start && w.date < addDays(start, 7));
    return { start, minutes: days.reduce((a, w) => a + w.minutes, 0), kcal: days.reduce((a, w) => a + w.kcal, 0), count: days.length };
  });
  const cur = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  // compara com a semana passada até o mesmo dia da semana, para não penalizar a semana em andamento
  const prevSoFar = walks.filter((w) => w.date >= prev.start && w.date <= addDays(today, -7)).reduce((a, w) => a + w.minutes, 0);
  const delta = cur.minutes - prevSoFar;

  return (
    <>
      <Row>
        <Metric icon={<PersonSimpleWalk size={20} weight="fill" color={colors.success} />} value={`${cur.count} dia${cur.count === 1 ? '' : 's'}`} label="Nesta semana" />
        <Metric icon={<ChartBar size={20} weight="fill" color={colors.primaryDark} />} value={`${cur.minutes} min`} label="Tempo na semana" />
        <Metric icon={<Flame size={20} weight="fill" color={colors.warning} />} value={`${cur.kcal}`} label="kcal na semana" />
      </Row>
      <Card>
        <Text style={s.cardTitle}>Últimos 7 dias</Text>
        <BarChart values={last7.map((k) => byDate[k]?.minutes ?? 0)} labels={last7.map((k) => (k === today ? 'Hoje' : weekday(k)))} format={(n) => `${n}`} />
        <Text style={s.caption}>Minutos caminhados por dia • meta {goals.walkMinutes} min</Text>
      </Card>
      <Card>
        <Text style={s.cardTitle}>Evolução semanal</Text>
        <BarChart values={weeks.map((w) => w.minutes)} labels={weeks.map((w, i) => (i === weeks.length - 1 ? 'Atual' : fmtShort(w.start)))} format={(n) => `${n}`} />
        <Text style={s.caption}>Total de minutos por semana (início na segunda)</Text>
        <Text style={[s.body, { marginTop: spacing.sm, textAlign: 'center' }]}>
          {prev.minutes === 0 && cur.minutes === 0
            ? 'Faça seu primeiro check-in de caminhada no Meu Dia.'
            : delta >= 0
              ? `+${delta} min em relação ao mesmo ponto da semana passada. Continue assim!`
              : `${delta} min em relação ao mesmo ponto da semana passada. Um passo de cada vez.`}
        </Text>
      </Card>
      <SectionLabel>Histórico de caminhadas</SectionLabel>
      <Card>
        {walks.length === 0 && <Text style={s.body}>Nenhuma caminhada registrada ainda.</Text>}
        {(all ? walks : walks.slice(0, 10)).map((w) => (
          <View key={w.date} style={s.histRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.histMain}>{w.minutes} min • {w.intensity === 'leve' ? 'Leve' : 'Moderada'}</Text>
              <Text style={s.small}>{weekday(w.date)}, {fmtDate(w.date)}</Text>
            </View>
            <Text style={s.histDelta}>≈ {w.kcal} kcal</Text>
          </View>
        ))}
        {walks.length > 10 && <ActionButton label={all ? 'Mostrar menos' : `Ver todas (${walks.length})`} onPress={() => setAll(!all)} secondary />}
      </Card>
      <Text style={s.disclaimer}>Calorias estimadas por MET (leve 2,8 • moderada 3,5) × peso × tempo. Valores aproximados.</Text>
    </>
  );
}

function CheckinHistory() {
  const { getDay, profile } = useStore();
  const [days, setDays] = useState(14);
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const start = profile?.createdAt ?? today;
  const list = Array.from({ length: days }, (_, i) => addDays(today, -i)).filter((k) => k >= start);
  const done = list.filter((k) => getDay(k).checkin);
  let streak = 0;
  for (const k of list) {
    if (getDay(k).checkin) streak++;
    else if (k !== today) break; // hoje ainda pode ser preenchido
  }
  const count = (key: 'walk' | 'diet' | 'water') => done.filter((k) => getDay(k).checkin![key]).length;

  return (
    <>
      <Row>
        <Metric icon={<CheckCircle size={20} weight="fill" color={colors.success} />} value={`${list.length ? Math.round((done.length / list.length) * 100) : 0}%`} label={`Check-ins (${list.length} dias)`} />
        <Metric icon={<Flame size={20} weight="fill" color={colors.warning} />} value={`${streak}`} label="Dias seguidos" />
      </Row>
      <Card>
        <Text style={s.cardTitle}>Metas cumpridas nos check-ins</Text>
        {([['walk', 'Caminhada', colors.success], ['diet', 'Plano alimentar', colors.accentDark], ['water', 'Meta de água', colors.info]] as const).map(([key, label, tint]) => (
          <View key={key} style={{ marginTop: spacing.md, gap: 6 }}>
            <View style={s.pillarHead}>
              <Text style={s.pillarLabel}>{label}</Text>
              <Text style={s.pillarValue}>{count(key)} de {done.length} dias</Text>
            </View>
            <ProgressBar value={done.length ? count(key) / done.length : 0} color={tint} height={6} />
          </View>
        ))}
      </Card>
      <SectionLabel>Histórico de check-ins</SectionLabel>
      <Card>
        {list.map((k) => {
          const c = getDay(k).checkin;
          return (
            <View key={k} style={s.histRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.histMain}>{k === today ? 'Hoje' : weekday(k)}</Text>
                <Text style={s.small}>{fmtDate(k)}</Text>
              </View>
              {c ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {([['walk', PersonSimpleWalk], ['diet', ForkKnife], ['water', Drop]] as const).map(([key, Icon]) => (
                    <View key={key} style={[s.miniCircle, { backgroundColor: c[key] ? colors.success : colors.divider }]} accessibilityLabel={`${key}: ${c[key] ? 'sim' : 'não'}`}>
                      <Icon size={15} weight="fill" color={c[key] ? colors.onPrimary : colors.muted} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.small}>Sem check-in</Text>
              )}
            </View>
          );
        })}
        {addDays(today, -days) >= start && <ActionButton label="Ver dias anteriores" onPress={() => setDays(days + 14)} secondary />}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Conteúdo e Premium
// ---------------------------------------------------------------------------

export function ContentScreen({ goPremium }: { goPremium: () => void }) {
  const colors = useColors();
  const s = useStyles();
  const items: { Icon: typeof Syringe; title: string; desc: string }[] = [
    { Icon: Syringe, title: 'Como a tirzepatida age', desc: 'Entenda saciedade, digestão e os cuidados do tratamento.' },
    { Icon: PersonSimpleWalk, title: 'Exercícios contra o platô', desc: 'Opções leves e progressivas para manter a constância.' },
    { Icon: ForkKnife, title: 'Proteína, fibras e hidratação', desc: 'O trio que apoia sua alimentação durante a jornada.' },
    { Icon: Question, title: 'Dúvidas frequentes', desc: 'Respostas educativas e sinais para procurar atendimento.' },
  ];
  return (
    <Screen>
      <View style={s.titleRow}><HeadingIcon icon={<BookOpen size={22} weight="bold" color={colors.primaryDark} />} /><Title subtitle="Informação simples e segura para apoiar sua jornada.">Guia & Conteúdos</Title></View>
      {items.map(({ Icon, title, desc }) => (
        <Card key={title}>
          <IconBadge icon={<Icon size={20} weight="fill" color={colors.primaryDark} />} />
          <Text style={[s.cardTitle, { marginTop: spacing.sm }]}>{title}</Text>
          <Text style={s.body}>{desc}</Text>
          <ActionButton label="Abrir conteúdo" onPress={() => Alert.alert(title, desc)} secondary />
        </Card>
      ))}
      <Card style={s.premiumCard}>
        <View style={s.cardHeadRow}><IconBadge icon={<Crown size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.premiumTitle}>Conteúdo Premium semanal</Text></View>
        <Text style={s.body}>Programas guiados e uma biblioteca completa.</Text>
        <ActionButton label="Ver benefícios" onPress={goPremium} />
      </Card>
      <Text style={s.disclaimer}>Conteúdo educativo. O aplicativo não substitui consulta, diagnóstico ou orientação de profissional de saúde.</Text>
    </Screen>
  );
}

export function PremiumScreen({ close }: { close: () => void }) {
  const colors = useColors();
  const s = useStyles();
  return (
    <Screen>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={s.close}>
        <CaretLeft size={16} weight="bold" color={colors.primary} />
        <Text style={s.closeText}>Voltar</Text>
      </Pressable>
      <View style={s.crownWrap}><Crown size={46} weight="fill" color={colors.primary} /></View>
      <Title subtitle="Seu acompanhamento, do seu jeito.">Queridinhas Premium</Title>
      <Card>
        {[
          'Cardápio semanal personalizado',
          'Lista de compras automática',
          'Fotos e medidas de evolução',
          'Gráficos e relatórios avançados',
          'Histórico completo de aplicações',
          'Lembretes personalizados',
          'Conteúdos e exercícios exclusivos',
        ].map((x) => <Bullet key={x}>{x}</Bullet>)}
      </Card>
      <Card>
        <Text style={s.planSmall}>PLANO MAIS FLEXÍVEL</Text>
        <Text style={s.plan}>R$ 19,90 <Text style={s.planUnit}>/mês</Text></Text>
        <ActionButton label="Começar 7 dias grátis" onPress={() => Alert.alert('Próxima etapa', 'Conecte App Store, Google Play ou RevenueCat para ativar compras reais.')} />
      </Card>
      <Card style={s.best}>
        <Text style={s.badge}>MELHOR ESCOLHA</Text>
        <Text style={s.plan}>R$ 149,90 <Text style={s.planUnit}>/ano</Text></Text>
        <Text style={s.body}>Equivale a R$ 12,49 por mês.</Text>
        <ActionButton label="Escolher plano anual" onPress={() => Alert.alert('Próxima etapa', 'Conecte App Store, Google Play ou RevenueCat para ativar compras reais.')} />
      </Card>
      <Text style={s.disclaimer}>A renovação é automática e pode ser cancelada nas configurações da loja. Valores de demonstração; confirme-os antes da publicação.</Text>
    </Screen>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { color: colors.blush, fontFamily: fonts.bodyBold, fontSize: type.caption, letterSpacing: 1 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.sm },
  heroPct: { color: colors.onPrimary, fontSize: 40, fontFamily: fonts.headingBold },
  heroTitle: { flex: 1, color: colors.onPrimary, fontSize: type.heading, fontFamily: fonts.headingBold },
  heroText: { flex: 1, color: colors.blush, fontFamily: fonts.body, fontSize: type.body, lineHeight: 20 },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  pillar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  pillarBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  pillarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  pillarLabel: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: type.body },
  pillarValue: { fontFamily: fonts.bodyMedium, color: colors.textSecondary, fontSize: type.small, flexShrink: 1, textAlign: 'right' },
  miniCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  checkSummary: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing.lg },
  checkItem: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  checkCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontFamily: fonts.bodySemiBold, fontSize: type.small, color: colors.text },
  question: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  questionHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  questionText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: type.bodyLg, color: colors.text, lineHeight: 21 },
  menuLine: { color: colors.text, fontFamily: fonts.body, fontSize: type.body, lineHeight: 20, marginBottom: spacing.xs },
  menuSlot: { fontFamily: fonts.bodyBold, color: colors.primaryDark },
  pctBadge: { fontFamily: fonts.headingBold, color: colors.primary, fontSize: type.heading },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  weekDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.divider },
  weekDotPart: { backgroundColor: colors.blush },
  weekDotFull: { backgroundColor: colors.success },
  weekDotToday: { borderWidth: 2, borderColor: colors.primary },
  weekPct: { fontSize: type.small, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  weekLabel: { fontSize: type.caption, color: colors.muted, fontFamily: fonts.bodyMedium },
  cardTitle: { fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  body: { color: colors.textSecondary, lineHeight: 21, fontFamily: fonts.body, fontSize: type.body },
  small: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.small, marginTop: spacing.xs, lineHeight: 17 },
  big: { fontSize: type.display, fontFamily: fonts.headingBold, color: colors.primary, marginBottom: spacing.xs },
  bigInline: { fontSize: type.heading, fontFamily: fonts.headingBold, color: colors.primaryDark },
  good: { color: colors.success },
  warn: { color: colors.warning },
  premiumCard: { backgroundColor: colors.surface, borderColor: colors.accent },
  premiumTitle: { fontFamily: fonts.headingBold, fontSize: type.heading, color: colors.primaryDark },
  label: { fontSize: type.small, color: colors.textSecondary, fontFamily: fonts.bodyBold, marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  twoCols: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  kcalBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.warningBg, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  kcal: { fontFamily: fonts.headingBold, fontSize: type.heading, color: colors.text },
  weightSummary: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.lg },
  dateBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  dateTitle: { fontFamily: fonts.headingBold, fontSize: type.title, color: colors.primaryDark },
  dateSub: { fontFamily: fonts.body, fontSize: type.small, color: colors.textSecondary },
  segment: { flexDirection: 'row', backgroundColor: colors.blush, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg },
  segBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  segBtnOn: { backgroundColor: colors.card },
  segText: { fontFamily: fonts.bodySemiBold, color: colors.textSecondary, fontSize: type.body },
  segTextOn: { color: colors.primaryDark, fontFamily: fonts.bodyBold },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  histMain: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: type.bodyLg },
  histDelta: { fontFamily: fonts.bodyBold, color: colors.textSecondary, fontSize: type.body },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  history: { color: colors.text, fontFamily: fonts.bodySemiBold, paddingVertical: spacing.xs },
  caption: { color: colors.textSecondary, fontSize: type.small, textAlign: 'center', marginTop: spacing.sm, fontFamily: fonts.body },
  disclaimer: { fontSize: type.caption, color: colors.muted, lineHeight: 16, textAlign: 'center', marginVertical: spacing.md, fontFamily: fonts.body },
  close: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md },
  closeText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  crownWrap: { alignItems: 'center', marginBottom: spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  bullet: { flex: 1, fontSize: type.bodyLg, color: colors.text, lineHeight: 22, fontFamily: fonts.bodyMedium },
  planSmall: { fontSize: type.caption, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 1 },
  plan: { fontSize: type.headingLg, fontFamily: fonts.headingBold, color: colors.primaryDark, marginVertical: spacing.xs },
  planUnit: { fontSize: type.bodyLg, color: colors.textSecondary, fontFamily: fonts.body },
  best: { borderWidth: 2, borderColor: colors.primary },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.primary, color: colors.onPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, fontSize: type.caption, fontFamily: fonts.bodyBold },
}));
