import { Lora_600SemiBold, Lora_700Bold, useFonts as useLoraFonts } from '@expo-google-fonts/lora';
import { Raleway_400Regular, Raleway_500Medium, Raleway_600SemiBold, Raleway_700Bold, useFonts as useRalewayFonts } from '@expo-google-fonts/raleway';
import { BookOpen, ChartBar, House, NotePencil, User } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApplicationsScreen } from './src/applications';
import { AuthProvider, AuthScreen, NewPasswordScreen, useAuth } from './src/auth';
import { BodyScreen } from './src/body';
import { FoodPrefsScreen, MenuScreen } from './src/food';
import { cancelReminders, RemindersScreen, syncReminders } from './src/notifications';
import { ConsentRequiredScreen, PRIVACY_VERSION, PrivacyScreen } from './src/privacy';
import { OnboardingScreen, ProfileScreen } from './src/profile';
import { ContentScreen, DayScreen, HomeScreen, PremiumScreen, ProgressScreen } from './src/screens';
import { dateKey, dayProgress, nextApplicationDate, nextBodyCheckDate, Sex, StoreProvider, useStore } from './src/store';
import { WeeklyScreen } from './src/weekly';
import { createStyles, fonts, palettes, radius, shadow, spacing, ThemeContext, type, useColors } from './src/theme';

type Tab = 'inicio' | 'meudia' | 'progresso' | 'conteudo' | 'perfil';
export type Overlay = 'premium' | 'food' | 'menu' | 'reminders' | 'weekly' | 'privacy' | 'applications' | 'body';
const tabs: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'inicio', label: 'Início', Icon: House },
  { id: 'meudia', label: 'Meu Dia', Icon: NotePencil },
  { id: 'progresso', label: 'Progresso', Icon: ChartBar },
  { id: 'conteudo', label: 'Conteúdo', Icon: BookOpen },
  { id: 'perfil', label: 'Perfil', Icon: User },
];

