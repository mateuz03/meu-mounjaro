-- Diet module schema (weekly menu, meal logs with calorie snapshot, shopping list)
-- Same contract: id, user_id, created_at, updated_at + RLS (auth.uid() = user_id)

-- ============ diet_menu_items ============
create table if not exists public.diet_menu_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  meal_slot text not null check (meal_slot in ('cafe_manha','almoco','lanche','cafe_tarde','janta')),
  sort_order integer not null default 0,
  name text not null,
  description text,
  calories numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ diet_meal_logs ============
-- Registro de refeição efetivamente comida. Guarda snapshot das calorias
-- para que alterar o cardápio depois não reescreva o histórico.
create table if not exists public.diet_meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_slot text not null check (meal_slot in ('cafe_manha','almoco','lanche','cafe_tarde','janta')),
  menu_item_id uuid references public.diet_menu_items(id) on delete set null,
  extra_name text,
  calories numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ diet_shopping_items ============
create table if not exists public.diet_shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity text,
  category text not null default 'outros',
  is_checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.diet_menu_items enable row level security;
alter table public.diet_meal_logs enable row level security;
alter table public.diet_shopping_items enable row level security;

drop policy if exists "diet_menu_items_select_own" on public.diet_menu_items;
create policy "diet_menu_items_select_own" on public.diet_menu_items for select using (auth.uid() = user_id);
drop policy if exists "diet_menu_items_insert_own" on public.diet_menu_items;
create policy "diet_menu_items_insert_own" on public.diet_menu_items for insert with check (auth.uid() = user_id);
drop policy if exists "diet_menu_items_update_own" on public.diet_menu_items;
create policy "diet_menu_items_update_own" on public.diet_menu_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "diet_menu_items_delete_own" on public.diet_menu_items;
create policy "diet_menu_items_delete_own" on public.diet_menu_items for delete using (auth.uid() = user_id);
drop trigger if exists diet_menu_items_set_updated_at on public.diet_menu_items;
create trigger diet_menu_items_set_updated_at before update on public.diet_menu_items for each row execute function public.set_updated_at();

drop policy if exists "diet_meal_logs_select_own" on public.diet_meal_logs;
create policy "diet_meal_logs_select_own" on public.diet_meal_logs for select using (auth.uid() = user_id);
drop policy if exists "diet_meal_logs_insert_own" on public.diet_meal_logs;
create policy "diet_meal_logs_insert_own" on public.diet_meal_logs for insert with check (auth.uid() = user_id);
drop policy if exists "diet_meal_logs_update_own" on public.diet_meal_logs;
create policy "diet_meal_logs_update_own" on public.diet_meal_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "diet_meal_logs_delete_own" on public.diet_meal_logs;
create policy "diet_meal_logs_delete_own" on public.diet_meal_logs for delete using (auth.uid() = user_id);
drop trigger if exists diet_meal_logs_set_updated_at on public.diet_meal_logs;
create trigger diet_meal_logs_set_updated_at before update on public.diet_meal_logs for each row execute function public.set_updated_at();

drop policy if exists "diet_shopping_items_select_own" on public.diet_shopping_items;
create policy "diet_shopping_items_select_own" on public.diet_shopping_items for select using (auth.uid() = user_id);
drop policy if exists "diet_shopping_items_insert_own" on public.diet_shopping_items;
create policy "diet_shopping_items_insert_own" on public.diet_shopping_items for insert with check (auth.uid() = user_id);
drop policy if exists "diet_shopping_items_update_own" on public.diet_shopping_items;
create policy "diet_shopping_items_update_own" on public.diet_shopping_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "diet_shopping_items_delete_own" on public.diet_shopping_items;
create policy "diet_shopping_items_delete_own" on public.diet_shopping_items for delete using (auth.uid() = user_id);
drop trigger if exists diet_shopping_items_set_updated_at on public.diet_shopping_items;
create trigger diet_shopping_items_set_updated_at before update on public.diet_shopping_items for each row execute function public.set_updated_at();