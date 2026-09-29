import { Camera, CaretLeft, ImageSquare, PencilSimple, Ruler, Trash, X } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { ActionButton, Card, Chip, Field, Notice, SectionLabel, Title } from './components';
import { deletePhoto, PhotoView, pickPhoto, storePhoto } from './photos';
import { BodyCheck, BODY_CHECK_INTERVAL_DAYS, dateKey, daysBetween, fmtDate, fmtNum, MeasureId, nextBodyCheckDate, parseDateBR, parseNum, Pose, useStore, weekday } from './store';
import { createStyles, fonts, radius, spacing, type, useColors } from './theme';

export const measures: { id: MeasureId; label: string; how: string; y: number }[] = [
  { id: 'bust', label: 'Busto / peito', how: 'Na altura dos mamilos, com a fita passando pelas costas na mesma altura, sem apertar.', y: 88 },
  { id: 'arm', label: 'Braço', how: 'No meio do braço (entre o ombro e o cotovelo), com o braço relaxado ao lado do corpo. Meça sempre o mesmo lado.', y: 100 },
  { id: 'waist', label: 'Cintura', how: 'No ponto mais estreito do tronco, entre a última costela e o osso do quadril (geralmente um pouco acima do umbigo).', y: 122 },
  { id: 'abdomen', label: 'Abdômen', how: 'Na linha do umbigo, com a barriga relaxada, depois de soltar o ar normalmente.', y: 140 },
  { id: 'hip', label: 'Quadril', how: 'Na parte mais larga do bumbum, com os pés juntos.', y: 165 },
  { id: 'thigh', label: 'Coxa', how: 'Na parte mais grossa da coxa, logo abaixo do bumbum. Meça sempre o mesmo lado.', y: 196 },
];
export const poses: { id: Pose; label: string; hint: string }[] = [
  { id: 'front', label: 'Frente', hint: 'De frente, braços levemente afastados do corpo.' },
  { id: 'side', label: 'Lado', hint: 'De perfil (lado direito), braços à frente do corpo.' },
  { id: 'back', label: 'Costas', hint: 'De costas, braços levemente afastados.' },
];
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const maskDate = (t: string) => {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};
const cm = (n?: number) => (n === undefined ? '—' : `${fmtNum(n)} cm`);
const delta = (a?: number, b?: number) => (a === undefined || b === undefined ? '' : `${b - a > 0 ? '+' : b - a < 0 ? '−' : ''}${fmtNum(Math.abs(b - a))}`);

