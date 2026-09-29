import { Info, Minus, Plus } from 'phosphor-react-native';
import React, { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { createStyles, fonts, radius, shadow, spacing, type, useColors } from './theme';

export function Card({ children, style, tone = 'default' }: { children: ReactNode; style?: object; tone?: 'default' | 'primary' | 'highlight' }) {
  const styles = useStyles();
  return <View style={[styles.card, tone === 'primary' && styles.cardPrimary, tone === 'highlight' && styles.cardHighlight, style]}>{children}</View>;
}

export function Title({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.section}>{children}</Text>;
}

export function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primaryDark : colors.onPrimary} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, secondary && styles.secondaryText, icon ? { marginLeft: spacing.sm } : null]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconBadge({ icon, tone = 'primary', size = 40 }: { icon: ReactNode; tone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'; size?: number }) {
  const styles = useStyles();
  const colors = useColors();
  const bg = {
    primary: colors.blush,
    accent: colors.blush,
    success: colors.successBg,
    warning: colors.warningBg,
    danger: colors.dangerBg,
    info: colors.infoBg,
  }[tone];
  return <View style={[styles.iconBadge, { backgroundColor: bg, width: size, height: size, borderRadius: size / 2 }]}>{icon}</View>;
}

export function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.metric} accessibilityRole="text" accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color, track, height = 8 }: { value: number; color?: string; track?: string; height?: number }) {
  const colors = useColors();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? colors.blush, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color ?? colors.primary }} />
    </View>
  );
}