/** Identidade rosé para feminino; azul para as demais opções. */
const paletteFor = (sex?: Sex | null) => (!sex || sex === 'feminino' ? palettes.rose : palettes.blue);

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const st = useStyles();
  return (
    <View style={[st.tabs, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={({ pressed }) => [st.tab, pressed && { opacity: 0.7 }]}
          >
            <View style={[st.tabIconWrap, active && st.tabIconWrapActive]}>
              <t.Icon size={22} weight={active ? 'fill' : 'regular'} color={active ? colors.onPrimary : colors.muted} />
            </View>
            <Text style={[st.label, active && st.active]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Main({ accountEmail }: { accountEmail?: string }) {
  const { ready, profile, reminders, getDay, currentWeight, mealsPerDay, applications, bodyChecks } = useStore();
  const [tab, setTab] = useState<Tab>('inicio');
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [appDate, setAppDate] = useState<string | undefined>();
  const [previewSex, setPreviewSex] = useState<Sex | null>(null);
  const palette = paletteFor(profile ? profile.sex : previewSex);
  const st = useStyles();

  // Reagenda os lembretes quando configurações ou registros de hoje mudam (no celular).
  const today = getDay(dateKey());
  const todayP = dayProgress(today, currentWeight ?? 70, mealsPerDay);
  const nextApplication = nextApplicationDate(applications);
  const nextBody = nextBodyCheckDate(bodyChecks);
  const syncKey = JSON.stringify([reminders, todayP.waterMl, todayP.goalMl, today.walk.done, !!today.checkin, nextApplication, nextBody]);
  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      // sem perfil (ex.: dados apagados): nenhum lembrete deve continuar agendado
      cancelReminders().catch(() => {});
      return;
    }
    const t = setTimeout(() => {
      syncReminders(reminders, { waterMl: todayP.waterMl, goalMl: todayP.goalMl, walkDone: today.walk.done, checkinDone: !!today.checkin, nextApplication, nextBody }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey, !!profile, ready]);

  const open = (o: Overlay) => setOverlay(o);
  const close = () => setOverlay(null);
  const screen = () => {
    if (overlay === 'premium') return <PremiumScreen close={close} />;
    if (overlay === 'food') return <FoodPrefsScreen close={close} goMenu={() => open('menu')} />;
    if (overlay === 'menu') return <MenuScreen close={close} goPrefs={() => open('food')} />;
    if (overlay === 'reminders') return <RemindersScreen close={close} />;
    if (overlay === 'weekly') return <WeeklyScreen close={close} />;
    if (overlay === 'privacy') return <PrivacyScreen close={close} />;
    if (overlay === 'applications') return <ApplicationsScreen close={close} initialDate={appDate} />;
    if (overlay === 'body') return <BodyScreen close={close} />;
    const goApplications = (date?: string) => { setAppDate(date); open('applications'); };
    if (tab === 'inicio') {
      return <HomeScreen goPremium={() => open('premium')} goDay={() => setTab('meudia')} goMenu={() => open('menu')} goWeekly={() => open('weekly')} goApplications={() => goApplications()} goBody={() => open('body')} />;
    }
    if (tab === 'meudia') return <DayScreen goProgress={() => setTab('progresso')} goMenu={() => open('menu')} goApplications={goApplications} />;
    if (tab === 'progresso') return <ProgressScreen goWeekly={() => open('weekly')} goBody={() => open('body')} />;
    if (tab === 'conteudo') return <ContentScreen goPremium={() => open('premium')} />;
    return <ProfileScreen goPremium={() => open('premium')} open={open} />;
  };

  return (
    <ThemeContext.Provider value={palette}>
      <SafeAreaView style={[st.safe, { backgroundColor: palette.background }]} edges={['top']}>
        {!ready ? null : !profile ? (
          <OnboardingScreen onSexChange={setPreviewSex} accountEmail={accountEmail} />
        ) : profile.consent?.version !== PRIVACY_VERSION ? (
          <ConsentRequiredScreen />
        ) : (
          <>
            <View style={st.content}>{screen()}</View>
            {!overlay && <TabBar tab={tab} setTab={setTab} />}
          </>
        )}
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

export default function App() {
  const [loraLoaded] = useLoraFonts({ Lora_600SemiBold, Lora_700Bold });
  const [ralewayLoaded] = useRalewayFonts({ Raleway_400Regular, Raleway_500Medium, Raleway_600SemiBold, Raleway_700Bold });

  if (!loraLoaded || !ralewayLoaded) {
    return <View style={{ flex: 1, backgroundColor: palettes.rose.background }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Com Supabase configurado: exige login e separa os dados por conta (key = id da conta).
 * Sem Supabase: funciona só neste aparelho, como antes.
 */
function Root() {
  const auth = useAuth();
  const st = useStyles();
  if (!auth.enabled) {
    return (
      <StoreProvider>
        <Main />
      </StoreProvider>
    );
  }
  const gate = auth.loading ? null : auth.recovering ? <NewPasswordScreen /> : !auth.session ? <AuthScreen /> : undefined;
  if (gate !== undefined) {
    return (
      <SafeAreaView style={[st.safe, { backgroundColor: palettes.rose.background }]} edges={['top']}>
        {gate}
      </SafeAreaView>
    );
  }
  const user = auth.session!.user;
  return (
    <StoreProvider key={user.id} userId={user.id}>
      <Main accountEmail={user.email} />
    </StoreProvider>
  );
}

const useStyles = createStyles((colors) => ({
  safe: { flex: 1 },
  content: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    ...shadow(colors).lg,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2, minHeight: 48, justifyContent: 'center' },
  tabIconWrap: { width: 36, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: colors.primary },
  label: { fontSize: type.caption, color: colors.muted, marginTop: 3, fontFamily: fonts.bodyMedium },
  active: { color: colors.primaryDark, fontFamily: fonts.bodyBold },
}));
