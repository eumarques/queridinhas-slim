import { CaretLeft, ForkKnife, Info, Plus, X } from 'phosphor-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, Card, Chip, Field, IconBadge, Notice, ProgressBar, Title } from './components';
import {
  activityOptions,
  buildWeekMenu,
  foodSuggestions,
  FoodPrefs,
  mealCountOptions,
  norm,
  stem,
  Restriction,
  restrictionOptions,
  slotsFor,
} from './menu';
import { addDays, dateKey, fromKey, useStore } from './store';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

const MAX_TAGS = 15;
const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DISCLAIMER =
  'Valores de calorias e proteínas são estimativas. Este cardápio é uma sugestão educativa e não substitui uma dieta individualizada: ' +
  'valide com um(a) nutricionista, principalmente em gestação, amamentação, diabetes, doença renal ou outras condições de saúde.';

function BackLink({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const s = useStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={s.back}>
      <CaretLeft size={16} weight="bold" color={colors.primary} />
      <Text style={s.backText}>Voltar</Text>
    </Pressable>
  );
}

/** Lista de alimentos com campo livre + sugestões. */
function TagEditor({ label, tags, other, otherLabel, onChange }: { label: string; tags: string[]; other: string[]; otherLabel: string; onChange: (t: string[]) => void }) {
  const colors = useColors();
  const s = useStyles();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const has = (list: string[], t: string) => list.some((x) => stem(x) === stem(t));

  const add = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, ' ');
    if (t.length < 2 || t.length > 30) return setError('Digite um alimento com 2 a 30 letras.');
    if (!/^[\p{L}\s-]+$/u.test(t)) return setError('Use apenas letras (ex.: frango, batata-doce).');
    if (has(tags, t)) return setError('Esse alimento já está na lista.');
    if (has(other, t)) return setError(`Esse alimento já está em "${otherLabel}".`);
    if (tags.length >= MAX_TAGS) return setError(`Limite de ${MAX_TAGS} alimentos.`);
    setError('');
    setText('');
    onChange([...tags, t.charAt(0).toUpperCase() + t.slice(1)]);
  };

  return (
    <View>
      <View style={s.addRow}>
        <View style={{ flex: 1 }}>
          <Field label={label} value={text} onChangeText={(t) => { setText(t); setError(''); }} onSubmitEditing={() => add(text)} placeholder="Digite e toque em +" returnKeyType="done" error={error} />
        </View>
        <Pressable onPress={() => add(text)} accessibilityRole="button" accessibilityLabel={`Adicionar em ${label}`} style={s.addBtn}>
          <Plus size={20} weight="bold" color={colors.onPrimary} />
        </Pressable>
      </View>
      {tags.length > 0 && (
        <View style={s.chips}>
          {tags.map((t) => (
            <Chip key={t} label={t} active onPress={() => onChange(tags.filter((x) => x !== t))} icon={(c) => <X size={13} weight="bold" color={c} />} />
          ))}
        </View>
      )}
      <Text style={s.small}>Sugestões:</Text>
      <View style={[s.chips, { marginTop: spacing.xs }]}>
        {foodSuggestions.filter((f) => !has(tags, f) && !has(other, f)).slice(0, 10).map((f) => (
          <Chip key={f} label={f} active={false} onPress={() => add(f)} />
        ))}
      </View>
    </View>
  );
}