export function Stepper({ value, onMinus, onPlus, label }: { value: string; onMinus: () => void; onPlus: () => void; label: string }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} accessibilityRole="button" accessibilityLabel={`Diminuir ${label}`} hitSlop={6} style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}>
        <Minus size={18} weight="bold" color={colors.primaryDark} />
      </Pressable>
      <Text style={styles.stepValue} accessibilityLabel={`${label}: ${value}`}>{value}</Text>
      <Pressable onPress={onPlus} accessibilityRole="button" accessibilityLabel={`Aumentar ${label}`} hitSlop={6} style={({ pressed }) => [styles.stepBtn, styles.stepBtnPrimary, pressed && { opacity: 0.7 }]}>
        <Plus size={18} weight="bold" color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: (color: string) => ReactNode }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      style={({ pressed }) => [styles.chip, active && styles.chipOn, pressed && { opacity: 0.8 }]}
    >
      {icon?.(active ? colors.onPrimary : colors.primaryDark)}
      <Text style={[styles.chipLabel, active && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  const styles = useStyles();
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[styles.input, focused && styles.inputFocus, !!error && styles.inputError, style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/** Mensagem de retorno inline (Alert não funciona na versão web). */
export function Notice({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'danger' }) {
  const styles = useStyles();
  return <Text style={[styles.notice, tone === 'danger' && styles.noticeDanger]}>{children}</Text>;
}

/** Gráfico de linha simples (peso). */
export function LineChart({ points, labels, height = 160, format }: { points: number[]; labels: string[]; height?: number; format: (n: number) => string }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const padX = 22;
  const padTop = 24;
  const padBottom = 24;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (points.length === 1 ? width / 2 : padX + (i * (width - padX * 2)) / (points.length - 1));
  const y = (v: number) => padTop + (1 - (v - min) / span) * (height - padTop - padBottom);
  const every = Math.ceil(points.length / 6);
  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={height - padBottom} y2={height - padBottom} stroke={colors.border} strokeWidth={1} />
          <Polyline points={points.map((p, i) => `${x(i)},${y(p)}`).join(' ')} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" />
          {points.map((p, i) => {
            const show = i === points.length - 1 || i % every === 0;
            return (
              <React.Fragment key={i}>
                <Circle cx={x(i)} cy={y(p)} r={i === points.length - 1 ? 5 : 3.5} fill={i === points.length - 1 ? colors.primary : colors.card} stroke={colors.primary} strokeWidth={2} />
                {show && (
                  <>
                    <SvgText x={x(i)} y={y(p) - 10} fontSize={10} fontFamily={fonts.bodyBold} fill={colors.primaryDark} textAnchor="middle">{format(p)}</SvgText>
                    <SvgText x={x(i)} y={height - 8} fontSize={10} fontFamily={fonts.body} fill={colors.muted} textAnchor="middle">{labels[i]}</SvgText>
                  </>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/** Gráfico de barras simples (caminhadas). */
export function BarChart({ values, labels, height = 140, format, highlightLast = true }: { values: number[]; labels: string[]; height?: number; format: (n: number) => string; highlightLast?: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  const max = Math.max(...values, 1);
  const barArea = height - 36;
  return (
    <View style={[styles.bars, { height }]}>
      {values.map((v, i) => {
        const last = highlightLast && i === values.length - 1;
        return (
          <View key={i} style={styles.barCol} accessibilityLabel={`${labels[i]}: ${format(v)}`}>
            <Text style={styles.barValue}>{v > 0 ? format(v) : ''}</Text>
            <View style={[styles.bar, { height: Math.max(4, (v / max) * barArea), backgroundColor: v === 0 ? colors.divider : last ? colors.primary : colors.accent }]} />
            <Text style={[styles.barLabel, last && { color: colors.primaryDark, fontFamily: fonts.bodyBold }]}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Ícone de ajuda: mostra a explicação ao passar o mouse (web) ou ao tocar (celular). */
export function InfoTip({ label, text }: { label: string; text: string }) {
  const styles = useStyles();
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.tipWrap}>
      <Pressable
        onHoverIn={() => setOpen(true)}
        onHoverOut={() => setOpen(false)}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`O que é ${label}?`}
        accessibilityHint={text}
        hitSlop={10}
      >
        <Info size={16} weight="bold" color={open ? colors.primary : colors.muted} />
      </Pressable>
      {open && (
        <View style={styles.tip} pointerEvents="none">
          <Text style={styles.tipText}>{text}</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(colors).sm,
  },
  cardPrimary: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  cardHighlight: { backgroundColor: colors.surface, borderColor: colors.accent },
  titleWrap: { flex: 1, marginBottom: spacing.xl },
  title: { fontSize: type.headingLg, fontFamily: fonts.headingBold, color: colors.primaryDark },
  subtitle: { color: colors.textSecondary, fontSize: type.body, marginTop: spacing.xs, lineHeight: 20, fontFamily: fonts.body },
  section: { fontSize: type.heading, fontFamily: fonts.headingBold, color: colors.primaryDark, marginVertical: spacing.md },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 50,
  },
  secondary: { backgroundColor: colors.blush },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.onPrimary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  secondaryText: { color: colors.primaryDark },
  iconBadge: { alignItems: 'center', justifyContent: 'center' },
  tipWrap: { position: 'relative', justifyContent: 'center' },
  tip: {
    position: 'absolute',
    top: 24,
    left: -12,
    width: 260,
    zIndex: 20,
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    padding: spacing.md,
    ...shadow(colors).md,
  },
  tipText: { color: colors.onDark, fontFamily: fonts.body, fontSize: type.small, lineHeight: 17 },
  metric: {
    flex: 1,
    minWidth: 96,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricIcon: { marginBottom: spacing.xs },
  metricValue: { fontFamily: fonts.headingBold, color: colors.primaryDark, fontSize: type.title },
  metricLabel: { color: colors.textSecondary, fontSize: type.caption, marginTop: 2, textAlign: 'center', fontFamily: fonts.bodyMedium },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  stepBtnPrimary: { backgroundColor: colors.primary },
  stepValue: { minWidth: 64, textAlign: 'center', fontFamily: fonts.headingBold, fontSize: type.heading, color: colors.primaryDark },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.blush, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, minHeight: 40 },
  chipOn: { backgroundColor: colors.primary },
  chipLabel: { color: colors.primaryDark, fontSize: type.small, fontFamily: fonts.bodySemiBold },
  chipLabelOn: { color: colors.onPrimary },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: type.small, color: colors.textSecondary, fontFamily: fonts.bodyBold, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontFamily: fonts.body, fontSize: type.bodyLg, minHeight: 48 },
  inputFocus: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: type.small, fontFamily: fonts.bodySemiBold, marginTop: spacing.xs },
  notice: { color: colors.success, backgroundColor: colors.successBg, borderRadius: radius.sm, padding: spacing.md, fontFamily: fonts.bodySemiBold, fontSize: type.body, marginTop: spacing.sm, overflow: 'hidden' },
  noticeDanger: { color: colors.danger, backgroundColor: colors.dangerBg },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xs, marginTop: spacing.md },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '70%', maxWidth: 34, borderRadius: radius.sm / 2 },
  barValue: { fontSize: 10, color: colors.primaryDark, fontFamily: fonts.bodyBold, marginBottom: 3 },
  barLabel: { fontSize: type.caption, color: colors.muted, fontFamily: fonts.bodyMedium, marginTop: spacing.xs },
}));

/** Símbolo do logo (anel + S duplo + estrela), nas cores da paleta ativa. */
export function LogoMark({ size = 48, dark, light }: { size?: number; dark?: string; light?: string }) {
  const colors = useColors();
  const d = dark ?? colors.primaryDark;
  const l = light ?? colors.accent;
  return (
    <Svg width={size} height={size} viewBox="40 55 640 640" accessibilityLabel="Queridinhas Slim">
      <Path fill={d} fillRule="evenodd" d="M58 368 A302 302 0 1 0 662 368 A302 302 0 1 0 58 368 Z M90 370 A282 282 0 1 1 654 370 A282 282 0 1 1 90 370 Z" />
      <Path fill={l} d="M653.64 289.32 A304 304 0 0 1 281.32 661.64 A332 332 0 0 0 653.64 289.32 Z" />
      <Path fill={l} d="M330 128 C255 145 182 215 186 295 C190 370 262 410 335 445 C395 474 440 500 438 545 C437 572 426 590 408 604 C455 588 480 555 478 518 C475 462 420 428 360 400 C290 368 236 338 236 282 C236 215 275 158 330 128 Z" />
      <Path fill={d} d="M388 133 C318 145 262 195 262 258 C262 322 322 352 395 388 C460 420 505 455 505 505 C505 548 482 585 445 612 C510 590 548 548 548 492 C548 425 490 388 425 355 C365 325 318 298 318 245 C318 195 345 155 388 133 Z" />
      <Path fill={d} d="M502 168 Q508 225 562 233 Q508 241 502 300 Q496 241 440 233 Q496 225 502 168 Z" />
    </Svg>
  );
}
