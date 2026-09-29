import { Bell, CalendarCheck, CaretRight, ChartBar, CloudCheck, Crown, ForkKnife, PencilSimple, Question, Ruler, ShieldCheck, SignOut, Sparkle, Syringe, User } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, Card, Chip, Field, IconBadge, InfoTip, Notice, Title } from './components';
import { ConsentField, PRIVACY_VERSION } from './privacy';
import { fmtDate, fmtNum, parseNum, Profile, Sex, useStore } from './store';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

export const sexOptions: { id: Sex; label: string }[] = [
  { id: 'feminino', label: 'Feminino' },
  { id: 'masculino', label: 'Masculino' },
  { id: 'outro', label: 'Outro' },
];
const IMC_INFO =
  'IMC (Índice de Massa Corporal) é o peso dividido pela altura ao quadrado. ' +
  'Referência para adultos: abaixo de 18,5 baixo peso; 18,5 a 24,9 adequado; 25 a 29,9 sobrepeso; 30 ou mais obesidade. ' +
  'É uma estimativa geral: não diferencia músculo de gordura. Converse com um profissional de saúde.';
const sexLabel = (s: Sex) => sexOptions.find((o) => o.id === s)?.label ?? '—';

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

type FormValues = { name: string; age: string; sex: Sex | null; weight: string; height: string; phone: string; email: string; goalWeight: string };
type Errors = Partial<Record<keyof FormValues, string>>;

function validate(v: FormValues) {
  const e: Errors = {};
  const age = parseNum(v.age);
  const weight = parseNum(v.weight);
  const height = parseNum(v.height);
  const goal = parseNum(v.goalWeight);
  if (v.name.trim().length < 2) e.name = 'Informe seu nome.';
  if (!Number.isInteger(age) || age < 12 || age > 110) e.age = 'Informe uma idade entre 12 e 110 anos.';
  if (!v.sex) e.sex = 'Selecione uma opção.';
  if (!(weight >= 30 && weight <= 350)) e.weight = 'Informe um peso entre 30 e 350 kg.';
  if (!(height >= 100 && height <= 250)) e.height = 'Informe a altura em centímetros (ex.: 165).';
  const digits = v.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) e.phone = 'Informe DDD + número.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Informe um e-mail válido.';
  if (v.goalWeight.trim() && !(goal >= 30 && goal <= 350)) e.goalWeight = 'Informe uma meta entre 30 e 350 kg.';
  return e;
}

