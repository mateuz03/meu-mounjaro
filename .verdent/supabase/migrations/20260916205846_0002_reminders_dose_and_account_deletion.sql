-- Add planned dose to application reminders + secure account deletion RPC

alter table public.reminders add column if not exists planned_dose numeric;
alter table public.reminders add column if not exists planned_dose_unit text default 'mg';

create or replace function public.delete_own_account() returns void
security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;