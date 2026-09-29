import * as Sharing from 'expo-sharing';
import { CaretLeft, CaretRight, ChartLineDown, CheckCircle, Drop, Flame, ForkKnife, PersonSimpleWalk, ShareNetwork, Sparkle } from 'phosphor-react-native';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ActionButton, Card, LogoMark, Metric, Notice, ProgressBar, SectionLabel, Title } from './components';
import { addDays, dateKey, fmtLiters, fmtNum, fmtShort, fromKey, GLASS_ML, useStore, walkKcal, waterGoalMl, weightOn } from './store';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

const weekStart = (k: string) => addDays(k, -((fromKey(k).getDay() + 6) % 7));

/** Números da semana (segunda a domingo), contando só os dias já vividos desde o cadastro. */
function useWeekStats(start: string) {
  const { getDay, weights, profile } = useStore();
  const today = dateKey();
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((k) => k <= today && k >= (profile?.createdAt ?? start));
  const logs = days.map((k) => ({ k, log: getDay(k), kg: weightOn(weights, k) }));

  const walks = logs.filter(({ log }) => log.walk.done && log.walk.minutes > 0);
  const walkMinutes = walks.reduce((a, { log }) => a + log.walk.minutes, 0);
  const kcal = walks.reduce((a, { log, kg }) => a + walkKcal(kg, log.walk.minutes, log.walk.intensity), 0);
  const waterTotal = logs.reduce((a, { log }) => a + log.glasses * GLASS_ML, 0);
  const waterAvg = days.length ? waterTotal / days.length : 0;
  const waterGoalDays = logs.filter(({ log, kg }) => log.glasses * GLASS_ML >= waterGoalMl(kg)).length;
  const checkins = logs.filter(({ log }) => log.checkin).length;
  const dietDays = logs.filter(({ log }) => log.checkin?.diet).length;

  // peso: última medição antes da semana (ou a primeira dentro dela) × última medição até o fim da semana
  const before = weights.filter((w) => w.date < start);
  const inWeek = weights.filter((w) => w.date >= start && w.date <= end);
  const from = before.length ? before[before.length - 1] : inWeek[0];
  const to = inWeek.length ? inWeek[inWeek.length - 1] : undefined;
  const weightDiff = from && to && from.id !== to.id ? to.kg - from.kg : undefined;
  const totalDiff = weights.length && to ? to.kg - weights[0].kg : undefined;

  return {
    start, end, days: days.length, walks: walks.length, walkMinutes, kcal, waterAvg, waterGoalDays,
    checkins, checkinPct: days.length ? Math.round((checkins / days.length) * 100) : 0, dietDays,
    weightDiff, totalDiff, weightPoints: inWeek.length,
  };
}
type Stats = ReturnType<typeof useWeekStats>;

function cheer(st: Stats) {
  if (st.checkinPct >= 80) return 'Constância é o seu superpoder. Semana linda!';
  if (st.weightDiff !== undefined && st.weightDiff < 0) return 'Cada escolha conta, e seu corpo está respondendo!';
  if (st.walks >= 4) return 'Seus passos estão fazendo a diferença!';
  if (st.waterGoalDays >= 4) return 'Hidratação em dia: seu corpo agradece!';
  return 'Cada pequeno passo conta. Orgulho da sua jornada!';
}

/** Conquistas mostradas no card: só o que é positivo e nenhum dado pessoal (nome, peso absoluto, contatos). */
function achievements(st: Stats) {
  const list: { Icon: typeof Drop; value: string; label: string }[] = [];
  if (st.weightDiff !== undefined && st.weightDiff < 0) list.push({ Icon: ChartLineDown, value: `−${fmtNum(-st.weightDiff)} kg`, label: 'na semana' });
  if (st.walks > 0) list.push({ Icon: PersonSimpleWalk, value: `${st.walks}`, label: st.walks === 1 ? 'caminhada' : 'caminhadas' });
  if (st.kcal > 0) list.push({ Icon: Flame, value: `${st.kcal}`, label: 'kcal caminhando' });
  if (st.waterAvg > 0) list.push({ Icon: Drop, value: fmtLiters(st.waterAvg), label: 'de água por dia' });
  if (st.dietDays > 0) list.push({ Icon: ForkKnife, value: `${st.dietDays}`, label: st.dietDays === 1 ? 'dia no plano' : 'dias no plano' });
  if (st.checkins > 0) list.push({ Icon: CheckCircle, value: `${st.checkinPct}%`, label: 'check-ins feitos' });
  return list.slice(0, 6);
}

