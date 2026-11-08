-- Constraints numéricas, chaves estrangeiras compostas (propriedade entre
-- tabelas do mesmo usuário) e índices de consulta.
-- Requer PostgreSQL 15+ (ON DELETE SET NULL com lista de colunas).

-- ============ Checks numéricos (not valid + validate) ============
-- Estratégia: ADD ... NOT VALID não travam a migração com dados legados;
-- VALIDATE em seguida confere os dados existentes e falha com mensagem
-- clara caso haja violação (corrija os dados e reaplique).

alter table public.body_measurements
  add constraint body_measurements_abdominal_positive check (abdominal_circ_cm is null or abdominal_circ_cm > 0) not valid;
alter table public.body_measurements validate constraint body_measurements_abdominal_positive;
alter table public.body_measurements
  add constraint body_measurements_waist_positive check (waist_circ_cm is null or waist_circ_cm > 0) not valid;
alter table public.body_measurements validate constraint body_measurements_waist_positive;
alter table public.body_measurements
  add constraint body_measurements_hip_positive check (hip_circ_cm is null or hip_circ_cm > 0) not valid;
alter table public.body_measurements validate constraint body_measurements_hip_positive;
alter table public.body_measurements
  add constraint body_measurements_chest_positive check (chest_circ_cm is null or chest_circ_cm > 0) not valid;
alter table public.body_measurements validate constraint body_measurements_chest_positive;
alter table public.body_measurements
  add constraint body_measurements_arm_positive check (arm_circ_cm is null or arm_circ_cm > 0) not valid;
alter table public.body_measurements validate constraint body_measurements_arm_positive;
alter table public.body_measurements
  add constraint body_measurements_thigh_positive check (thigh_circ_cm is null or thigh_circ_cm > 0) not valid;
alter table public.body_measurements validate constraint body_measurements_thigh_positive;
alter table public.body_measurements
  add constraint body_measurements_body_fat_range check (body_fat_pct is null or body_fat_pct between 0 and 100) not valid;
alter table public.body_measurements validate constraint body_measurements_body_fat_range;

alter table public.daily_logs
  add constraint daily_logs_water_nonnegative check (water_ml is null or water_ml >= 0) not valid;
alter table public.daily_logs validate constraint daily_logs_water_nonnegative;
alter table public.daily_logs
  add constraint daily_logs_sleep_hours_range check (sleep_hours is null or sleep_hours between 0 and 24) not valid;
alter table public.daily_logs validate constraint daily_logs_sleep_hours_range;

alter table public.gym_exercise_entries
  add constraint gym_exercise_entries_sets_positive check (sets is null or sets > 0) not valid;
alter table public.gym_exercise_entries validate constraint gym_exercise_entries_sets_positive;
alter table public.gym_exercise_entries
  add constraint gym_exercise_entries_reps_positive check (reps is null or reps > 0) not valid;
alter table public.gym_exercise_entries validate constraint gym_exercise_entries_reps_positive;
alter table public.gym_exercise_entries
  add constraint gym_exercise_entries_weight_nonnegative check (weight_kg is null or weight_kg >= 0) not valid;
alter table public.gym_exercise_entries validate constraint gym_exercise_entries_weight_nonnegative;

alter table public.sport_activities
  add constraint sport_activities_duration_positive check (duration_minutes is null or duration_minutes > 0) not valid;
alter table public.sport_activities validate constraint sport_activities_duration_positive;
alter table public.sport_activities
  add constraint sport_activities_distance_positive check (distance_km is null or distance_km > 0) not valid;
alter table public.sport_activities validate constraint sport_activities_distance_positive;

alter table public.fitness_routine_items
  add constraint fitness_routine_items_sets_positive check (sets is null or sets > 0) not valid;
alter table public.fitness_routine_items validate constraint fitness_routine_items_sets_positive;
alter table public.fitness_routine_items
  add constraint fitness_routine_items_reps_positive check (reps is null or reps > 0) not valid;
alter table public.fitness_routine_items validate constraint fitness_routine_items_reps_positive;

alter table public.fitness_weight_logs
  add constraint fitness_weight_logs_weight_positive check (weight_kg > 0) not valid;
alter table public.fitness_weight_logs validate constraint fitness_weight_logs_weight_positive;

alter table public.diet_menu_items
  add constraint diet_menu_items_calories_nonnegative check (calories is null or calories >= 0) not valid;
alter table public.diet_menu_items validate constraint diet_menu_items_calories_nonnegative;
alter table public.diet_meal_logs
  add constraint diet_meal_logs_calories_nonnegative check (calories is null or calories >= 0) not valid;
