// Notificações locais de lembretes (America/Sao_Paulo).
// No navegador (PWA): notificações via service worker enquanto o app está
// aberto ou em segundo plano. No APK: agendamento nativo que dispara mesmo
// com o aplicativo fechado. Não há envio por e-mail nem servidores.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Reminder } from './types';
import { formatDateLong } from './helpers';

const SP_OFFSET = '-03:00';
const GRACE_MIN = 45;
const SHOWN_KEY = 'mounjaro-shown-notifications';
const NATIVE_SOURCE = 'mounjaro-reminders';
// Não agenda lembretes com mais de 60 dias no futuro (limite do Android).
const MAX_AHEAD_DAYS = 60;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function notificationSupported(): boolean {
  if (isNative()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNative()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }
  if (!notificationSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (isNative()) {
    try {
      const res = await LocalNotifications.checkPermissions();
      if (res.display === 'granted') return 'granted';
      if (res.display === 'denied') return 'denied';
      return 'default';
    } catch {
      return 'unsupported';
    }
  }
  if (!notificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function showNotification(title: string, body: string, tag?: string): Promise<boolean> {
  if (isNative()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') return false;
      await LocalNotifications.schedule({
        notifications: [{ id: Date.now() % 2000000000, title, body }],
      });
      return true;
    } catch {
      return false;
    }
  }
  if (!notificationSupported() || Notification.permission !== 'granted') return false;
  const options: NotificationOptions & { data?: { url: string } } = {
    body,
    tag: tag || 'mounjaro',
    icon: '/icons/icon-512.png',
    badge: '/icons/icon-maskable-512.png',
    data: { url: '/' },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
    return true;
  } catch {
    return false;
  }
}

export function dueTimestamp(r: Reminder): number {
  const t = (r.remind_time || '08:00').slice(0, 5);
  return new Date(`${r.remind_date}T${t}:00${SP_OFFSET}`).getTime();
}

export function reminderBody(r: Reminder): string {
  let body = `${formatDateLong(r.remind_date)}`;
  if (r.remind_time) body += ` às ${r.remind_time.slice(0, 5)}`;
  if (r.kind === 'aplicacao' && r.planned_dose) {
    body += ` · Dose registrada por você: ${r.planned_dose} ${r.planned_dose_unit ?? 'mg'}`;
  }
  body += ' · Lembrete registrado por você no Meu Mounjaro.';
  return body;
}

// UUID -> id numérico estável (int32 positivo) para o Android.
function notificationId(reminderId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < reminderId.length; i++) {
    h ^= reminderId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 1; // 31 bits
}

/**
 * APK: cancela e re-agenda as notificações nativas de todos os lembretes
 * futuros. Disparam mesmo com o app fechado (alarme exato quando permitido).
 */
export async function syncNativeReminders(reminders: Reminder[], enabled: boolean): Promise<boolean> {
  if (!isNative()) return false;
  try {
    // Cancela tudo que já estava agendado por nós.
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.extra?.source === NATIVE_SOURCE);
    if (ours.length) {
      await LocalNotifications.cancel({
        notifications: ours.map((n) => ({ id: Number(n.id) })),
      });
    }
    if (!enabled) return true;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return false;

    const now = Date.now();
    const maxAhead = now + MAX_AHEAD_DAYS * 86400000;
    const notifications = reminders
      .filter((r) => !r.is_done)
      .map((r) => {
        const due = dueTimestamp(r);
        const at = due - (r.lead_minutes ?? 0) * 60000;
        return { r, at };
      })
      .filter(({ at }) => at > now && at <= maxAhead)
      .sort((a, b) => a.at - b.at)
      .slice(0, 100)
      .map(({ r, at }) => ({
        id: notificationId(r.id),
        title: r.title,
        body: reminderBody(r),
        schedule: { at: new Date(at), allowWhileIdle: true },
        extra: { source: NATIVE_SOURCE, reminderId: r.id },
      }));
    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
    return true;
  } catch {
    return false;
  }
}

function getShown(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SHOWN_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function markShown(id: string): void {
  const shown = getShown();
  shown[id] = new Date().toISOString();
  // limpa entradas antigas (mais de 60 dias)
  const cutoff = Date.now() - 60 * 86400000;
  for (const [k, iso] of Object.entries(shown)) {
    if (new Date(iso).getTime() < cutoff) delete shown[k];
  }
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify(shown));
  } catch {
    /* storage cheio/bloqueado: ignora */
  }
}

/**
 * Verifica lembretes vencidos e dispara notificações.
 * Retorna a quantidade de notificações enviadas.
 */
export async function checkReminders(reminders: Reminder[], enabled: boolean): Promise<number> {
  if (!enabled || !notificationSupported() || Notification.permission !== 'granted') return 0;
  const now = Date.now();
  const shown = getShown();
  let sent = 0;
  for (const r of reminders) {
    if (r.is_done || shown[r.id]) continue;
    const due = dueTimestamp(r);
    const lead = (r.lead_minutes ?? 0) * 60000;
    if (now < due - lead || now > due + GRACE_MIN * 60000) continue;

    let body = `${formatDateLong(r.remind_date)}`;
    if (r.remind_time) body += ` às ${r.remind_time.slice(0, 5)}`;
    if (r.kind === 'aplicacao' && r.planned_dose) {
      body += ` · Dose registrada por você: ${r.planned_dose} ${r.planned_dose_unit ?? 'mg'}`;
    }
    body += ' · Lembrete registrado por você no Meu Mounjaro.';
    const ok = await showNotification(r.title, body, r.id);
    if (ok) {
      markShown(r.id);
      sent++;
    }
  }
  return sent;
}
