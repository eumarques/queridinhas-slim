// Fotos de evolução: captura, compressão, armazenamento e exibição.
//
// Onde cada foto fica (a referência gravada nos dados indica o local):
//   "sb:<user_id>/<arquivo>.jpg" → Supabase Storage, bucket privado (com conta)
//   "file://..."                  → pasta do app no celular (sem conta)
//   "data:image/jpeg;base64,..."  → dentro dos dados do navegador (sem conta, versão web)
import { decode } from 'base64-arraybuffer';
import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageStyle, Platform, StyleProp, View } from 'react-native';
import { PHOTO_BUCKET, supabase } from './supabase';

const MAX_WIDTH = 1080;

/** Abre a câmera ou a galeria e devolve a foto já reduzida (JPEG em base64). */
export async function pickPhoto(source: 'camera' | 'library'): Promise<{ base64: string } | { error: string } | null> {
  try {
    if (source === 'camera' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { error: 'Permita o acesso à câmera nas configurações do aparelho.' };
    }
    if (source === 'library' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return { error: 'Permita o acesso às fotos nas configurações do aparelho.' };
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return null;
    const asset = res.assets[0];
    const resize = asset.width && asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
    const out = await manipulateAsync(asset.uri, resize, { compress: 0.72, format: SaveFormat.JPEG, base64: true });
    if (!out.base64) return { error: 'Não foi possível processar a foto.' };
    return { base64: out.base64 };
  } catch (e) {
    console.warn('Falha ao obter foto', e);
    return { error: 'Não foi possível abrir a câmera/galeria. Tente novamente.' };
  }
}

/** Guarda a foto e devolve a referência para salvar nos dados. */
export async function storePhoto(base64: string, name: string, userId?: string): Promise<string> {
  if (userId && supabase) {
    const path = `${userId}/${name}.jpg`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return `sb:${path}`;
  }
  if (Platform.OS === 'web') return `data:image/jpeg;base64,${base64}`;
  const dir = new Directory(Paths.document, 'fotos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, `${name}.jpg`);
  if (file.exists) file.delete();
  file.write(new Uint8Array(decode(base64)));
  return file.uri;
}

export async function deletePhoto(ref: string) {
  if (ref.startsWith('sb:')) {
    if (!supabase) return;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([ref.slice(3)]);
    if (error) throw error;
  } else if (ref.startsWith('file:')) {
    const file = new File(ref);
    if (file.exists) file.delete();
  }
}

// Links temporários (1 h) para fotos privadas do Supabase, com cache em memória.
const signed = new Map<string, { url: string; until: number }>();
async function resolve(ref: string) {
  if (!ref.startsWith('sb:')) return ref;
  const hit = signed.get(ref);
  if (hit && hit.until > Date.now()) return hit.url;
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(ref.slice(3), 3600);
  if (error || !data) return null;
  signed.set(ref, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export function PhotoView({ refUri, style, label }: { refUri: string; style?: StyleProp<ImageStyle>; label: string }) {
  const [uri, setUri] = useState<string | null>(refUri.startsWith('sb:') ? null : refUri);
  useEffect(() => {
    let alive = true;
    resolve(refUri).then((u) => alive && setUri(u));
    return () => { alive = false; };
  }, [refUri]);
  if (!uri) return <View style={[style as object, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator /></View>;
  return <Image source={{ uri }} style={style} resizeMode="cover" accessibilityLabel={label} />;
}
