// Backup/restauração: valida o JSON exportado pelo app e prepara a inserção
// em lote. A restauração é aditiva (mescla): registros que já existem na conta
// (mesmo id) são pulados; nenhum dado é apagado.
//
// Formato versão 2: colunas desconhecidas são descartadas na importação e
// linhas sem os campos obrigatórios são rejeitadas (contabilizadas em skipped).

import { TABLE_SPECS, type DataTableName } from './tables';

export const BACKUP_VERSION = 2;

export interface BackupRows {
  [field: string]: Record<string, unknown>[] | undefined;
}

export interface BackupPayload {
  version?: number;
  exportedAt?: string;
  profile?: Record<string, unknown> | null;
  rows: BackupRows;
  total: number;
  skipped: number;
}

// Ordem importa: gym_workouts antes de gym_exercise_entries (chave estrangeira).
export const IMPORT_FIELDS: { field: string; table: DataTableName }[] = TABLE_SPECS.map(
  (s) => ({ field: s.field as string, table: s.table }),
);

const SPEC_BY_FIELD = new Map(TABLE_SPECS.map((s) => [s.field as string, s]));

// Campos mínimos para o registro fazer sentido na tela; sem eles a linha é descartada.
const REQUIRED_KEYS: Record<string, string[]> = {
  applications: ['application_date'],
  measurements: ['entry_date'],
  logs: ['log_date'],
  effects: ['occurred_on', 'name'],
  reminders: ['remind_date', 'title'],
  appointments: ['appt_date'],
  notes: ['note_date'],
  gym_workouts: ['workout_date', 'title'],
  gym_exercise_entries: ['workout_id', 'exercise_name'],
  sport_activities: ['activity_date'],
  fitness_routine_items: ['weekday', 'title'],
  fitness_weight_logs: ['entry_date'],
  diet_menu_items: ['weekday', 'name'],
  diet_meal_logs: ['log_date'],
  diet_shopping_items: ['name'],
};

export function parseBackup(text: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('O arquivo não contém um backup reconhecível.');
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version === 'number' && obj.version > BACKUP_VERSION) {
    throw new Error(
      `O backup foi gerado por uma versão mais nova do aplicativo (versão ${obj.version}). Atualize o aplicativo antes de restaurar.`,
    );
  }
  const payload: BackupPayload = { version: BACKUP_VERSION, rows: {}, total: 0, skipped: 0 };
  if (typeof obj.exported_at === 'string') payload.exportedAt = obj.exported_at;
  if (obj.profile && typeof obj.profile === 'object') {
    payload.profile = obj.profile as Record<string, unknown>;
  }
  for (const spec of TABLE_SPECS) {
    const arr = obj[spec.field];
    if (!Array.isArray(arr)) continue;
    const required = REQUIRED_KEYS[spec.field] ?? [];
    const allowed = spec.columns;
    for (const raw of arr) {
      if (
        typeof raw !== 'object' ||
        raw === null ||
        typeof (raw as { id?: unknown }).id !== 'string'
      ) {
        payload.skipped += 1;
        continue;
      }
      const row = raw as Record<string, unknown>;
      const missing = required.some(
        (k) => row[k] === undefined || row[k] === null || row[k] === '',
      );
      if (missing) {
        payload.skipped += 1;
        continue;
      }
      // Mantém apenas colunas conhecidas do esquema atual.
      const clean: Record<string, unknown> = {};
      for (const col of allowed) {
        if (row[col] !== undefined) clean[col] = row[col];
      }
      const list = payload.rows[spec.field] ?? [];
      list.push(clean);
      payload.rows[spec.field] = list;
      payload.total += 1;
    }
  }
  if (payload.total === 0 && !payload.profile) {
    throw new Error('Nenhum registro reconhecido neste arquivo.');
  }
  return payload;
}

export function formatDateBR(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Usado por testes de paridade: garante que TODO campo do catálogo tem spec.
export function specForField(field: string) {
  return SPEC_BY_FIELD.get(field);
}