export function FoodPrefsScreen({ close, goMenu }: { close: () => void; goMenu: () => void }) {
  const { foodPrefs, hasFoodPrefs, saveFood } = useStore();
  const colors = useColors();
  const s = useStyles();
  const [v, setV] = useState<Omit<FoodPrefs, 'seed'>>(foodPrefs);
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<FoodPrefs>) => { setV({ ...v, ...patch }); setSaved(false); };
  const toggleRestriction = (r: Restriction) => set({ restrictions: v.restrictions.includes(r) ? v.restrictions.filter((x) => x !== r) : [...v.restrictions, r] });

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BackLink onPress={close} />
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><ForkKnife size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle="Usamos estas respostas para montar seu cardápio semanal.">Preferências alimentares</Title>
      </View>

      <Card>
        <Text style={s.cardTitle}>Quantas refeições você faz por dia?</Text>
        <View style={[s.chips, { marginTop: spacing.md }]}>
          {mealCountOptions.map((n) => <Chip key={n} label={`${n} refeições`} active={v.mealsPerDay === n} onPress={() => set({ mealsPerDay: n })} />)}
        </View>
        <Text style={s.small}>{slotsFor(v.mealsPerDay).map((m) => m.label).join(' • ')}</Text>
      </Card>

      <Card>
        <Text style={s.cardTitle}>Nível de atividade física</Text>
        <Text style={s.small}>Usado para estimar seu gasto energético diário.</Text>
        <View style={[s.chips, { marginTop: spacing.md }]}>
          {activityOptions.map((a) => <Chip key={a.id} label={a.label} active={v.activity === a.id} onPress={() => set({ activity: a.id })} />)}
        </View>
        <Text style={s.small}>{activityOptions.find((a) => a.id === v.activity)?.hint}</Text>
      </Card>

      <Card>
        <Text style={s.cardTitle}>Restrições e intolerâncias</Text>
        <View style={[s.chips, { marginTop: spacing.md }]}>
          {restrictionOptions.map((r) => <Chip key={r.id} label={r.label} active={v.restrictions.includes(r.id)} onPress={() => toggleRestriction(r.id)} />)}
        </View>
        <Text style={s.small}>Pratos com esses ingredientes não entram no cardápio. Em caso de alergia, confira sempre os rótulos.</Text>
      </Card>

      <Card>
        <Text style={s.cardTitle}>Alimentos preferidos</Text>
        <Text style={[s.small, { marginBottom: spacing.md }]}>Pratos com esses alimentos aparecem com mais frequência.</Text>
        <TagEditor label="Adicionar alimento preferido" tags={v.likes} other={v.avoid} otherLabel="Evitar" onChange={(likes) => set({ likes })} />
      </Card>

      <Card>
        <Text style={s.cardTitle}>Alimentos que deseja evitar</Text>
        <Text style={[s.small, { marginBottom: spacing.md }]}>Pratos com esses alimentos não serão sugeridos.</Text>
        <TagEditor label="Adicionar alimento a evitar" tags={v.avoid} other={v.likes} otherLabel="Preferidos" onChange={(avoid) => set({ avoid })} />
      </Card>

      {saved && <Notice>Preferências salvas. Seu cardápio foi atualizado.</Notice>}
      <ActionButton label="Salvar preferências" onPress={() => { saveFood(v); setSaved(true); }} />
      {(saved || hasFoodPrefs) && <ActionButton label="Ver meu cardápio semanal" onPress={goMenu} secondary />}
    </ScrollView>
  );
}

