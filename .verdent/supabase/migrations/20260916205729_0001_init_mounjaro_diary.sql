-- Mounjaro personal diary schema
-- All tables: id, user_id, created_at, updated_at + RLS (auth.uid() = user_id)

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  treatment_start_date date,
  goal_weight_kg numeric,
  weight_unit text not null default 'kg' check (weight_unit in ('kg','lb')),
  length_unit text not null default 'cm' check (length_unit in ('cm','in')),
  reminders_enabled boolean not null default true,
  reminder_lead_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ medication_inventory ============
create table if not exists public.medication_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text,
  quantity_purchased numeric,
  quantity_available numeric,
  purchase_date date,
  expiry_date date,
  lot_number text,
  storage_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ medication_applications ============
create table if not exists public.medication_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_date date not null,
  application_time text,
  dose numeric not null check (dose > 0),
  dose_unit text not null default 'mg',
  injection_site text,
  body_side text,
  lot_number text,
  lot_expiry date,
  prescribed_confirmed boolean not null default false,
  notes text,
  inventory_id uuid references public.medication_inventory(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ body_measurements ============
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric check (weight_kg is null or weight_kg > 0),
  abdominal_circ_cm numeric,
  waist_circ_cm numeric,
  hip_circ_cm numeric,
  chest_circ_cm numeric,
  arm_circ_cm numeric,
  thigh_circ_cm numeric,
  body_fat_pct numeric,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ daily_logs ============
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  hunger_level integer check (hunger_level between 1 and 5),
  satiety_level integer check (satiety_level between 1 and 5),
  energy_level integer check (energy_level between 1 and 5),
  mood_level integer check (mood_level between 1 and 5),
  water_ml numeric,
  sleep_quality integer check (sleep_quality between 1 and 5),
  sleep_hours numeric,
  physical_activity text,
  food_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ============ perceived_effects ============
create table if not exists public.perceived_effects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  name text not null,
  intensity text not null check (intensity in ('leve','moderada','forte')),
  approx_time text,
  duration_text text,
  status text not null default 'presente' check (status in ('presente','encerrado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ reminders ============
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'outro' check (kind in ('aplicacao','pesagem','consulta','exame','outro')),
  remind_date date not null,
  remind_time text,
  lead_minutes integer,
  notes text,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ appointments ============
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'consulta' check (kind in ('consulta','exame')),
  appt_date date not null,
  appt_time text,
  professional text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ consultation_notes ============
create table if not exists public.consultation_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_date date not null default current_date,
  category text not null default 'observacao' check (category in ('pergunta','observacao')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ indexes ============
create index if not exists idx_applications_user_date on public.medication_applications (user_id, application_date desc);
create index if not exists idx_measurements_user_date on public.body_measurements (user_id, entry_date desc);
create index if not exists idx_daily_logs_user_date on public.daily_logs (user_id, log_date desc);
create index if not exists idx_effects_user_date on public.perceived_effects (user_id, occurred_on desc);
create index if not exists idx_reminders_user_date on public.reminders (user_id, remind_date);
create index if not exists idx_appointments_user_date on public.appointments (user_id, appt_date);
create index if not exists idx_consult_notes_user_date on public.consultation_notes (user_id, note_date desc);
create index if not exists idx_inventory_user on public.medication_inventory (user_id);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.medication_applications enable row level security;
alter table public.body_measurements enable row level security;
alter table public.daily_logs enable row level security;
alter table public.perceived_effects enable row level security;
alter table public.reminders enable row level security;
alter table public.appointments enable row level security;
alter table public.medication_inventory enable row level security;
alter table public.consultation_notes enable row level security;

-- profiles: user_id IS the owner
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

-- generic per-table policies and updated_at triggers
drop policy if exists "medication_applications_select_own" on public.medication_applications;
create policy "medication_applications_select_own" on public.medication_applications for select using (auth.uid() = user_id);
drop policy if exists "medication_applications_insert_own" on public.medication_applications;
create policy "medication_applications_insert_own" on public.medication_applications for insert with check (auth.uid() = user_id);
drop policy if exists "medication_applications_update_own" on public.medication_applications;
create policy "medication_applications_update_own" on public.medication_applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "medication_applications_delete_own" on public.medication_applications;
create policy "medication_applications_delete_own" on public.medication_applications for delete using (auth.uid() = user_id);
drop trigger if exists medication_applications_set_updated_at on public.medication_applications;
create trigger medication_applications_set_updated_at before update on public.medication_applications for each row execute function public.set_updated_at();

drop policy if exists "body_measurements_select_own" on public.body_measurements;
create policy "body_measurements_select_own" on public.body_measurements for select using (auth.uid() = user_id);
drop policy if exists "body_measurements_insert_own" on public.body_measurements;
create policy "body_measurements_insert_own" on public.body_measurements for insert with check (auth.uid() = user_id);
drop policy if exists "body_measurements_update_own" on public.body_measurements;
create policy "body_measurements_update_own" on public.body_measurements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "body_measurements_delete_own" on public.body_measurements;
create policy "body_measurements_delete_own" on public.body_measurements for delete using (auth.uid() = user_id);
drop trigger if exists body_measurements_set_updated_at on public.body_measurements;
create trigger body_measurements_set_updated_at before update on public.body_measurements for each row execute function public.set_updated_at();

drop policy if exists "daily_logs_select_own" on public.daily_logs;
create policy "daily_logs_select_own" on public.daily_logs for select using (auth.uid() = user_id);
drop policy if exists "daily_logs_insert_own" on public.daily_logs;
create policy "daily_logs_insert_own" on public.daily_logs for insert with check (auth.uid() = user_id);
drop policy if exists "daily_logs_update_own" on public.daily_logs;
create policy "daily_logs_update_own" on public.daily_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "daily_logs_delete_own" on public.daily_logs;
create policy "daily_logs_delete_own" on public.daily_logs for delete using (auth.uid() = user_id);
drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at before update on public.daily_logs for each row execute function public.set_updated_at();

drop policy if exists "perceived_effects_select_own" on public.perceived_effects;
create policy "perceived_effects_select_own" on public.perceived_effects for select using (auth.uid() = user_id);
drop policy if exists "perceived_effects_insert_own" on public.perceived_effects;
create policy "perceived_effects_insert_own" on public.perceived_effects for insert with check (auth.uid() = user_id);
drop policy if exists "perceived_effects_update_own" on public.perceived_effects;
create policy "perceived_effects_update_own" on public.perceived_effects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "perceived_effects_delete_own" on public.perceived_effects;
create policy "perceived_effects_delete_own" on public.perceived_effects for delete using (auth.uid() = user_id);
drop trigger if exists perceived_effects_set_updated_at on public.perceived_effects;
create trigger perceived_effects_set_updated_at before update on public.perceived_effects for each row execute function public.set_updated_at();

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own" on public.reminders for select using (auth.uid() = user_id);
drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own" on public.reminders for insert with check (auth.uid() = user_id);
drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own" on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own" on public.reminders for delete using (auth.uid() = user_id);
drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at before update on public.reminders for each row execute function public.set_updated_at();

drop policy if exists "appointments_select_own" on public.appointments;
create policy "appointments_select_own" on public.appointments for select using (auth.uid() = user_id);
drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments for insert with check (auth.uid() = user_id);
drop policy if exists "appointments_update_own" on public.appointments;
create policy "appointments_update_own" on public.appointments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "appointments_delete_own" on public.appointments;
create policy "appointments_delete_own" on public.appointments for delete using (auth.uid() = user_id);
drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();

drop policy if exists "medication_inventory_select_own" on public.medication_inventory;
create policy "medication_inventory_select_own" on public.medication_inventory for select using (auth.uid() = user_id);
drop policy if exists "medication_inventory_insert_own" on public.medication_inventory;
create policy "medication_inventory_insert_own" on public.medication_inventory for insert with check (auth.uid() = user_id);
drop policy if exists "medication_inventory_update_own" on public.medication_inventory;
create policy "medication_inventory_update_own" on public.medication_inventory for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "medication_inventory_delete_own" on public.medication_inventory;
create policy "medication_inventory_delete_own" on public.medication_inventory for delete using (auth.uid() = user_id);
drop trigger if exists medication_inventory_set_updated_at on public.medication_inventory;
create trigger medication_inventory_set_updated_at before update on public.medication_inventory for each row execute function public.set_updated_at();

drop policy if exists "consultation_notes_select_own" on public.consultation_notes;
create policy "consultation_notes_select_own" on public.consultation_notes for select using (auth.uid() = user_id);
drop policy if exists "consultation_notes_insert_own" on public.consultation_notes;
create policy "consultation_notes_insert_own" on public.consultation_notes for insert with check (auth.uid() = user_id);
drop policy if exists "consultation_notes_update_own" on public.consultation_notes;
create policy "consultation_notes_update_own" on public.consultation_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "consultation_notes_delete_own" on public.consultation_notes;
create policy "consultation_notes_delete_own" on public.consultation_notes for delete using (auth.uid() = user_id);
drop trigger if exists consultation_notes_set_updated_at on public.consultation_notes;
create trigger consultation_notes_set_updated_at before update on public.consultation_notes for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- ============ auto-create profile on signup ============
create or replace function public.handle_new_user() returns trigger
security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ grants ============
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;