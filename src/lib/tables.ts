// Catálogo central de tabelas: usado pelo AppContext (carregamento/persistência)
// e pelos testes de paridade cliente↔esquema (vitest). Módulo puro, sem React.

import type { AppData, TableName } from './types';

export type DataTableName = Exclude<TableName, 'profiles'>;

export interface TableSpec {
  table: DataTableName;
  field: keyof AppData;
  // Colunas explícitas evitam select('*') e documentam o contrato cliente↔banco.
  columns: string[];
  // Coluna de data usada para ordenação determinística e janela de carregamento.
  dateColumn: string;
  // Quando definido, o app carrega apenas registros a partir de X meses atrás.
  // Tabelas com filtros "Completo" ou relatório de período arbitrário ficam sem janela.
  windowMonths?: number;
}

export const TABLE_SPECS: TableSpec[] = [
  {
    table: 'medication_applications',
    field: 'applications',
    columns: [
      'id', 'user_id', 'application_date', 'application_time', 'dose', 'dose_unit',
      'injection_site', 'body_side', 'lot_number', 'lot_expiry', 'prescribed_confirmed',
      'notes', 'inventory_id', 'created_at', 'updated_at',
    ],
    dateColumn: 'application_date',
  },
  {
    table: 'body_measurements',
    field: 'measurements',
    columns: [
      'id', 'user_id', 'entry_date', 'weight_kg', 'abdominal_circ_cm', 'waist_circ_cm',
      'hip_circ_cm', 'chest_circ_cm', 'arm_circ_cm', 'thigh_circ_cm', 'body_fat_pct',
      'photo_url', 'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'entry_date',
  },
  {
    table: 'daily_logs',
    field: 'logs',
    columns: [
      'id', 'user_id', 'log_date', 'hunger_level', 'satiety_level', 'energy_level',
      'mood_level', 'water_ml', 'sleep_quality', 'sleep_hours', 'physical_activity',
      'food_notes', 'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'log_date',
    windowMonths: 24,
  },
  {
    table: 'perceived_effects',
    field: 'effects',
    columns: [
      'id', 'user_id', 'occurred_on', 'name', 'intensity', 'approx_time',
      'duration_text', 'status', 'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'occurred_on',
    windowMonths: 24,
  },
  {
    table: 'reminders',
    field: 'reminders',
    columns: [
      'id', 'user_id', 'title', 'kind', 'remind_date', 'remind_time', 'lead_minutes',
      'notes', 'planned_dose', 'planned_dose_unit', 'is_done', 'created_at', 'updated_at',
    ],
    dateColumn: 'remind_date',
  },
  {
    table: 'appointments',
    field: 'appointments',
    columns: [
      'id', 'user_id', 'kind', 'appt_date', 'appt_time', 'professional', 'location',
      'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'appt_date',
  },
  {
    table: 'medication_inventory',
    field: 'inventory',
    columns: [
      'id', 'user_id', 'product_name', 'quantity_purchased', 'quantity_available',
      'purchase_date', 'expiry_date', 'lot_number', 'storage_location', 'notes',
      'created_at', 'updated_at',
    ],
    dateColumn: 'purchase_date',
  },
  {
    table: 'consultation_notes',
    field: 'notes',
    columns: ['id', 'user_id', 'note_date', 'category', 'content', 'created_at', 'updated_at'],
    dateColumn: 'note_date',
  },
  {
    table: 'gym_workouts',
    field: 'gym_workouts',
    columns: ['id', 'user_id', 'workout_date', 'workout_time', 'title', 'notes', 'created_at', 'updated_at'],
    dateColumn: 'workout_date',
  },
  {
    table: 'gym_exercise_entries',
    field: 'gym_exercise_entries',
    columns: [
      'id', 'user_id', 'workout_id', 'sort_order', 'exercise_name', 'sets', 'reps',
      'weight_kg', 'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'created_at',
  },
  {
    table: 'sport_activities',
    field: 'sport_activities',
    columns: [
      'id', 'user_id', 'activity_date', 'sport_type', 'duration_minutes', 'distance_km',
      'perceived_effort', 'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'activity_date',
  },
  {
    table: 'fitness_routine_items',
    field: 'fitness_routine_items',
    columns: [
      'id', 'user_id', 'weekday', 'sort_order', 'kind', 'title', 'exercise_name',
      'sets', 'reps', 'target_weight_kg', 'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'created_at',
  },
  {
    table: 'fitness_weight_logs',
    field: 'fitness_weight_logs',
    columns: ['id', 'user_id', 'entry_date', 'weight_kg', 'notes', 'created_at', 'updated_at'],
    dateColumn: 'entry_date',
  },
  {
    table: 'diet_menu_items',
    field: 'diet_menu_items',
    columns: [
      'id', 'user_id', 'weekday', 'meal_slot', 'sort_order', 'name', 'description',
      'calories', 'created_at', 'updated_at',
    ],
    dateColumn: 'created_at',
  },
  {
    table: 'diet_meal_logs',
    field: 'diet_meal_logs',
    columns: [
      'id', 'user_id', 'log_date', 'meal_slot', 'menu_item_id', 'extra_name',
      'calories', 'notes', 'created_at', 'updated_at',
    ],
    dateColumn: 'log_date',
    windowMonths: 12,
  },
  {
    table: 'diet_shopping_items',
    field: 'diet_shopping_items',
    columns: [
      'id', 'user_id', 'name', 'quantity', 'category', 'is_checked', 'sort_order',
      'created_at', 'updated_at',
    ],
    dateColumn: 'created_at',
  },
];

// Data de corte ISO (yyyy-mm-dd) usada no carregamento de tabelas com janela.
export function windowCutoff(windowMonths: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - windowMonths, now.getDate());
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