/** Silhueta simples com as linhas de medida numeradas. */
function BodyDiagram() {
  const colors = useColors();
  return (
    <Svg width={170} height={250} viewBox="0 0 170 250" accessibilityLabel="Onde medir">
      <Circle cx={85} cy={30} r={17} fill={colors.blush} stroke={colors.primaryLight} strokeWidth={1.5} />
      <Path
        d="M72 46 L98 46 C112 50 124 56 128 70 L140 128 C142 136 136 138 133 131 L120 86 L117 118 C116 128 122 146 126 166 C130 186 124 205 118 240 L96 240 L88 190 L82 190 L74 240 L52 240 C46 205 40 186 44 166 C48 146 54 128 53 118 L50 86 L37 131 C34 138 28 136 30 128 L42 70 C46 56 58 50 72 46 Z"
        fill={colors.blush}
        stroke={colors.primaryLight}
        strokeWidth={1.5}
      />
      {measures.map((m, i) => {
        const x1 = m.id === 'arm' ? 118 : m.id === 'thigh' ? 88 : 46;
        const x2 = m.id === 'arm' ? 136 : m.id === 'thigh' ? 124 : 124;
        return (
          <React.Fragment key={m.id}>
            <Line x1={x1} x2={x2} y1={m.y} y2={m.y} stroke={colors.primary} strokeWidth={2} strokeDasharray="4 3" />
            <Circle cx={m.id === 'arm' ? 152 : 12} cy={m.y} r={9} fill={colors.primary} />
            <SvgText x={m.id === 'arm' ? 152 : 12} y={m.y + 4} fontSize={11} fontWeight="bold" fill={colors.onPrimary} textAnchor="middle">{i + 1}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function Tutorial() {
  const colors = useColors();
  const s = useStyles();
  const rules = [
    'Use fita métrica flexível (de costura).',
    'Meça sempre no mesmo horário: de manhã, em jejum, depois de ir ao banheiro.',
    'Sem roupa ou com roupa bem fina, em pé, relaxada e com os pés juntos.',
    'Fita reta, paralela ao chão, justa na pele mas sem apertar.',
    'Meça duas vezes cada ponto e anote a média.',
    `Repita a cada ${BODY_CHECK_INTERVAL_DAYS} dias para acompanhar a evolução.`,
  ];
  const photoTips = [
    'Mesmo lugar, mesma luz e mesmo fundo liso em todas as avaliações (luz natural, de frente para a janela).',
    'Roupa justa e sempre a mesma (top e shorts ou legging).',
    'Celular na vertical, na altura do umbigo, a cerca de 2 metros. Use o timer ou peça ajuda.',
    'Postura natural: não encolha a barriga nem estufe o peito.',
    'Três fotos: frente, lado (perfil direito) e costas.',
  ];
  return (
    <>
      <Card>
        <View style={s.head}><Ruler size={20} weight="bold" color={colors.primaryDark} /><Text style={s.cardTitle}>Como medir</Text></View>
        {rules.map((r) => <Text key={r} style={s.bullet}>•  {r}</Text>)}
      </Card>
      <Card>
        <Text style={s.cardTitle}>Onde medir</Text>
        <View style={s.diagramRow}>
          <BodyDiagram />
        </View>
        {measures.map((m, i) => (
          <View key={m.id} style={s.howRow}>
            <View style={s.howNum}><Text style={s.howNumText}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.howTitle}>{m.label}</Text>
              <Text style={s.small}>{m.how}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Card>
        <View style={s.head}><Camera size={20} weight="bold" color={colors.primaryDark} /><Text style={s.cardTitle}>Como tirar as fotos</Text></View>
        {photoTips.map((r) => <Text key={r} style={s.bullet}>•  {r}</Text>)}
        <Text style={s.small}>Suas fotos são privadas: só você tem acesso a elas.</Text>
      </Card>
    </>
  );
}

function CheckForm({ initial, onDone }: { initial?: BodyCheck; onDone: (msg: string) => void }) {
  const { saveBodyCheck, userId, cloud } = useStore();
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const [id] = useState(initial?.id ?? newId());
  const [date, setDate] = useState(fmtDate(initial?.date ?? today));
  const [values, setValues] = useState<Partial<Record<MeasureId, string>>>(
    Object.fromEntries(Object.entries(initial?.measures ?? {}).map(([k, v]) => [k, fmtNum(v as number)]))
  );
  const [photos, setPhotos] = useState<Partial<Record<Pose, string>>>(initial?.photos ?? {});
  const [note, setNote] = useState(initial?.note ?? '');
  const [busy, setBusy] = useState<Pose | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const addPhoto = async (pose: Pose, source: 'camera' | 'library') => {
    setMsg(null);
    setBusy(pose);
    try {
      const res = await pickPhoto(source);
      if (!res) return;
      if ('error' in res) return setMsg(res.error);
      const ref = await storePhoto(res.base64, `${id}-${pose}-${Date.now().toString(36)}`, cloud ? userId : undefined);
      if (photos[pose] && photos[pose] !== initial?.photos[pose]) deletePhoto(photos[pose]!).catch(() => {});
      setPhotos((p) => ({ ...p, [pose]: ref }));
    } catch (e) {
      console.warn('Falha ao salvar foto', e);
      setMsg('Não foi possível salvar a foto. Verifique a internet e tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  const removePhoto = (pose: Pose) => {
    const ref = photos[pose];
    if (ref && ref !== initial?.photos[pose]) deletePhoto(ref).catch(() => {});
    setPhotos((p) => ({ ...p, [pose]: undefined }));
  };

  const save = () => {
    const k = parseDateBR(date);
    if (!k || k > today) return setMsg('Informe uma data válida (dd/mm/aaaa), sem datas futuras.');
    const parsed: Partial<Record<MeasureId, number>> = {};
    for (const m of measures) {
      const raw = values[m.id]?.trim();
      if (!raw) continue;
      const n = parseNum(raw);
      if (!(n >= 15 && n <= 250)) return setMsg(`${m.label}: informe um valor entre 15 e 250 cm.`);
      parsed[m.id] = Math.round(n * 10) / 10;
    }
    const cleanPhotos = Object.fromEntries(Object.entries(photos).filter(([, v]) => !!v)) as Partial<Record<Pose, string>>;
    if (!Object.keys(parsed).length && !Object.keys(cleanPhotos).length) return setMsg('Adicione pelo menos uma medida ou uma foto.');
    // fotos trocadas na edição: apaga as antigas
    if (initial) for (const p of poses) if (initial.photos[p.id] && initial.photos[p.id] !== cleanPhotos[p.id]) deletePhoto(initial.photos[p.id]!).catch(() => {});
    saveBodyCheck({ id, date: k, measures: parsed, photos: cleanPhotos, note: note.trim() });
    onDone(initial ? 'Avaliação atualizada.' : 'Avaliação salva! Nos vemos daqui a 15 dias.');
  };

  return (
    <Card>
      <Text style={s.cardTitle}>{initial ? 'Editar avaliação' : 'Nova avaliação'}</Text>
      <View style={{ height: spacing.md }} />
      <Field label="Data" value={date} onChangeText={(t) => setDate(maskDate(t))} keyboardType="number-pad" placeholder="dd/mm/aaaa" />
      <Text style={s.label}>Fotos</Text>
      <View style={s.photoRow}>
        {poses.map((p) => (
          <View key={p.id} style={s.photoSlot}>
            {photos[p.id] ? (
              <View>
                <PhotoView refUri={photos[p.id]!} style={s.photo} label={`Foto ${p.label}`} />
                <Pressable onPress={() => removePhoto(p.id)} accessibilityRole="button" accessibilityLabel={`Remover foto ${p.label}`} style={s.photoRemove}>
                  <X size={14} weight="bold" color={colors.onPrimary} />
                </Pressable>
              </View>
            ) : (
              <View style={[s.photo, s.photoEmpty]}>
                {busy === p.id ? <Text style={s.small}>Enviando...</Text> : (
                  <>
                    {Platform.OS !== 'web' && (
                      <Pressable onPress={() => addPhoto(p.id, 'camera')} accessibilityRole="button" accessibilityLabel={`Tirar foto ${p.label}`} style={s.photoBtn}>
                        <Camera size={20} color={colors.primary} />
                      </Pressable>
                    )}
                    <Pressable onPress={() => addPhoto(p.id, 'library')} accessibilityRole="button" accessibilityLabel={`Escolher foto ${p.label}`} style={s.photoBtn}>
                      <ImageSquare size={20} color={colors.primary} />
                    </Pressable>
                  </>
                )}
              </View>
            )}
            <Text style={s.photoLabel}>{p.label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.label}>Medidas (cm)</Text>
      <View style={s.measureGrid}>
        {measures.map((m) => (
          <View key={m.id} style={s.measureCell}>
            <Field label={m.label} value={values[m.id] ?? ''} onChangeText={(t) => setValues({ ...values, [m.id]: t.replace(/[^\d.,]/g, '').slice(0, 5) })} keyboardType="decimal-pad" placeholder="cm" />
          </View>
        ))}
      </View>
      <Field label="Observações" value={note} onChangeText={setNote} placeholder="Ex.: como está se sentindo com o corpo" />
      {msg && <Notice tone="danger">{msg}</Notice>}
      <ActionButton label={initial ? 'Salvar alterações' : 'Salvar avaliação'} onPress={save} disabled={!!busy} />
    </Card>
  );
}

export function BodyScreen({ close }: { close: () => void }) {
  const { bodyChecks, removeBodyCheck } = useStore();
  const colors = useColors();
  const s = useStyles();
  const today = dateKey();
  const [tab, setTab] = useState<'avaliacoes' | 'tutorial'>(bodyChecks.length ? 'avaliacoes' : 'tutorial');
  const [form, setForm] = useState<{ open: boolean; edit?: BodyCheck }>({ open: false });
  const [notice, setNotice] = useState<string | null>(null);
  const [pose, setPose] = useState<Pose>('front');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const next = nextBodyCheckDate(bodyChecks);
  const daysLeft = next ? daysBetween(today, next) : undefined;
  const first = bodyChecks[0];
  const last = bodyChecks[bodyChecks.length - 1];
  const history = [...bodyChecks].reverse();

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={s.back}>
        <CaretLeft size={16} weight="bold" color={colors.primary} />
        <Text style={s.backText}>Voltar</Text>
      </Pressable>
      <View style={s.titleRow}>
        <View style={{ marginTop: 3 }}><Ruler size={22} weight="bold" color={colors.primaryDark} /></View>
        <Title subtitle={`Fotos e medidas a cada ${BODY_CHECK_INTERVAL_DAYS} dias mostram mudanças que a balança não vê.`}>Fotos e medidas</Title>
      </View>

      <View style={s.segment}>
        {(['avaliacoes', 'tutorial'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[s.segBtn, tab === t && s.segBtnOn]}>
            <Text style={[s.segText, tab === t && s.segTextOn]}>{t === 'avaliacoes' ? 'Minhas avaliações' : 'Como medir e fotografar'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'tutorial' ? (
        <>
          <Tutorial />
          <ActionButton label="Fazer minha avaliação" onPress={() => { setTab('avaliacoes'); setForm({ open: true }); }} />
        </>
      ) : (
        <>
          <Card tone="primary">
            <Text style={s.eyebrow}>PRÓXIMA AVALIAÇÃO</Text>
            <Text style={s.heroText}>
              {daysLeft === undefined ? 'Faça sua primeira avaliação hoje!' : daysLeft > 0 ? `Em ${daysLeft} dia${daysLeft === 1 ? '' : 's'} • ${fmtDate(next!)}` : 'Chegou o dia da sua avaliação!'}
            </Text>
            {!form.open && <ActionButton label="Nova avaliação" onPress={() => { setForm({ open: true }); setNotice(null); }} secondary />}
          </Card>

          {notice && <Notice>{notice}</Notice>}
          {form.open && (
            <>
              <CheckForm key={form.edit?.id ?? 'new'} initial={form.edit} onDone={(m) => { setForm({ open: false }); setNotice(m); }} />
              <ActionButton label="Cancelar" onPress={() => setForm({ open: false })} secondary />
              <View style={{ height: spacing.lg }} />
            </>
          )}

          {bodyChecks.length >= 2 && (
            <Card>
              <Text style={s.cardTitle}>Antes e depois</Text>
              <Text style={s.small}>{fmtDate(first.date)} → {fmtDate(last.date)} ({daysBetween(first.date, last.date)} dias)</Text>
              <View style={[s.chips, { marginTop: spacing.md }]}>
                {poses.map((p) => <Chip key={p.id} label={p.label} active={pose === p.id} onPress={() => setPose(p.id)} />)}
              </View>
              <View style={s.compare}>
                {[first, last].map((c, i) => (
                  <View key={c.id} style={{ flex: 1 }}>
                    {c.photos[pose] ? <PhotoView refUri={c.photos[pose]!} style={s.comparePhoto} label={`${i ? 'Depois' : 'Antes'}: ${pose}`} /> : <View style={[s.comparePhoto, s.photoEmpty]}><Text style={s.small}>Sem foto</Text></View>}
                    <Text style={s.photoLabel}>{i ? 'Agora' : 'Início'} • {fmtDate(c.date).slice(0, 5)}</Text>
                  </View>
                ))}
              </View>
              {measures.filter((m) => first.measures[m.id] !== undefined || last.measures[m.id] !== undefined).map((m) => {
                const d = delta(first.measures[m.id], last.measures[m.id]);
                return (
                  <View key={m.id} style={s.mRow}>
                    <Text style={s.mLabel}>{m.label}</Text>
                    <Text style={s.mVal}>{cm(first.measures[m.id])} → {cm(last.measures[m.id])}</Text>
                    <Text style={[s.mDelta, d.startsWith('−') ? { color: colors.success } : d.startsWith('+') ? { color: colors.warning } : null]}>{d}</Text>
                  </View>
                );
              })}
            </Card>
          )}

          <SectionLabel>Histórico</SectionLabel>
          {history.length === 0 && <Card><Text style={s.body}>Nenhuma avaliação ainda. Veja o tutorial e faça a primeira!</Text></Card>}
          {history.map((c) => {
            const idx = bodyChecks.findIndex((b) => b.id === c.id);
            const prev = bodyChecks[idx - 1];
            return (
              <Card key={c.id}>
                <View style={s.head}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTitle}>{weekday(c.date)}, {fmtDate(c.date)}</Text>
                    {prev && <Text style={s.small}>{daysBetween(prev.date, c.date)} dias depois da anterior</Text>}
                  </View>
                  <Pressable onPress={() => { setForm({ open: true, edit: c }); setNotice(null); }} accessibilityRole="button" accessibilityLabel={`Editar avaliação de ${fmtDate(c.date)}`} style={s.iconBtn}>
                    <PencilSimple size={17} color={colors.primaryDark} />
                  </Pressable>
                  <Pressable
                    onPress={() => (confirmDelete === c.id ? (removeBodyCheck(c.id), setConfirmDelete(null)) : setConfirmDelete(c.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Excluir avaliação de ${fmtDate(c.date)}`}
                    style={[s.iconBtn, confirmDelete === c.id && { backgroundColor: colors.dangerBg }]}
                  >
                    <Trash size={17} color={confirmDelete === c.id ? colors.danger : colors.muted} />
                  </Pressable>
                </View>
                {confirmDelete === c.id && <Text style={s.danger}>Toque na lixeira de novo para excluir (as fotos também serão apagadas).</Text>}
                {Object.values(c.photos).some(Boolean) && (
                  <View style={[s.photoRow, { marginTop: spacing.sm }]}>
                    {poses.filter((p) => c.photos[p.id]).map((p) => <PhotoView key={p.id} refUri={c.photos[p.id]!} style={s.thumb} label={`Foto ${p.label}`} />)}
                  </View>
                )}
                {measures.filter((m) => c.measures[m.id] !== undefined).map((m) => (
                  <View key={m.id} style={s.mRow}>
                    <Text style={s.mLabel}>{m.label}</Text>
                    <Text style={s.mVal}>{cm(c.measures[m.id])}</Text>
                    <Text style={s.mDelta}>{prev ? delta(prev.measures[m.id], c.measures[m.id]) : ''}</Text>
                  </View>
                ))}
                {!!c.note && <Text style={s.small}>“{c.note}”</Text>}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const useStyles = createStyles((colors) => ({
  screen: { padding: spacing.xl, paddingBottom: 130, backgroundColor: colors.background, minHeight: '100%' },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.md, minHeight: 44 },
  backText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: type.bodyLg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontSize: type.title, fontFamily: fonts.bodyBold, color: colors.primaryDark },
  body: { color: colors.textSecondary, lineHeight: 21, fontFamily: fonts.body, fontSize: type.body },
  small: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: type.small, marginTop: spacing.xs, lineHeight: 17 },
  bullet: { color: colors.text, fontFamily: fonts.body, fontSize: type.body, lineHeight: 21, marginTop: spacing.xs },
  label: { fontSize: type.small, color: colors.textSecondary, fontFamily: fonts.bodyBold, marginTop: spacing.sm, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segment: { flexDirection: 'row', backgroundColor: colors.blush, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg },
  segBtn: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.pill, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  segBtnOn: { backgroundColor: colors.card },
  segText: { fontFamily: fonts.bodySemiBold, color: colors.textSecondary, fontSize: type.small, textAlign: 'center' },
  segTextOn: { color: colors.primaryDark, fontFamily: fonts.bodyBold },
  eyebrow: { color: colors.blush, fontFamily: fonts.bodyBold, fontSize: type.caption, letterSpacing: 1 },
  heroText: { color: colors.onPrimary, fontFamily: fonts.headingBold, fontSize: type.heading, marginTop: spacing.sm, lineHeight: 26 },
  diagramRow: { alignItems: 'center', marginVertical: spacing.md },
  howRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  howNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  howNumText: { color: colors.onPrimary, fontFamily: fonts.bodyBold, fontSize: type.small },
  howTitle: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: type.body },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photoSlot: { flex: 1, alignItems: 'center' },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surface },
  photoEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  photoBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  photoRemove: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { fontFamily: fonts.bodySemiBold, fontSize: type.small, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  measureCell: { width: '50%', paddingHorizontal: spacing.xs },
  compare: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  comparePhoto: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surface },
  thumb: { width: 64, height: 86, borderRadius: radius.sm, backgroundColor: colors.surface },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, gap: spacing.sm },
  mLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: type.body, color: colors.text },
  mVal: { fontFamily: fonts.body, fontSize: type.body, color: colors.textSecondary },
  mDelta: { minWidth: 44, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: type.body, color: colors.textSecondary },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: type.bodyLg, color: colors.text },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  danger: { color: colors.danger, fontFamily: fonts.bodySemiBold, fontSize: type.small, marginTop: spacing.xs },
}));
