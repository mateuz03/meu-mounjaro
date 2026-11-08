-- Bucket privado para fotos do usuário (avatar e fotos de evolução).
-- Objetos ficam em photos/{uid}/... e apenas o dono da pasta acessa.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-files', 'user-files', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "user_files_select_own" on storage.objects;
create policy "user_files_select_own" on storage.objects for select
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_files_insert_own" on storage.objects;
create policy "user_files_insert_own" on storage.objects for insert
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_files_update_own" on storage.objects;
create policy "user_files_update_own" on storage.objects for update
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_files_delete_own" on storage.objects;
create policy "user_files_delete_own" on storage.objects for delete
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);
