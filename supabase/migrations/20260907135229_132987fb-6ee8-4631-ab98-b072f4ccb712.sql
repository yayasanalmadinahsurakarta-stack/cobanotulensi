
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to anon, authenticated, service_role;

create or replace function app_private.is_pengurus_aktif()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from pengurus where user_id = auth.uid() and aktif = true);
$$;

create or replace function app_private.is_approver()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from pengurus where user_id = auth.uid() and aktif = true and peran = 'approver');
$$;

grant execute on function app_private.is_pengurus_aktif() to anon, authenticated, service_role;
grant execute on function app_private.is_approver() to anon, authenticated, service_role;

drop policy if exists "Pengurus baca semua notulensi" on public.notulensi;
drop policy if exists "Approver baca notulensi terhapus" on public.notulensi;
drop policy if exists "Pengurus buat notulensi" on public.notulensi;
drop policy if exists "Pengurus ubah notulensi" on public.notulensi;
drop policy if exists "Pengurus kelola peserta" on public.peserta;
drop policy if exists "Pengurus kelola tindak lanjut" on public.tindak_lanjut;
drop policy if exists "Pengurus baca daftar pengurus" on public.pengurus;
drop policy if exists "Approver tambah pengurus" on public.pengurus;
drop policy if exists "Approver ubah pengurus" on public.pengurus;
drop policy if exists "Approver hapus pengurus" on public.pengurus;
drop policy if exists "Approver baca log audit" on public.log_audit;
drop policy if exists "Pengurus tulis log audit" on public.log_audit;

drop function if exists public.is_pengurus_aktif();
drop function if exists public.is_approver();
drop function if exists public.tautkan_akun_pengurus();
drop function if exists public.adalah_pengurus(uuid);
drop function if exists public.punya_peran(uuid, peran_pengurus);

create policy "Pengurus baca semua notulensi" on public.notulensi
  for select to authenticated
  using (app_private.is_pengurus_aktif() and dihapus_pada is null);
create policy "Approver baca notulensi terhapus" on public.notulensi
  for select to authenticated using (app_private.is_approver());
create policy "Pengurus buat notulensi" on public.notulensi
  for insert to authenticated with check (app_private.is_pengurus_aktif());
create policy "Pengurus ubah notulensi" on public.notulensi
  for update to authenticated
  using (app_private.is_pengurus_aktif()) with check (app_private.is_pengurus_aktif());

create policy "Pengurus kelola peserta" on public.peserta
  for all to authenticated
  using (app_private.is_pengurus_aktif()) with check (app_private.is_pengurus_aktif());
create policy "Pengurus kelola tindak lanjut" on public.tindak_lanjut
  for all to authenticated
  using (app_private.is_pengurus_aktif()) with check (app_private.is_pengurus_aktif());

create policy "Pengurus baca daftar pengurus" on public.pengurus
  for select to authenticated using (app_private.is_pengurus_aktif());
create policy "Approver tambah pengurus" on public.pengurus
  for insert to authenticated with check (app_private.is_approver());
create policy "Approver ubah pengurus" on public.pengurus
  for update to authenticated using (app_private.is_approver()) with check (app_private.is_approver());
create policy "Approver hapus pengurus" on public.pengurus
  for delete to authenticated using (app_private.is_approver());

create policy "Approver baca log audit" on public.log_audit
  for select to authenticated using (app_private.is_approver());
create policy "Pengurus tulis log audit" on public.log_audit
  for insert to authenticated with check (app_private.is_pengurus_aktif());
