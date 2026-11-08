// Upload e leitura de fotos no bucket privado "user-files" do Supabase Storage.
// Caminhos ficam no formato photos/{uid}/... e apenas o dono da pasta acessa
// (políticas RLS do storage). Fotos legadas em base64/http continuam válidas.

import { supabase } from './supabase';

const BUCKET = 'user-files';
export const PHOTO_PREFIX = 'photos/';

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const URL_TTL_MS = 50 * 60 * 1000; // URLs assinadas duram 1h; renovamos aos 50min.

function isStoragePath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith(PHOTO_PREFIX));
}

// Valores legados (data:..., http...) são exibidos como estão.
export function isLegacyPhoto(value: string | null | undefined): boolean {
  return Boolean(value) && !isStoragePath(value);
}

async function compressImage(file: Blob, maxSize: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
  );
  return out && out.size < file.size ? out : file;
}

// Envia a foto para o Storage e devolve o caminho a salvar no banco.
export async function uploadPhoto(
  uid: string,
  subpath: string,
  file: Blob,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  try {
    const compressed = await compressImage(file, 1024, 0.85);
    const ext = 'jpg';
    const path = `${PHOTO_PREFIX}${uid}/${subpath}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.error('[storage] falha no upload:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, path };
  } catch (err) {
    console.error('[storage] erro no upload:', err);
    return { ok: false, error: 'Não foi possível enviar a foto.' };
  }
}

export async function deletePhoto(path: string): Promise<void> {
  if (!isStoragePath(path)) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    /* melhor esforço: foto órfã no storage não afeta o app */
  }
}

// Resolve um valor salvo no banco para URL exibível.
// - Caminho do Storage → URL assinada (com cache em memória).
// - Legado (data URL/http) → devolvido como está.
export async function resolvePhoto(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (!isStoragePath(value)) return value;
  const cached = signedUrlCache.get(value);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, 3600);
  if (error || !data?.signedUrl) {
    console.error('[storage] falha ao assinar URL:', error?.message ?? '');
    return null;
  }
  signedUrlCache.set(value, { url: data.signedUrl, expiresAt: Date.now() + URL_TTL_MS });
  return data.signedUrl;
}
