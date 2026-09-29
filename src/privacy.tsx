import { CaretLeft, Check, LockKey, ShieldCheck, Trash } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, Card, IconBadge, Notice, Title } from './components';
import { useStore } from './store';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

export const PRIVACY_VERSION = '1.0';

// ATENÇÃO: modelo inicial. Antes de publicar, preencha os campos entre colchetes
// e peça a revisão de um(a) advogado(a) especialista em LGPD.
const sections: { title: string; text: string }[] = [
  {
    title: 'Quem é responsável pelos seus dados',
    text: '[NOME DA EMPRESA], inscrita no CNPJ [NÚMERO], é a controladora dos dados tratados no aplicativo Queridinhas Slim. Contato do encarregado de dados: [E-MAIL DE CONTATO].',
  },
  {
    title: 'Quais dados coletamos',
    text:
      'Dados de cadastro: nome, idade, sexo, altura, telefone e e-mail. ' +
      'Dados de saúde (considerados sensíveis pela LGPD): peso e suas medições, IMC, consumo de água, refeições, caminhadas, check-ins diários, humor, observações e aplicações registradas. ' +
      'Preferências alimentares: alimentos preferidos e a evitar, restrições, intolerâncias e nível de atividade física.',
  },
  {
    title: 'Para que usamos',
    text:
      'Somente para o funcionamento do aplicativo: calcular suas metas de água, calorias e proteína, montar o cardápio semanal, mostrar sua evolução, gerar o resumo semanal e enviar os lembretes que você ativar. ' +
      'Não vendemos seus dados e não os usamos para publicidade. O tratamento dos dados de saúde se baseia no seu consentimento específico e destacado (LGPD, art. 11, I).',
  },
  {
    title: 'Onde seus dados ficam',
    text:
      'Nesta versão, todos os dados ficam apenas neste aparelho e não são enviados para servidores. No celular, telefone e e-mail são guardados no armazenamento criptografado do sistema. ' +
      'Ao usar "Compartilhar minha evolução", você escolhe onde publicar o card, que não inclui nome, peso atual nem contatos.',
  },
  {
    title: 'Seus direitos',
    text:
      'Você pode, a qualquer momento: acessar seus dados (tela Perfil), corrigi-los (Editar dados), excluí-los e revogar o consentimento (Apagar meus dados, na tela Privacidade). ' +
      'Também pode pedir informações sobre o tratamento pelo contato acima.',
  },
  {
    title: 'Por quanto tempo guardamos',
    text: 'Enquanto você usar o aplicativo. Ao apagar seus dados ou desinstalar o app, as informações armazenadas neste aparelho são removidas.',
  },
  {
    title: 'Menores de idade',
    text: 'Menores de 18 anos devem usar o aplicativo com o conhecimento e o acompanhamento de pais ou responsáveis.',
  },
  {
    title: 'Aviso de saúde',
    text: 'O aplicativo tem caráter educativo e não substitui consulta, diagnóstico ou orientação de profissionais de saúde.',
  },
];

export const CONSENT_TEXT =
  'Li a Política de Privacidade e autorizo o uso dos meus dados, inclusive dados de saúde (peso, alimentação, hidratação e atividade física), para acompanhar minha evolução e personalizar metas, cardápio e lembretes.';

export function PrivacyPolicy() {
  const s = useStyles();
  return (
    <View>
      <Text style={s.small}>Versão {PRIVACY_VERSION}</Text>
      {sections.map((sec) => (
        <View key={sec.title} style={{ marginTop: spacing.md }}>
          <Text style={s.secTitle}>{sec.title}</Text>
          <Text style={s.body}>{sec.text}</Text>
        </View>
      ))}
    </View>
  );
}

