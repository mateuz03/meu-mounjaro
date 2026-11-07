// Backup/restauração: valida o JSON exportado pelo app e prepara a inserção
// em lote. A restauração é aditiva (mescla): registros que já existem na conta
// (mesmo id) são pulados; nenhum dado é apagado.

export interface BackupRows {
  [field: string]: Record<string, unknown>[] | undefined;
}

export interface BackupPayload {
  exportedAt?: string;
  profile?: Record<string, unknown> | null;
  rows: BackupRows;
  total: number;
}

// Ordem importa: gym_workouts antes de gym_exercise_entries (chave estrangeira).
export const IMPORT_FIELDS: { field: string; table: string }[] = [
  { field: 'applications', table: 'medication_applications' },
  { field: 'measurements', table: 'body_measurements' },
  { field: 'logs', table: 'daily_logs' },
  { field: 'effects', table: 'perceived_effects' },
  { field: 'reminders', table: 'reminders' },
  { field: 'appointments', table: 'appointments' },
  { field: 'inventory', table: 'medication_inventory' },
  { field: 'notes', table: 'consultation_notes' },
  { field: 'gym_workouts', table: 'gym_workouts' },
  { field: 'gym_exercise_entries', table: 'gym_exercise_entries' },
  { field: 'sport_activities', table: 'sport_activities' },
  { field: 'fitness_routine_items', table: 'fitness_routine_items' },
  { field: 'fitness_weight_logs', table: 'fitness_weight_logs' },
  { field: 'diet_menu_items', table: 'diet_menu_items' },
  { field: 'diet_meal_logs', table: 'diet_meal_logs' },
  { field: 'diet_shopping_items', table: 'diet_shopping_items' },
];

export function parseBackup(text: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('O arquivo não contém um backup reconhecível.');
  }
  const obj = parsed as Record<string, unknown>;
  const payload: BackupPayload = { rows: {}, total: 0 };
  if (typeof obj.exported_at === 'string') payload.exportedAt = obj.exported_at;
  if (obj.profile && typeof obj.profile === 'object') {
    payload.profile = obj.profile as Record<string, unknown>;
  }
  for (const { field } of IMPORT_FIELDS) {
    const arr = obj[field];
    if (!Array.isArray(arr)) continue;
    const rows = arr.filter(
      (r): r is Record<string, unknown> =>
        typeof r === 'object' && r !== null && typeof (r as { id?: unknown }).id === 'string',
    );
    if (rows.length) {
      payload.rows[field] = rows;
      payload.total += rows.length;
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