function ShareCard({ st }: { st: Stats }) {
  const colors = useColors();
  const s = useStyles();
  const items = achievements(st);
  return (
    <View style={s.shareCard} collapsable={false}>
      <View style={s.shareHead}>
        <View style={s.logoBg}><LogoMark size={44} dark={colors.primaryDark} light={colors.accent} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.shareEyebrow}>MINHA SEMANA</Text>
          <Text style={s.shareDates}>{fmtShort(st.start)} a {fmtShort(st.end)}</Text>
        </View>
        <Sparkle size={26} weight="fill" color={colors.accent} />
      </View>
      <Text style={s.shareCheer}>{cheer(st)}</Text>
      <View style={s.shareGrid}>
        {items.length ? (
          items.map(({ Icon, value, label }) => (
            <View key={label} style={s.shareTile}>
              <Icon size={22} weight="fill" color={colors.accent} />
              <Text style={s.shareValue}>{value}</Text>
              <Text style={s.shareLabel}>{label}</Text>
            </View>
          ))
        ) : (
          <Text style={s.shareEmpty}>Uma nova semana começou. Bora juntas(os)?</Text>
        )}
      </View>
      <Text style={s.shareFooter}>Queridinhas Slim • cuidado todos os dias</Text>
    </View>
  );
}