/** Caixa de consentimento com a política expansível logo abaixo. */
export function ConsentField({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  const colors = useColors();
  const s = useStyles();
  const [showPolicy, setShowPolicy] = useState(false);
  return (
    <View style={s.consentWrap}>
      <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel="Consentimento de uso dos dados" style={s.consentRow}>
        <View style={[s.box, checked && s.boxOn, !!error && !checked && { borderColor: colors.danger }]}>
          {checked && <Check size={14} weight="bold" color={colors.onPrimary} />}
        </View>
        <Text style={s.consentText}>{CONSENT_TEXT}</Text>
      </Pressable>
      {error && !checked ? <Text style={s.error}>{error}</Text> : null}
      <Pressable onPress={() => setShowPolicy(!showPolicy)} accessibilityRole="button" style={s.policyToggle}>
        <Text style={s.link}>{showPolicy ? 'Ocultar Política de Privacidade' : 'Ler a Política de Privacidade'}</Text>
      </Pressable>
      {showPolicy && <View style={s.policyBox}><PrivacyPolicy /></View>}
    </View>
  );
}

/** Para quem se cadastrou antes do consentimento existir: aceitar para continuar ou apagar os dados. */
export function ConsentRequiredScreen() {
  const { giveConsent, resetAll } = useStore();
  const colors = useColors();
  const s = useStyles();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><ShieldCheck size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle="Atualizamos a forma de cuidar dos seus dados. Para continuar, precisamos do seu consentimento.">Sua privacidade</Title>
      </View>
      <Card>
        <ConsentField checked={checked} onChange={(v) => { setChecked(v); setError(''); }} error={error} />
        <ActionButton label="Aceitar e continuar" onPress={() => (checked ? giveConsent(PRIVACY_VERSION) : setError('Marque a caixa para continuar.'))} />
      </Card>
      <Pressable onPress={() => (confirmDelete ? resetAll() : setConfirmDelete(true))} accessibilityRole="button" style={s.reset}>
        <Text style={s.resetText}>{confirmDelete ? 'Toque de novo para apagar todos os dados' : 'Não aceito — apagar meus dados deste aparelho'}</Text>
      </Pressable>
    </ScrollView>
  );
}

export function PrivacyScreen({ close }: { close: () => void }) {
  const { profile, resetAll } = useStore();
  const colors = useColors();
  const s = useStyles();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const consentAt = profile?.consent ? new Date(profile.consent.at) : null;

  return (
    <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={s.back}>
        <CaretLeft size={16} weight="bold" color={colors.primary} />
        <Text style={s.backText}>Voltar</Text>
      </Pressable>
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><ShieldCheck size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle="Como seus dados são guardados e usados, e como exercer seus direitos.">Privacidade e segurança</Title>
      </View>

      <Card>
        <View style={s.headRow}><IconBadge icon={<LockKey size={18} weight="fill" color={colors.primaryDark} />} /><Text style={s.cardTitle}>Seus dados</Text></View>
        <Text style={s.body}>
          Tudo fica salvo apenas neste aparelho.{' '}
          {Platform.OS === 'web'
            ? 'No navegador, os dados ficam no armazenamento local: evite usar o app em computadores compartilhados.'
            : 'Telefone e e-mail ficam no armazenamento criptografado do celular.'}
        </Text>
        {consentAt && (
          <Text style={s.small}>
            Consentimento dado em {consentAt.toLocaleDateString('pt-BR')} às {consentAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (política versão {profile!.consent!.version}).
          </Text>
        )}
      </Card>

      <Card>
        <Text style={s.cardTitle}>Política de Privacidade</Text>
        <PrivacyPolicy />
      </Card>

      <Card style={{ borderColor: colors.danger }}>
        <View style={s.headRow}><IconBadge tone="danger" icon={<Trash size={18} weight="fill" color={colors.danger} />} /><Text style={s.cardTitle}>Apagar meus dados</Text></View>
        <Text style={s.body}>Remove perfil, registros, preferências e lembretes deste aparelho e revoga seu consentimento. Não é possível desfazer.</Text>
        {confirmDelete && <Notice tone="danger">Tem certeza? Toque de novo para apagar tudo.</Notice>}
        <Pressable onPress={() => (confirmDelete ? resetAll() : setConfirmDelete(true))} accessibilityRole="button" style={s.deleteBtn}>
          <Text style={s.deleteText}>{confirmDelete ? 'Sim, apagar tudo' : 'Apagar meus dados'}</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md, minHeight: 44 },
  backText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  secTitle: { fontSize: type.body, fontFamily: fonts.bodyBold, color: colors.text, marginBottom: 2 },
  body: { color: colors.textSecondary, lineHeight: 21, fontFamily: fonts.body, fontSize: type.body },
  small: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.small, marginTop: spacing.sm, lineHeight: 17 },
  consentWrap: { marginTop: spacing.sm, marginBottom: spacing.sm },
  consentRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: type.body, lineHeight: 20 },
  error: { color: colors.danger, fontSize: type.small, fontFamily: fonts.bodySemiBold, marginTop: spacing.xs, marginLeft: 36 },
  policyToggle: { marginTop: spacing.sm, marginLeft: 36, minHeight: 32, justifyContent: 'center' },
  link: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.small, textDecorationLine: 'underline' },
  policyBox: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.xs },
  reset: { alignSelf: 'center', padding: spacing.md, borderRadius: radius.sm },
  resetText: { color: colors.danger, fontFamily: fonts.bodySemiBold, fontSize: type.small },
  deleteBtn: { marginTop: spacing.md, minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.danger, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
}));