alter table public.diet_meal_logs validate constraint diet_meal_logs_calories_nonnegative;

alter table public.medication_inventory
  add constraint medication_inventory_qty_purchased_nonnegative check (quantity_purchased is null or quantity_purchased >= 0) not valid;
alter table public.medication_inventory validate constraint medication_inventory_qty_purchased_nonnegative;
alter table public.medication_inventory
  add constraint medication_inventory_qty_available_nonnegative check (quantity_available is null or quantity_available >= 0) not valid;
alter table public.medication_inventory validate constraint medication_inventory_qty_available_nonnegative;

-- ============ Propriedade entre tabelas (FK composta user_id + id) ============
-- Garante no nível do banco que um registro só referencie dados do MESMO
-- usuário (ex.: aplicação → estoque, exercício → treino, refeição → cardápio),
-- independentemente de RLS.

-- medication_applications.inventory_id → medication_inventory do mesmo usuário
alter table public.medication_inventory
  add constraint medication_inventory_user_id_id_key unique (user_id, id);
alter table public.medication_applications
  drop constraint if exists medication_applications_inventory_id_fkey;
alter table public.medication_applications
  add constraint medication_applications_inventory_same_user
  foreign key (user_id, inventory_id)
  references public.medication_inventory (user_id, id)
  on delete set null (inventory_id)
  not valid;
alter table public.medication_applications validate constraint medication_applications_inventory_same_user;

-- gym_exercise_entries.workout_id → gym_workouts do mesmo usuário
alter table public.gym_workouts
  add constraint gym_workouts_user_id_id_key unique (user_id, id);
alter table public.gym_exercise_entries
  drop constraint if exists gym_exercise_entries_workout_id_fkey;
alter table public.gym_exercise_entries
  add constraint gym_exercise_entries_workout_same_user
  foreign key (user_id, workout_id)
  references public.gym_workouts (user_id, id)
  on delete cascade
  not valid;
alter table public.gym_exercise_entries validate constraint gym_exercise_entries_workout_same_user;

-- diet_meal_logs.menu_item_id → diet_menu_items do mesmo usuário
alter table public.diet_menu_items
  add constraint diet_menu_items_user_id_id_key unique (user_id, id);
alter table public.diet_meal_logs
  drop constraint if exists diet_meal_logs_menu_item_id_fkey;
alter table public.diet_meal_logs
  add constraint diet_meal_logs_menu_item_same_user
  foreign key (user_id, menu_item_id)
  references public.diet_menu_items (user_id, id)
  on delete set null (menu_item_id)
  not valid;
alter table public.diet_meal_logs validate constraint diet_meal_logs_menu_item_same_user;

-- ============ Índices de consulta (user_id + coluna de data) ============
create index if not exists idx_medication_applications_user_date
  on public.medication_applications (user_id, application_date desc);
create index if not exists idx_body_measurements_user_date
  on public.body_measurements (user_id, entry_date desc);
create index if not exists idx_daily_logs_user_date
  on public.daily_logs (user_id, log_date desc);
create index if not exists idx_perceived_effects_user_date
  on public.perceived_effects (user_id, occurred_on desc);
create index if not exists idx_reminders_user_date
  on public.reminders (user_id, remind_date);
create index if not exists idx_appointments_user_date
  on public.appointments (user_id, appt_date);
create index if not exists idx_consultation_notes_user_date
  on public.consultation_notes (user_id, note_date desc);
create index if not exists idx_medication_inventory_user
  on public.medication_inventory (user_id);
create index if not exists idx_gym_workouts_user_date
  on public.gym_workouts (user_id, workout_date desc);
create index if not exists idx_gym_exercise_entries_workout
  on public.gym_exercise_entries (workout_id, sort_order);
create index if not exists idx_sport_activities_user_date
  on public.sport_activities (user_id, activity_date desc);
create index if not exists idx_fitness_routine_items_user_weekday
  on public.fitness_routine_items (user_id, weekday, sort_order);
create index if not exists idx_fitness_weight_logs_user_date
  on public.fitness_weight_logs (user_id, entry_date desc);
create index if not exists idx_diet_menu_items_user_weekday
  on public.diet_menu_items (user_id, weekday, meal_slot, sort_order);
create index if not exists idx_diet_meal_logs_user_date
  on public.diet_meal_logs (user_id, log_date desc);
create index if not exists idx_diet_shopping_items_user_sort
  on public.diet_shopping_items (user_id, sort_order);
