-- Fitness module schema (gym workouts, sport activities, weekly routine, fitness weight)
-- Same contract: id, user_id, created_at, updated_at + RLS (auth.uid() = user_id)

-- ============ gym_workouts ============
create table if not exists public.gym_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  workout_time text,
  title text not null default 'Treino',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ gym_exercise_entries ============
create table if not exists public.gym_exercise_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.gym_workouts(id) on delete cascade,
  sort_order integer not null default 0,
  exercise_name text not null,
  sets integer,
  reps integer,
  weight_kg numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ sport_activities ============
create table if not exists public.sport_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  sport_type text not null default 'outro',
  duration_minutes integer,
  distance_km numeric,
  perceived_effort integer check (perceived_effort is null or perceived_effort between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ fitness_routine_items ============
create table if not exists public.fitness_routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  sort_order integer not null default 0,
  kind text not null default 'academia' check (kind in ('academia','esporte')),
  title text not null,
  exercise_name text,
  sets integer,
  reps integer,
  target_weight_kg numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ fitness_weight_logs ============
create table if not exists public.fitness_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.gym_workouts enable row level security;
alter table public.gym_exercise_entries enable row level security;
alter table public.sport_activities enable row level security;
alter table public.fitness_routine_items enable row level security;
alter table public.fitness_weight_logs enable row level security;

drop policy if exists "gym_workouts_select_own" on public.gym_workouts;
create policy "gym_workouts_select_own" on public.gym_workouts for select using (auth.uid() = user_id);
drop policy if exists "gym_workouts_insert_own" on public.gym_workouts;
create policy "gym_workouts_insert_own" on public.gym_workouts for insert with check (auth.uid() = user_id);
drop policy if exists "gym_workouts_update_own" on public.gym_workouts;
create policy "gym_workouts_update_own" on public.gym_workouts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "gym_workouts_delete_own" on public.gym_workouts;
create policy "gym_workouts_delete_own" on public.gym_workouts for delete using (auth.uid() = user_id);
drop trigger if exists gym_workouts_set_updated_at on public.gym_workouts;
create trigger gym_workouts_set_updated_at before update on public.gym_workouts for each row execute function public.set_updated_at();

drop policy if exists "gym_exercise_entries_select_own" on public.gym_exercise_entries;
create policy "gym_exercise_entries_select_own" on public.gym_exercise_entries for select using (auth.uid() = user_id);
drop policy if exists "gym_exercise_entries_insert_own" on public.gym_exercise_entries;
create policy "gym_exercise_entries_insert_own" on public.gym_exercise_entries for insert with check (auth.uid() = user_id);
drop policy if exists "gym_exercise_entries_update_own" on public.gym_exercise_entries;
create policy "gym_exercise_entries_update_own" on public.gym_exercise_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "gym_exercise_entries_delete_own" on public.gym_exercise_entries;
create policy "gym_exercise_entries_delete_own" on public.gym_exercise_entries for delete using (auth.uid() = user_id);
drop trigger if exists gym_exercise_entries_set_updated_at on public.gym_exercise_entries;
create trigger gym_exercise_entries_set_updated_at before update on public.gym_exercise_entries for each row execute function public.set_updated_at();

drop policy if exists "sport_activities_select_own" on public.sport_activities;
create policy "sport_activities_select_own" on public.sport_activities for select using (auth.uid() = user_id);
drop policy if exists "sport_activities_insert_own" on public.sport_activities;
create policy "sport_activities_insert_own" on public.sport_activities for insert with check (auth.uid() = user_id);
drop policy if exists "sport_activities_update_own" on public.sport_activities;
create policy "sport_activities_update_own" on public.sport_activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sport_activities_delete_own" on public.sport_activities;
create policy "sport_activities_delete_own" on public.sport_activities for delete using (auth.uid() = user_id);
drop trigger if exists sport_activities_set_updated_at on public.sport_activities;
create trigger sport_activities_set_updated_at before update on public.sport_activities for each row execute function public.set_updated_at();

drop policy if exists "fitness_routine_items_select_own" on public.fitness_routine_items;
create policy "fitness_routine_items_select_own" on public.fitness_routine_items for select using (auth.uid() = user_id);
drop policy if exists "fitness_routine_items_insert_own" on public.fitness_routine_items;
create policy "fitness_routine_items_insert_own" on public.fitness_routine_items for insert with check (auth.uid() = user_id);
drop policy if exists "fitness_routine_items_update_own" on public.fitness_routine_items;
create policy "fitness_routine_items_update_own" on public.fitness_routine_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "fitness_routine_items_delete_own" on public.fitness_routine_items;
create policy "fitness_routine_items_delete_own" on public.fitness_routine_items for delete using (auth.uid() = user_id);
drop trigger if exists fitness_routine_items_set_updated_at on public.fitness_routine_items;
create trigger fitness_routine_items_set_updated_at before update on public.fitness_routine_items for each row execute function public.set_updated_at();

drop policy if exists "fitness_weight_logs_select_own" on public.fitness_weight_logs;
create policy "fitness_weight_logs_select_own" on public.fitness_weight_logs for select using (auth.uid() = user_id);
drop policy if exists "fitness_weight_logs_insert_own" on public.fitness_weight_logs;
create policy "fitness_weight_logs_insert_own" on public.fitness_weight_logs for insert with check (auth.uid() = user_id);
drop policy if exists "fitness_weight_logs_update_own" on public.fitness_weight_logs;
create policy "fitness_weight_logs_update_own" on public.fitness_weight_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "fitness_weight_logs_delete_own" on public.fitness_weight_logs;
create policy "fitness_weight_logs_delete_own" on public.fitness_weight_logs for delete using (auth.uid() = user_id);
drop trigger if exists fitness_weight_logs_set_updated_at on public.fitness_weight_logs;
create trigger fitness_weight_logs_set_updated_at before update on public.fitness_weight_logs for each row execute function public.set_updated_at();