export function WeeklyScreen({ close }: { close: () => void }) {
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const [start, setStart] = useState(weekStart(today));
  const st = useWeekStats(start);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const isCurrent = start === weekStart(today);

  const share = async () => {
    setSharing(true);
    setMsg(null);
    try {
      if (Platform.OS === 'web') {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'data-uri' });
        const blob = await (await fetch(uri)).blob();
        const file = new File([blob], 'minha-semana-queridinhas.png', { type: 'image/png' });
        const nav = navigator as Navigator & { canShare?: (d: object) => boolean };
        const download = () => {
          const a = document.createElement('a');
          a.href = uri;
          a.download = file.name;
          a.click();
          setMsg({ text: 'Imagem baixada. Agora é só publicar nas suas redes!', ok: true });
        };
        if (nav.canShare?.({ files: [file] })) {
          // alguns navegadores anunciam suporte mas recusam o compartilhamento: baixa a imagem nesse caso
          await nav.share({ files: [file], title: 'Minha semana', text: cheer(st) }).catch((e: Error) => {
            if (e.name === 'AbortError') throw e;
            download();
          });
        } else {
          download();
        }
      } else {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
        if (!(await Sharing.isAvailableAsync())) throw new Error('indisponível');
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar minha evolução', UTI: 'public.png' });
      }
    } catch (e) {
      console.warn('Falha ao compartilhar o card semanal', e);
      if ((e as Error)?.name !== 'AbortError') setMsg({ text: 'Não foi possível gerar ou compartilhar a imagem agora. Tente novamente.', ok: false });
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={s.back}>
        <CaretLeft size={16} weight="bold" color={colors.primary} />
        <Text style={s.backText}>Voltar</Text>
      </Pressable>
      <Title subtitle="Seus resultados de segunda a domingo.">Resultado semanal</Title>

      <View style={s.weekNav}>
        <Pressable onPress={() => setStart(addDays(start, -7))} accessibilityRole="button" accessibilityLabel="Semana anterior" hitSlop={8} style={s.navBtn}>
          <CaretLeft size={18} weight="bold" color={colors.primaryDark} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.navTitle}>{isCurrent ? 'Esta semana' : `Semana de ${fmtShort(start)}`}</Text>
          <Text style={s.small}>{fmtShort(st.start)} a {fmtShort(st.end)}{isCurrent ? ` • ${st.days} de 7 dias` : ''}</Text>
        </View>
        <Pressable onPress={() => !isCurrent && setStart(addDays(start, 7))} disabled={isCurrent} accessibilityRole="button" accessibilityLabel="Próxima semana" hitSlop={8} style={[s.navBtn, isCurrent && { opacity: 0.3 }]}>
          <CaretRight size={18} weight="bold" color={colors.primaryDark} />
        </Pressable>
      </View>

      {st.days === 0 ? (
        <Card><Text style={s.body}>Esta semana é anterior ao início da sua jornada.</Text></Card>
      ) : (
        <>
          <Card>
            <Text style={s.cardTitle}>Evolução do peso</Text>
            <Text style={s.big}>{st.weightDiff === undefined ? '—' : `${st.weightDiff > 0 ? '+' : st.weightDiff < 0 ? '−' : ''}${fmtNum(Math.abs(st.weightDiff))} kg`}</Text>
            <Text style={s.body}>
              {st.weightDiff === undefined ? 'Registre seu peso nesta semana para ver a variação.' : 'Variação na semana.'}
              {st.totalDiff !== undefined ? ` Desde o início: ${st.totalDiff > 0 ? '+' : st.totalDiff < 0 ? '−' : ''}${fmtNum(Math.abs(st.totalDiff))} kg.` : ''}
            </Text>
          </Card>
          <View style={s.grid}>
            <View style={s.gridItem}><Metric icon={<PersonSimpleWalk size={20} weight="fill" color={colors.success} />} value={`${st.walks}`} label={`caminhadas • ${st.walkMinutes} min`} /></View>
            <View style={s.gridItem}><Metric icon={<Flame size={20} weight="fill" color={colors.warning} />} value={`${st.kcal} kcal`} label="gastas caminhando (estimativa)" /></View>
            <View style={s.gridItem}><Metric icon={<Drop size={20} weight="fill" color={colors.info} />} value={fmtLiters(st.waterAvg)} label={`média de água/dia • meta em ${st.waterGoalDays} dias`} /></View>
            <View style={s.gridItem}><Metric icon={<ForkKnife size={20} weight="fill" color={colors.accentDark} />} value={`${st.dietDays} de ${st.days}`} label="dias no plano alimentar" /></View>
          </View>
          <Card>
            <View style={s.rowBetween}>
              <Text style={s.cardTitle}>Check-ins concluídos</Text>
              <Text style={s.pct}>{st.checkinPct}%</Text>
            </View>
            <View style={{ marginTop: spacing.sm }}><ProgressBar value={st.checkinPct / 100} color={colors.success} /></View>
            <Text style={s.small}>{st.checkins} de {st.days} dias com check-in</Text>
          </Card>

          <SectionLabel>Card para compartilhar</SectionLabel>
          <View ref={cardRef} collapsable={false} style={{ alignSelf: 'center' }}>
            <ShareCard st={st} />
          </View>
          <Text style={[s.small, { textAlign: 'center' }]}>O card não mostra seu nome, peso atual nem contatos.</Text>
          {msg && <Notice tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Notice>}
          <ActionButton label="Compartilhar minha evolução" icon={<ShareNetwork size={18} weight="bold" color={colors.onPrimary} />} onPress={share} loading={sharing} />
        </>
      )}
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md, minHeight: 44 },
  backText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.lg },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: fonts.headingBold, fontSize: type.title, color: colors.primaryDark },
  cardTitle: { fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  body: { color: colors.textSecondary, lineHeight: 21, fontFamily: fonts.body, fontSize: type.body },
  small: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.small, marginTop: spacing.xs, lineHeight: 17 },
  big: { fontSize: type.display, fontFamily: fonts.headingBold, color: colors.primary, marginVertical: spacing.xs },
  pct: { fontFamily: fonts.headingBold, fontSize: type.heading, color: colors.success },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: spacing.md },
  gridItem: { width: '50%', padding: 5 },
  shareCard: { width: 340, maxWidth: '100%', backgroundColor: colors.primaryDark, borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden' },
  shareHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  shareEyebrow: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: type.small, letterSpacing: 1.5 },
  shareDates: { color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: type.heading },
  shareCheer: { color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: 22, lineHeight: 29, marginVertical: spacing.lg },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shareTile: { width: '31%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  shareValue: { color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: type.title, marginTop: spacing.xs },
  shareLabel: { color: colors.blush, fontFamily: fonts.body, fontSize: type.caption, textAlign: 'center', marginTop: 2 },
  shareEmpty: { color: colors.blush, fontFamily: fonts.body, fontSize: type.body },
  shareFooter: { color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: type.caption, textAlign: 'center', marginTop: spacing.lg, letterSpacing: 0.5 },
}));
