export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  treatment_start_date: string | null;
  goal_weight_kg: number | null;
  weight_unit: 'kg' | 'lb';
  length_unit: 'cm' | 'in';
  reminders_enabled: boolean;
  reminder_lead_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationApplication {
  id: string;
  user_id: string;
  application_date: string;
  application_time: string | null;
  dose: number;
  dose_unit: string;
  injection_site: string | null;
  body_side: string | null;
  lot_number: string | null;
  lot_expiry: string | null;
  prescribed_confirmed: boolean;
  notes: string | null;
  inventory_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number | null;
  abdominal_circ_cm: number | null;
  waist_circ_cm: number | null;
  hip_circ_cm: number | null;
  chest_circ_cm: number | null;
  arm_circ_cm: number | null;
  thigh_circ_cm: number | null;
  body_fat_pct: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  hunger_level: number | null;
  satiety_level: number | null;
  energy_level: number | null;
  mood_level: number | null;
  water_ml: number | null;
  sleep_quality: number | null;
  sleep_hours: number | null;
  physical_activity: string | null;
  food_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerceivedEffect {
  id: string;
  user_id: string;
  occurred_on: string;
  name: string;
  intensity: 'leve' | 'moderada' | 'forte';
  approx_time: string | null;
  duration_text: string | null;
  status: 'presente' | 'encerrado';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  kind: 'aplicacao' | 'pesagem' | 'consulta' | 'exame' | 'outro';
  remind_date: string;
  remind_time: string | null;
  lead_minutes: number | null;
  notes: string | null;
  planned_dose: number | null;
  planned_dose_unit: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  kind: 'consulta' | 'exame';
  appt_date: string;
  appt_time: string | null;
  professional: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationInventory {
  id: string;
  user_id: string;
  product_name: string | null;
  quantity_purchased: number | null;
  quantity_available: number | null;
  purchase_date: string | null;
  expiry_date: string | null;
  lot_number: string | null;
  storage_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationNote {
  id: string;
  user_id: string;
  note_date: string;
  category: 'pergunta' | 'observacao';
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GymWorkout {
  id: string;
  user_id: string;
  workout_date: string;
  workout_time: string | null;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GymExerciseEntry {
  id: string;
  user_id: string;
  workout_id: string;
  sort_order: number;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SportActivity {
  id: string;
  user_id: string;
  activity_date: string;
  sport_type: string;
  duration_minutes: number | null;
  distance_km: number | null;
  perceived_effort: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FitnessRoutineItem {
  id: string;
  user_id: string;
  weekday: number;
  sort_order: number;
  kind: 'academia' | 'esporte';
  title: string;
  exercise_name: string | null;
  sets: number | null;
  reps: number | null;
  target_weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FitnessWeightLog {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MealSlot = 'cafe_manha' | 'almoco' | 'lanche' | 'cafe_tarde' | 'janta';

export interface DietMenuItem {
  id: string;
  user_id: string;
  weekday: number;
  meal_slot: MealSlot;
  sort_order: number;
  name: string;
  description: string | null;
  calories: number | null;
  created_at: string;
  updated_at: string;
}

export interface DietMealLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_slot: MealSlot;
  menu_item_id: string | null;
  extra_name: string | null;
  calories: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DietShoppingItem {
  id: string;
  user_id: string;
  name: string;
  quantity: string | null;
  category: string;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AppData {
  profile: Profile | null;
  applications: MedicationApplication[];
  measurements: BodyMeasurement[];
  logs: DailyLog[];
  effects: PerceivedEffect[];
  reminders: Reminder[];
  appointments: Appointment[];
  inventory: MedicationInventory[];
  notes: ConsultationNote[];
  gym_workouts: GymWorkout[];
  gym_exercise_entries: GymExerciseEntry[];
  sport_activities: SportActivity[];
  fitness_routine_items: FitnessRoutineItem[];
  fitness_weight_logs: FitnessWeightLog[];
  diet_menu_items: DietMenuItem[];
  diet_meal_logs: DietMealLog[];
  diet_shopping_items: DietShoppingItem[];
}

export type TableName =
  | 'medication_applications'
  | 'body_measurements'
  | 'daily_logs'
  | 'perceived_effects'
  | 'reminders'
  | 'appointments'
  | 'medication_inventory'
  | 'consultation_notes'
  | 'profiles'
  | 'gym_workouts'
  | 'gym_exercise_entries'
  | 'sport_activities'
  | 'fitness_routine_items'
  | 'fitness_weight_logs'
  | 'diet_menu_items'
  | 'diet_meal_logs'
  | 'diet_shopping_items';