function ProfileForm({
  initial,
  submitLabel,
  showGoal,
  requireConsent,
  onSexChange,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  submitLabel: string;
  showGoal?: boolean;
  /** Cadastro inicial: exige o aceite da Política de Privacidade (LGPD). */
  requireConsent?: boolean;
  onSexChange?: (s: Sex) => void;
  onSubmit: (p: Omit<Profile, 'createdAt' | 'id'>, weight: number) => void;
  onCancel?: () => void;
}) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [consent, setConsent] = useState(false);
  const consentMissing = !!requireConsent && !consent;
  const errors = touched ? validate(v) : {};
  const set = (k: keyof FormValues) => (text: string) => setV((p) => ({ ...p, [k]: text }));
  const s = useStyles();

  const submit = () => {
    setTouched(true);
    if (Object.keys(validate(v)).length || consentMissing) return;
    const goal = parseNum(v.goalWeight);
    onSubmit(
      {
        name: v.name.trim(),
        age: parseNum(v.age),
        sex: v.sex!,
        height: parseNum(v.height),
        phone: v.phone,
        email: v.email.trim().toLowerCase(),
        goalWeight: Number.isFinite(goal) ? goal : undefined,
        ...(requireConsent ? { consent: { at: new Date().toISOString(), version: PRIVACY_VERSION } } : {}),
      },
      Math.round(parseNum(v.weight) * 10) / 10
    );
  };

  return (
    <>
      <Field label="Nome" value={v.name} onChangeText={set('name')} placeholder="Como você quer ser chamada(o)" autoCapitalize="words" autoComplete="name" error={errors.name} />
      <View style={s.twoCols}>
        <View style={s.col}><Field label="Idade" value={v.age} onChangeText={(t) => set('age')(t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="Anos" error={errors.age} /></View>
        <View style={s.col}><Field label="Altura (cm)" value={v.height} onChangeText={(t) => set('height')(t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="Ex.: 165" error={errors.height} /></View>
      </View>
      <Text style={s.fieldLabel}>Sexo</Text>
      <View style={s.chips}>
        {sexOptions.map((o) => (
          <Chip key={o.id} label={o.label} active={v.sex === o.id} onPress={() => { setV((p) => ({ ...p, sex: o.id })); onSexChange?.(o.id); }} />
        ))}
      </View>
      {errors.sex ? <Text style={s.error}>{errors.sex}</Text> : null}
      <View style={s.twoCols}>
        <View style={s.col}><Field label="Peso atual (kg)" value={v.weight} onChangeText={(t) => set('weight')(t.replace(/[^\d.,]/g, '').slice(0, 5))} keyboardType="decimal-pad" placeholder="Ex.: 78,5" error={errors.weight} /></View>
        {showGoal && <View style={s.col}><Field label="Meta de peso (opcional)" value={v.goalWeight} onChangeText={(t) => set('goalWeight')(t.replace(/[^\d.,]/g, '').slice(0, 5))} keyboardType="decimal-pad" placeholder="Ex.: 65" error={errors.goalWeight} /></View>}
      </View>
      <Field label="Telefone" value={v.phone} onChangeText={(t) => set('phone')(maskPhone(t))} keyboardType="phone-pad" placeholder="(11) 91234-5678" autoComplete="tel" error={errors.phone} />
      <Field label="E-mail" value={v.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="voce@email.com" error={errors.email} />
      {requireConsent && <ConsentField checked={consent} onChange={setConsent} error={touched ? 'Para continuar, é preciso aceitar o uso dos dados.' : undefined} />}
      {touched && (Object.keys(errors).length > 0 || consentMissing) && <Notice tone="danger">Revise os campos destacados.</Notice>}
      <ActionButton label={submitLabel} onPress={submit} />
      {onCancel && <ActionButton label="Cancelar" onPress={onCancel} secondary />}
    </>
  );
}

export function OnboardingScreen({ onSexChange, accountEmail }: { onSexChange: (s: Sex) => void; accountEmail?: string }) {
  const { saveProfile, legacyAvailable, importLegacy, cloud } = useStore();
  const colors = useColors();
  const s = useStyles();
  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.welcomeIcon}><Sparkle size={28} weight="fill" color={colors.primary} /></View>
      <Title subtitle="Conte um pouco sobre você para personalizarmos suas metas de água, caminhada e evolução.">Boas-vindas ao Queridinhas Slim</Title>
      {legacyAvailable && (
        <Card style={s.premiumCard}>
          <Text style={s.cardTitle}>Encontramos dados neste aparelho</Text>
          <Text style={s.body}>Você já usou o app antes de criar sua conta. Quer trazer esses registros (perfil, pesos, diário, aplicações) para a sua conta?</Text>
          <ActionButton label="Importar meus dados" onPress={importLegacy} />
        </Card>
      )}
      <Card>
        <ProfileForm
          initial={{ name: '', age: '', sex: null, weight: '', height: '', phone: '', email: accountEmail ?? '', goalWeight: '' }}
          submitLabel="Começar minha jornada"
          requireConsent
          onSexChange={onSexChange}
          onSubmit={saveProfile}
        />
      </Card>
      <Text style={s.disclaimer}>{cloud ? 'Seus dados ficam salvos na sua conta' : 'Seus dados ficam salvos neste aparelho'} e podem ser editados a qualquer momento no Perfil.</Text>
    </ScrollView>
  );
}

export function ProfileScreen({ goPremium, open }: { goPremium: () => void; open: (o: 'food' | 'menu' | 'reminders' | 'weekly' | 'privacy' | 'applications' | 'body') => void }) {
  const { profile, currentWeight, initialWeight, saveProfile, cloud, syncStatus, syncNow, signOutAndClear } = useStore();
  const [signOutMsg, setSignOutMsg] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const colors = useColors();
  const s = useStyles();
  if (!profile) return null;

  const bmi = currentWeight ? currentWeight / (profile.height / 100) ** 2 : undefined;
  const rows: [string, string, string?][] = [
    ['Nome', profile.name],
    ['Idade', `${profile.age} anos`],
    ['Sexo', sexLabel(profile.sex)],
    ['Peso atual', currentWeight ? `${fmtNum(currentWeight)} kg` : '—'],
    ['Peso inicial', initialWeight ? `${fmtNum(initialWeight)} kg` : '—'],
    ['Meta de peso', profile.goalWeight ? `${fmtNum(profile.goalWeight)} kg` : 'Não definida'],
    ['Altura', `${profile.height} cm`],
    ['IMC', bmi ? fmtNum(bmi) : '—', IMC_INFO],
    ['Telefone', profile.phone],
    ['E-mail', profile.email],
  ];
  const menu: { Icon: typeof Bell; label: string; onPress?: () => void }[] = [
    { Icon: Syringe, label: 'Aplicações (calendário e histórico)', onPress: () => open('applications') },
    { Icon: Ruler, label: 'Fotos e medidas', onPress: () => open('body') },
    { Icon: ForkKnife, label: 'Preferências alimentares', onPress: () => open('food') },
    { Icon: CalendarCheck, label: 'Cardápio semanal', onPress: () => open('menu') },
    { Icon: Bell, label: 'Notificações e lembretes', onPress: () => open('reminders') },
    { Icon: ChartBar, label: 'Resultado semanal', onPress: () => open('weekly') },
    { Icon: ShieldCheck, label: 'Privacidade e segurança', onPress: () => open('privacy') },
    { Icon: Question, label: 'Ajuda e suporte' },
  ];

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><User size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle="Seus dados, preferências e assinatura.">Meu perfil</Title>
      </View>

      {cloud && (
        <Card>
          <View style={s.cardHeadRow}>
            <IconBadge tone={syncStatus === 'error' ? 'danger' : 'success'} icon={<CloudCheck size={18} weight="fill" color={syncStatus === 'error' ? colors.danger : colors.success} />} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Conta</Text>
              <Text style={s.body} numberOfLines={1}>{profile.email}</Text>
            </View>
          </View>
          <Text style={s.body}>
            {syncStatus === 'synced' ? 'Tudo salvo na nuvem.' : syncStatus === 'syncing' ? 'Salvando na nuvem...' : syncStatus === 'pending' ? 'Alterações aguardando envio.' : 'Sem conexão com o servidor. Suas alterações ficam no aparelho e serão enviadas depois.'}
          </Text>
          {syncStatus === 'error' && <ActionButton label="Tentar sincronizar agora" onPress={syncNow} secondary />}
          {signOutMsg && <Notice tone="danger">{signOutMsg}</Notice>}
          <ActionButton
            label="Sair da conta"
            icon={<SignOut size={16} weight="bold" color={colors.primaryDark} />}
            secondary
            loading={leaving}
            onPress={async () => { setLeaving(true); setSignOutMsg(await signOutAndClear()); setLeaving(false); }}
          />
        </Card>
      )}

      {editing ? (
        <Card>
          <Text style={s.cardTitle}>Editar dados</Text>
          <View style={{ height: spacing.md }} />
          <ProfileForm
            initial={{
              name: profile.name,
              age: String(profile.age),
              sex: profile.sex,
              weight: currentWeight ? fmtNum(currentWeight) : '',
              height: String(profile.height),
              phone: profile.phone,
              email: profile.email,
              goalWeight: profile.goalWeight ? fmtNum(profile.goalWeight) : '',
            }}
            showGoal
            submitLabel="Salvar alterações"
            onSubmit={(p, w) => { saveProfile(p, w); setEditing(false); setSaved(true); }}
            onCancel={() => setEditing(false)}
          />
        </Card>
      ) : (
        <Card>
          <Text style={s.avatar}>{profile.name.charAt(0).toUpperCase()}</Text>
          <Text style={[s.cardTitle, { textAlign: 'center' }]}>{profile.name}</Text>
          <Text style={[s.body, { textAlign: 'center', marginBottom: spacing.md }]}>Jornada iniciada em {fmtDate(profile.createdAt)}</Text>
          {rows.map(([k, val, info]) => (
            // zIndex: o balão de ajuda precisa ficar por cima das linhas seguintes
            <View key={k} style={[s.dataRow, info ? { zIndex: 10 } : null]}>
              <View style={s.dataKeyRow}>
                <Text style={s.dataKey}>{k}</Text>
                {info ? <InfoTip label={k} text={info} /> : null}
              </View>
              <Text style={s.dataVal} numberOfLines={1}>{val}</Text>
            </View>
          ))}
          {saved && <Notice>Dados atualizados com sucesso.</Notice>}
          <ActionButton label="Editar dados" icon={<PencilSimple size={16} weight="bold" color={colors.onPrimary} />} onPress={() => { setSaved(false); setEditing(true); }} />
        </Card>
      )}

      {menu.map(({ Icon, label, onPress }) => (
        <Pressable key={label} onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => pressed && { opacity: 0.8 }}>
          <Card style={s.menuCard}>
            <View style={s.menuRow}>
              <Icon size={19} weight="regular" color={colors.primaryDark} />
              <Text style={s.menu}>{label}</Text>
              <CaretRight size={16} weight="bold" color={colors.muted} />
            </View>
          </Card>
        </Pressable>
      ))}
      <Card style={s.premiumCard}>
        <View style={s.cardHeadRow}><IconBadge icon={<Crown size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.premiumTitle}>Queridinhas Premium</Text></View>
        <Text style={s.body}>Assine, gerencie ou restaure sua compra.</Text>
        <ActionButton label="Gerenciar assinatura" onPress={goPremium} />
      </Card>
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  welcomeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  twoCols: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  fieldLabel: { fontSize: type.small, color: colors.textSecondary, fontFamily: fonts.bodyBold, marginBottom: spacing.xs },
  error: { color: colors.danger, fontSize: type.small, fontFamily: fonts.bodySemiBold, marginTop: -spacing.xs, marginBottom: spacing.md },
  cardTitle: { fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, lineHeight: 21, fontFamily: fonts.body, fontSize: type.body },
  avatar: { alignSelf: 'center', width: 62, height: 62, lineHeight: 62, borderRadius: 31, textAlign: 'center', backgroundColor: colors.primary, color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: type.headingLg, marginBottom: spacing.sm, overflow: 'hidden' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  dataKeyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dataKey: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: type.body },
  dataVal: { flexShrink: 1, color: colors.text, fontFamily: fonts.bodyBold, fontSize: type.body, textAlign: 'right' },
  menuCard: { paddingVertical: spacing.md },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menu: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: type.bodyLg, color: colors.text },
  premiumCard: { backgroundColor: colors.surface, borderColor: colors.accent },
  premiumTitle: { fontFamily: fonts.headingBold, fontSize: type.heading, color: colors.primaryDark },
  disclaimer: { fontSize: type.caption, color: colors.muted, lineHeight: 16, textAlign: 'center', marginVertical: spacing.md, fontFamily: fonts.body },
  reset: { alignSelf: 'center', padding: spacing.md, borderRadius: radius.sm },
  resetText: { color: colors.danger, fontFamily: fonts.bodySemiBold, fontSize: type.small },
}));