export function MenuScreen({ close, goPrefs }: { close: () => void; goPrefs: () => void }) {
  const { foodPrefs, hasFoodPrefs, targets, regenerateMenu } = useStore();
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const todayIdx = (fromKey(today).getDay() + 6) % 7; // 0 = segunda
  const [day, setDay] = useState(todayIdx);
  const [showCalc, setShowCalc] = useState(false);
  const week = useMemo(() => (targets ? buildWeekMenu(foodPrefs, targets) : []), [foodPrefs, targets]);
  if (!targets) return null;
  const menu = week[day];
  const missing = menu.meals.some((m) => !m.dish);
  const date = addDays(today, day - todayIdx);

  return (
    <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
      <BackLink onPress={close} />
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><ForkKnife size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle="Sugestões com foco em proteína, conforme seu perfil e preferências.">Cardápio semanal</Title>
      </View>

      {!hasFoodPrefs && (
        <Card style={s.highlight}>
          <Text style={s.cardTitle}>Personalize seu cardápio</Text>
          <Text style={s.body}>Informe restrições, alimentos preferidos e quantas refeições você faz. Por enquanto, mostramos uma sugestão padrão com 4 refeições.</Text>
          <ActionButton label="Preencher preferências" onPress={goPrefs} />
        </Card>
      )}

      <Card tone="primary">
        <Text style={s.eyebrow}>SUAS METAS DIÁRIAS ESTIMADAS</Text>
        <View style={s.targetRow}>
          <View style={{ flex: 1 }}><Text style={s.targetValue}>{targets.kcal}</Text><Text style={s.targetLabel}>kcal por dia</Text></View>
          <View style={{ flex: 1 }}><Text style={s.targetValue}>{targets.protein} g</Text><Text style={s.targetLabel}>proteína por dia</Text></View>
        </View>
        <Pressable onPress={() => setShowCalc(!showCalc)} accessibilityRole="button" style={s.calcToggle}>
          <Info size={16} color={colors.blush} />
          <Text style={s.calcToggleText}>{showCalc ? 'Ocultar cálculo' : 'Como calculamos?'}</Text>
        </Pressable>
        {showCalc && (
          <View style={{ gap: 4, marginTop: spacing.xs }}>
            <Text style={s.calcLine}>Taxa metabólica basal (Mifflin-St Jeor): {targets.bmr} kcal</Text>
            <Text style={s.calcLine}>Gasto total estimado (atividade {activityOptions.find((a) => a.id === foodPrefs.activity)?.label.toLowerCase()}): {targets.tdee} kcal</Text>
            <Text style={s.calcLine}>Meta: gasto total − {targets.deficit} kcal</Text>
            <Text style={s.calcLine}>Proteína: 2 g por kg de peso de referência, dividida entre as refeições</Text>
            {targets.notes.map((n) => <Text key={n} style={s.calcLine}>• {n}</Text>)}
          </View>
        )}
      </Card>

      <View style={s.dayTabs}>
        {weekLabels.map((l, i) => (
          <Pressable key={l} onPress={() => setDay(i)} accessibilityRole="tab" accessibilityState={{ selected: day === i }} accessibilityLabel={l} style={[s.dayTab, day === i && s.dayTabOn]}>
            <Text style={[s.dayTabText, day === i && s.dayTabTextOn]}>{l}</Text>
            {i === todayIdx && <View style={[s.todayDot, day === i && { backgroundColor: colors.onPrimary }]} />}
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={s.cardTitle}>{weekLabels[day]}{day === todayIdx ? ' • hoje' : ''} ({date.slice(8, 10)}/{date.slice(5, 7)})</Text>
        {menu.meals.map((m) => (
          <View key={m.slot} style={s.meal}>
            <View style={s.mealHead}>
              <Text style={s.mealLabel}>{m.label}</Text>
              {m.dish && <Text style={s.mealKcal}>{m.kcal} kcal • {m.protein} g prot.</Text>}
            </View>
            {m.dish ? (
              <>
                <Text style={s.mealDish}>{m.dish.name}</Text>
                {m.portion !== 1 && <Text style={s.small}>Porção {m.portion > 1 ? 'maior' : 'menor'} ({m.portion > 1 ? '+' : '−'}{Math.round(Math.abs(m.portion - 1) * 100)}%) para chegar perto da meta da refeição</Text>}
              </>
            ) : (
              <Text style={s.small}>Nenhuma opção compatível com suas restrições. Revise as preferências.</Text>
            )}
          </View>
        ))}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Calorias do dia</Text>
            <Text style={s.totalValue}>{menu.kcal} / {targets.kcal} kcal</Text>
          </View>
          <ProgressBar value={menu.kcal / targets.kcal} color={colors.accentDark} />
          <View style={[s.totalRow, { marginTop: spacing.md }]}>
            <Text style={s.totalLabel}>Proteínas do dia</Text>
            <Text style={s.totalValue}>{menu.protein} / {targets.protein} g</Text>
          </View>
          <ProgressBar value={menu.protein / targets.protein} color={colors.success} />
        </View>
      </Card>

      {missing && <Notice tone="danger">Algumas refeições ficaram sem opção. Remova alguns itens de "evitar" ou revise as restrições.</Notice>}
      <ActionButton label="Gerar novas opções" onPress={regenerateMenu} />
      <ActionButton label="Editar preferências" onPress={goPrefs} secondary />
      <Card style={[s.highlight, { marginTop: spacing.lg }]}>
        <View style={s.cardHeadRow}><IconBadge icon={<Info size={18} weight="bold" color={colors.primaryDark} />} size={34} /><Text style={s.cardTitle}>Importante</Text></View>
        <Text style={s.body}>{DISCLAIMER}</Text>
      </Card>
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md, minHeight: 44 },
  backText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  cardTitle: { fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, lineHeight: 21, fontFamily: fonts.body, fontSize: type.body, marginTop: spacing.xs },
  small: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.small, marginTop: spacing.xs, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  addBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 21 },
  highlight: { backgroundColor: colors.surface, borderColor: colors.accent },
  eyebrow: { color: colors.blush, fontFamily: fonts.bodyBold, fontSize: type.caption, letterSpacing: 1 },
  targetRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  targetValue: { color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: 28 },
  targetLabel: { color: colors.blush, fontFamily: fonts.body, fontSize: type.small },
  calcToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, minHeight: 32 },
  calcToggleText: { color: colors.blush, fontFamily: fonts.bodyBold, fontSize: type.small, textDecorationLine: 'underline' },
  calcLine: { color: colors.blush, fontFamily: fonts.body, fontSize: type.small, lineHeight: 17 },
  dayTabs: { flexDirection: 'row', gap: 4, marginBottom: spacing.lg },
  dayTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, minHeight: 44, justifyContent: 'center' },
  dayTabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayTabText: { fontFamily: fonts.bodySemiBold, fontSize: type.small, color: colors.textSecondary },
  dayTabTextOn: { color: colors.onPrimary, fontFamily: fonts.bodyBold },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 3 },
  meal: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  mealLabel: { fontFamily: fonts.bodyBold, fontSize: type.small, color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
  mealKcal: { fontFamily: fonts.bodySemiBold, fontSize: type.small, color: colors.textSecondary },
  mealDish: { fontFamily: fonts.bodySemiBold, fontSize: type.bodyLg, color: colors.text, marginTop: spacing.xs, lineHeight: 21 },
  totals: { marginTop: spacing.lg, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: type.body, color: colors.text },
  totalValue: { fontFamily: fonts.bodySemiBold, fontSize: type.body, color: colors.textSecondary },
}));
