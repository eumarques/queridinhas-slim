import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Chaves públicas do projeto (anon key é feita para ficar no app; a segurança vem do RLS).
// Configure em .env (veja SUPABASE.md). Sem elas, o app funciona só neste aparelho.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = !!url && !!anonKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No navegador, o link de recuperação de senha traz a sessão na própria URL.
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'implicit',
      },
    })
  : null;

/** Para onde o Supabase manda a pessoa ao clicar nos links de e-mail (confirmação e recuperação). */
export const authRedirectUrl = () => (Platform.OS === 'web' ? window.location.origin : Linking.createURL('auth'));

export const PHOTO_BUCKET = 'progress-photos';
