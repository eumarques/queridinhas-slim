import type { AuthError, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Eye, EyeSlash } from 'phosphor-react-native';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, Card, Field, LogoMark, Notice, Title } from './components';
import { authRedirectUrl, isSupabaseConfigured, supabase } from './supabase';
import { createStyles, fonts, spacing, type, useColors } from './theme';

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

type AuthState = {
  /** false = Supabase não configurado: o app funciona só neste aparelho, sem login. */
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  /** A pessoa abriu o link de recuperação e precisa definir uma nova senha. */
  recovering: boolean;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  enabled: false,
  loading: false,
  session: null,
  recovering: false,
  finishRecovery: () => {},
  signOut: async () => {},
});
export const useAuth = () => useContext(AuthContext);

/** Lê access_token/refresh_token do link de e-mail (celular: queridinhasslim://auth#access_token=...). */
async function handleAuthLink(url: string | null, onRecovery: () => void) {
  if (!url || !supabase) return;
  const fragment = url.split('#')[1] ?? url.split('?')[1];
  if (!fragment) return;
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (!error && params.get('type') === 'recovery') onRecovery();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    // Links de e-mail no celular (no navegador o próprio Supabase lê a URL)
    let linkSub: { remove: () => void } | undefined;
    if (Platform.OS !== 'web') {
      Linking.getInitialURL().then((u) => handleAuthLink(u, () => setRecovering(true)));
      linkSub = Linking.addEventListener('url', ({ url }) => handleAuthLink(url, () => setRecovering(true)));
    }
    return () => {
      sub.subscription.unsubscribe();
      linkSub?.remove();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ enabled: isSupabaseConfigured, loading, session, recovering, finishRecovery: () => setRecovering(false), signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Validação e mensagens
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordProblem = (pw: string) =>
  pw.length < 8 ? 'Use pelo menos 8 caracteres.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Use letras e números.' : '';

/** Traduz os erros do Supabase para mensagens claras (sem revelar se o e-mail existe). */
export function authMessage(e: AuthError | Error | null | undefined) {
  if (!e) return '';
  const msg = (e.message || '').toLowerCase();
  const status = (e as AuthError).status;
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.';
  if (msg.includes('should be different')) return 'A nova senha precisa ser diferente da anterior.';
  if (msg.includes('weak') || msg.includes('password should')) return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Sem conexão com a internet. Verifique e tente novamente.';
  return 'Não foi possível concluir agora. Tente novamente em instantes.';
}

function PasswordField({ label, value, onChange, error, placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  const colors = useColors();
  const s = useStyles();
  const [show, setShow] = useState(false);
  return (
    <View>
      <Field label={label} value={value} onChangeText={onChange} secureTextEntry={!show} autoCapitalize="none" autoComplete="password" placeholder={placeholder} error={error} />
      <Pressable onPress={() => setShow(!show)} accessibilityRole="button" accessibilityLabel={show ? 'Ocultar senha' : 'Mostrar senha'} hitSlop={8} style={s.eye}>
        {show ? <EyeSlash size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Telas
// ---------------------------------------------------------------------------

type Mode = 'login' | 'signup' | 'forgot';

export function AuthScreen() {
  const colors = useColors();
  const s = useStyles();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => { setMode(m); setErrors({}); setMsg(null); setPassword(''); setConfirm(''); };

  const submit = async () => {
    if (!supabase) return;
    const e: typeof errors = {};
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) e.email = 'Informe um e-mail válido.';
    if (mode !== 'forgot') {
      if (mode === 'signup') {
        const p = passwordProblem(password);
        if (p) e.password = p;
        if (confirm !== password) e.confirm = 'As senhas não conferem.';
      } else if (!password) e.password = 'Informe sua senha.';
    }
    setErrors(e);
    setMsg(null);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) setMsg({ text: authMessage(error), ok: false });
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: authRedirectUrl() } });
        if (error) setMsg({ text: authMessage(error), ok: false });
        else if (!data.session) setMsg({ text: `Conta criada! Enviamos um link de confirmação para ${mail}. Confirme e depois entre com sua senha.`, ok: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: authRedirectUrl() });
        // Mensagem neutra: não revela se o e-mail tem conta
        setMsg(error && (error.status === 429 || /network|fetch/i.test(error.message))
          ? { text: authMessage(error), ok: false }
          : { text: `Se houver uma conta com ${mail}, você receberá um link para criar uma nova senha. Confira também a caixa de spam.`, ok: true });
      }
    } catch (err) {
      setMsg({ text: authMessage(err as Error), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, [string, string]> = {
    login: ['Entrar', 'Acesse sua conta para ver seus registros em qualquer aparelho.'],
    signup: ['Criar conta', 'Seus dados ficam salvos com segurança na sua conta.'],
    forgot: ['Recuperar senha', 'Informe seu e-mail e enviaremos um link para criar uma nova senha.'],
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.logo}><LogoMark size={64} /></View>
      <Text style={s.brand}>Queridinhas Slim</Text>
      <View>{/* evita que o título estique e empurre o formulário */}
        <Title subtitle={titles[mode][1]}>{titles[mode][0]}</Title>
      </View>
      <Card>
        <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="voce@email.com" error={errors.email} />
        {mode !== 'forgot' && (
          <PasswordField label="Senha" value={password} onChange={setPassword} error={errors.password} placeholder={mode === 'signup' ? 'Mínimo 8 caracteres, letras e números' : undefined} />
        )}
        {mode === 'signup' && <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} error={errors.confirm} />}
        {msg && <Notice tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Notice>}
        <ActionButton label={mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'} onPress={submit} loading={busy} />
        {mode === 'login' && (
          <Pressable onPress={() => go('forgot')} accessibilityRole="button" style={s.linkBtn}>
            <Text style={s.link}>Esqueci minha senha</Text>
          </Pressable>
        )}
      </Card>
      <Pressable onPress={() => go(mode === 'login' ? 'signup' : 'login')} accessibilityRole="button" style={s.switch}>
        <Text style={s.switchText}>
          {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>{mode === 'login' ? 'Criar conta' : 'Entrar'}</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/** Definir nova senha (depois de abrir o link de recuperação). */
export function NewPasswordScreen() {
  const { finishRecovery } = useAuth();
  const s = useStyles();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!supabase) return;
    const e: typeof errors = {};
    const p = passwordProblem(password);
    if (p) e.password = p;
    if (confirm !== password) e.confirm = 'As senhas não conferem.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ text: authMessage(error), ok: false });
    setDone(true);
    setMsg({ text: 'Senha alterada com sucesso!', ok: true });
  };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <View style={s.logo}><LogoMark size={64} /></View>
      <View>
        <Title subtitle="Crie uma nova senha para sua conta.">Nova senha</Title>
      </View>
      <Card>
        {!done && (
          <>
            <PasswordField label="Nova senha" value={password} onChange={setPassword} error={errors.password} placeholder="Mínimo 8 caracteres, letras e números" />
            <PasswordField label="Confirmar nova senha" value={confirm} onChange={setConfirm} error={errors.confirm} />
          </>
        )}
        {msg && <Notice tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Notice>}
        {done ? <ActionButton label="Continuar" onPress={finishRecovery} /> : <ActionButton label="Salvar nova senha" onPress={submit} loading={busy} />}
      </Card>
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingTop: spacing.xxxl, paddingBottom: 80, backgroundColor: colors.background, minHeight: '100%', maxWidth: 520, width: '100%', alignSelf: 'center' },
  logo: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  brand: { textAlign: 'center', fontFamily: fonts.headingBold, fontSize: type.title, color: colors.primaryDark, marginTop: spacing.sm, marginBottom: spacing.xl },
  eye: { position: 'absolute', right: 12, top: 34, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  linkBtn: { alignSelf: 'center', marginTop: spacing.md, minHeight: 36, justifyContent: 'center' },
  link: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.body, textDecorationLine: 'underline' },
  switch: { alignSelf: 'center', padding: spacing.md, minHeight: 44 },
  switchText: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.body },
}));
