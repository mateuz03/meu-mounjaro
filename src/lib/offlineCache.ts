// Cache local (somente leitura) para consulta offline.
// Um snapshot por usuário em localStorage; fotos (base64) são descartadas
// se o armazenamento estourar a cota.

import type { AppData } from './types';

const key = (uid: string) => `mounjaro-cache-${uid}`;

export function saveSnapshot(uid: string, data: AppData): void {
  try {
    localStorage.setItem(key(uid), JSON.stringify(data));
  } catch {
    // cota excedida: tenta novamente sem fotos e avatar
    try {
      const slim: AppData = {
        ...data,
        measurements: data.measurements.map((m) => ({ ...m, photo_url: null })),
        profile: data.profile ? { ...data.profile, avatar_url: null } : null,
      };
      localStorage.setItem(key(uid), JSON.stringify(slim));
    } catch {
      /* sem espaço: cache indisponível, app segue funcionando online */
    }
  }
}

export function loadSnapshot(uid: string): AppData | null {
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.applications)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSnapshot(uid: string): void {
  try {
    localStorage.removeItem(key(uid));
  } catch {
    /* ignora */
  }
}
