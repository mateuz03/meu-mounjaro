const TZ = 'America/Sao_Paulo';

import type { MealSlot } from './types';

export const SLOT_ORDER: MealSlot[] = ['cafe_manha', 'almoco', 'lanche', 'cafe_tarde', 'janta'];

export const SLOT_LABELS: Record<MealSlot, string> = {
  cafe_manha: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  cafe_tarde: 'Café da tarde',
  janta: 'Janta',
};

const isoFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in America/Sao_Paulo as YYYY-MM-DD */
export function todayISO(): string {
  return isoFmt.format(new Date());
}

/** Current time in America/Sao_Paulo as HH:MM */
export function nowTimeHM(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/** Parse YYYY-MM-DD as a local (non-UTC-shifted) Date */
export function parseISO(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: string, n: number): string {
  const dt = parseISO(d);
  dt.setDate(dt.getDate() + n);
  return toISO(dt);
}

/** Whole days from today until target (negative if past) */
export function daysUntil(target: string): number {
  const a = parseISO(todayISO()).getTime();
  const b = parseISO(target).getTime();
  return Math.round((b - a) / 86400000);
}

const longFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const monthFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  month: 'long',
  year: 'numeric',
});

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'short',
});

export function formatDateLong(iso: string): string {
  return longFmt.format(parseISO(iso));
}

export function formatDateShort(iso: string): string {
  return shortFmt.format(parseISO(iso));
}

export function formatMonthYear(iso: string): string {
  return monthFmt.format(parseISO(iso));
}

export function weekdayShort(iso: string): string {
  return weekdayFmt.format(parseISO(iso)).replace('.', '');
}

export function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function firstName(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name || '').trim();
  if (n) return n.split(/\s+/)[0];
  const e = (email || '').trim();
  if (e) return e.split('@')[0];
  return '';
}

// ---------- units ----------
export function kgToDisplay(kg: number | null, unit: 'kg' | 'lb'): number | null {
  if (kg == null) return null;
  return unit === 'kg' ? round1(kg) : round1(kg * 2.20462);
}

export function displayToKg(v: number | null, unit: 'kg' | 'lb'): number | null {
  if (v == null) return null;
  return unit === 'kg' ? v : v / 2.20462;
}

export function cmToDisplay(cm: number | null, unit: 'cm' | 'in'): number | null {
  if (cm == null) return null;
  return unit === 'cm' ? round1(cm) : round1(cm / 2.54);
}

export function displayToCm(v: number | null, unit: 'cm' | 'in'): number | null {
  if (v == null) return null;
  return unit === 'cm' ? v : v * 2.54;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fmtNum(n: number | null | undefined, unit = ''): string {
  if (n == null || Number.isNaN(n)) return '—';
  const s = round1(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return unit ? `${s} ${unit}` : s;
}

// ---------- misc ----------
export const INJECTION_SITES = [
  'Abdômen',
  'Coxa',
  'Braço',
  'Nádega',
] as const;

export const DOSE_OPTIONS = ['2.5', '5', '7.5', '10', '12.5', '15'];

export const MANDATORY_DISCLAIMER =
  'Esta aplicação é um diário pessoal de acompanhamento e não oferece diagnóstico, prescrição ou orientação médica. Não altere dose, frequência ou tratamento com base nas informações exibidas. Decisões sobre o uso do medicamento devem ser tomadas com o profissional de saúde responsável.';

export const STRONG_EFFECT_MESSAGE =
  'Este aplicativo não realiza avaliação médica. Se você estiver preocupado com o que está sentindo, procure o profissional responsável pelo seu tratamento ou um serviço de saúde.';
