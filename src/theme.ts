import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';

const semantic = {
  onPrimary: '#FFFFFF',
  onDark: '#FFFFFF',
  success: '#3F8F63',
  successBg: '#E7F5EC',
  warning: '#B4700E',
  warningBg: '#FBF0DE',
  danger: '#C6394F',
  dangerBg: '#FBE7EA',
  info: '#3E6FA8',
  infoBg: '#E8F0FA',
};

// Identidade feminina — vinho/rosé do logo Queridinhas Slim
const rose = {
  ...semantic,
  primary: '#911839',
  primaryDark: '#5E1025',
  primaryLight: '#C28092',
  accent: '#D98CA5',
  accentDark: '#B23A5C',
  blush: '#F6DFE5',
  onAccent: '#5E1025',
  background: '#FBF6F1',
  surface: '#FFFBF7',
  card: '#FFFFFF',
  border: '#EFE1E1',
  divider: '#F2E6E6',
  overlay: 'rgba(43, 12, 21, 0.45)',
  text: '#2B1C21',
  textSecondary: '#645257',
  muted: '#8B7C80',
  shadow: '#5E1025',
};

// Identidade azul — usada quando o sexo informado não é feminino
const blue: Palette = {
  ...semantic,
  primary: '#1F5A9E',
  primaryDark: '#133A69',
  primaryLight: '#7FA3CF',
  accent: '#8DB3E0',
  accentDark: '#2F6DB5',
  blush: '#E1EBF7',
  onAccent: '#133A69',
  background: '#F3F6FA',
  surface: '#F9FBFE',
  card: '#FFFFFF',
  border: '#DCE5F0',
  divider: '#E6EDF5',
  overlay: 'rgba(12, 24, 43, 0.45)',
  text: '#1B2430',
  textSecondary: '#4E5B6B',
  muted: '#7D8898',
  shadow: '#133A69',
};

export type Palette = typeof rose;
export const palettes = { rose, blue };

export const ThemeContext = createContext<Palette>(rose);
export const useColors = () => useContext(ThemeContext);

/** StyleSheet dependente da paleta ativa; cada paleta é compilada uma única vez. */
export function createStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  fn: (c: Palette) => T & StyleSheet.NamedStyles<any>
) {
  const cache = new Map<Palette, T>();
  return () => {
    const c = useColors();
    let styles = cache.get(c);
    if (!styles) {
      styles = StyleSheet.create(fn(c));
      cache.set(c, styles);
    }
    return styles;
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const fonts = {
  heading: 'Lora_600SemiBold',
  headingBold: 'Lora_700Bold',
  body: 'Raleway_400Regular',
  bodyMedium: 'Raleway_500Medium',
  bodySemiBold: 'Raleway_600SemiBold',
  bodyBold: 'Raleway_700Bold',
};

export const type = {
  caption: 11,
  small: 12,
  body: 14,
  bodyLg: 15,
  title: 17,
  heading: 20,
  headingLg: 24,
  display: 30,
};

export const shadow = (c: Palette) => ({
  sm: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  md: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 4 },
  lg: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 10 },
});

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
