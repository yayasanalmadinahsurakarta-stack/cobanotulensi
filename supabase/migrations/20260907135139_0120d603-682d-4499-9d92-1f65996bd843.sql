
-- 1. Fungsi pembantu
create or replace function public.is_pengurus_aktif()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from pengurus where user_id = auth.uid() and aktif = true);
$$;

create or replace function public.is_approver()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from pengurus where user_id = auth.uid() and aktif = true and peran = 'approver');
$$;

revoke all on function public.is_pengurus_aktif() from public;
revoke all on function public.is_approver() from public;
grant execute on function public.is_pengurus_aktif() to authenticated;
grant execute on function public.is_approver() to authenticated;

-- fungsi penautan akun saat login pertama
create or replace function public.tautkan_akun_pengurus()
returns table (terdaftar boolean, nama_lengkap text, peran peran_pengurus)
language plpgsql security definer
set search_path = public as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or v_email = '' then
    return query select false, null::text, null::peran_pengurus;
    return;
  end if;

  update pengurus p
     set user_id = auth.uid()
   where lower(p.email) = v_email
     and p.aktif = true
     and p.user_id is distinct from auth.uid();

  return query
    select true, p.nama_lengkap, p.peran
      from pengurus p
     where p.user_id = auth.uid() and p.aktif = true
     limit 1;

  if not found then
    return query select false, null::text, null::peran_pengurus;
  end if;
end;
$$;

revoke all on function public.tautkan_akun_pengurus() from public;
grant execute on function public.tautkan_akun_pengurus() to authenticated;

-- 2. Bersihkan kebijakan lama
drop policy if exists "Pengurus membaca semua notulensi" on public.notulensi;
drop policy if exists "Pengurus membuat notulensi" on public.notulensi;
drop policy if exists "Pengurus mengubah notulensi" on public.notulensi;
drop policy if exists "Umum membaca notulensi publik" on public.notulensi;
drop policy if exists "Pengurus mengelola peserta" on public.peserta;
drop policy if exists "Umum membaca peserta notulensi publik" on public.peserta;
drop policy if exists "Pengurus mengelola tindak lanjut" on public.tindak_lanjut;
drop policy if exists "Umum membaca tindak lanjut notulensi publik" on public.tindak_lanjut;
drop policy if exists "Approver mengelola pengurus" on public.pengurus;
drop policy if exists "Pengurus membaca daftar pengurus" on public.pengurus;
drop policy if exists "Pengurus membaca log audit" on public.log_audit;
drop policy if exists "Pengurus menulis log audit" on public.log_audit;

alter table public.notulensi enable row level security;
alter table public.peserta enable row level security;
alter table public.tindak_lanjut enable row level security;
alter table public.pengurus enable row level security;
alter table public.log_audit enable row level security;

-- 3. notulensi
create policy "Publik baca notulensi terbit" on public.notulensi
  for select to anon, authenticated
  using (status_publikasi = 'terbit' and visibilitas = 'publik' and dihapus_pada is null);

create policy "Pengurus baca semua notulensi" on public.notulensi
  for select to authenticated
  using (public.is_pengurus_aktif() and dihapus_pada is null);

create policy "Approver baca notulensi terhapus" on public.notulensi
  for select to authenticated using (public.is_approver());

create policy "Pengurus buat notulensi" on public.notulensi
  for insert to authenticated with check (public.is_pengurus_aktif());

create policy "Pengurus ubah notulensi" on public.notulensi
  for update to authenticated
  using (public.is_pengurus_aktif()) with check (public.is_pengurus_aktif());

-- 4. peserta & tindak_lanjut
create policy "Publik baca peserta notulensi publik" on public.peserta
  for select to anon
  using (exists (select 1 from notulensi n where n.id = peserta.notulensi_id
    and n.status_publikasi = 'terbit' and n.visibilitas = 'publik' and n.dihapus_pada is null));

create policy "Pengurus kelola peserta" on public.peserta
  for all to authenticated
  using (public.is_pengurus_aktif()) with check (public.is_pengurus_aktif());

create policy "Publik baca tindak lanjut publik" on public.tindak_lanjut
  for select to anon
  using (exists (select 1 from notulensi n where n.id = tindak_lanjut.notulensi_id
    and n.status_publikasi = 'terbit' and n.visibilitas = 'publik' and n.dihapus_pada is null));

create policy "Pengurus kelola tindak lanjut" on public.tindak_lanjut
  for all to authenticated
  using (public.is_pengurus_aktif()) with check (public.is_pengurus_aktif());

-- 5. pengurus
create policy "Pengurus baca daftar pengurus" on public.pengurus
  for select to authenticated using (public.is_pengurus_aktif());
create policy "Approver tambah pengurus" on public.pengurus
  for insert to authenticated with check (public.is_approver());
create policy "Approver ubah pengurus" on public.pengurus
  for update to authenticated using (public.is_approver()) with check (public.is_approver());
create policy "Approver hapus pengurus" on public.pengurus
  for delete to authenticated using (public.is_approver());

-- 6. log_audit
create policy "Approver baca log audit" on public.log_audit
  for select to authenticated using (public.is_approver());
create policy "Pengurus tulis log audit" on public.log_audit
  for insert to authenticated with check (public.is_pengurus_aktif());

-- 7. Grants
grant select on public.notulensi to anon;
grant select on public.peserta to anon;
grant select on public.tindak_lanjut to anon;
grant select, insert, update on public.notulensi to authenticated;
grant select, insert, update, delete on public.peserta to authenticated;
grant select, insert, update, delete on public.tindak_lanjut to authenticated;
grant select, insert, update, delete on public.pengurus to authenticated;
grant select, insert on public.log_audit to authenticated;
grant all on public.notulensi, public.peserta, public.tindak_lanjut, public.pengurus, public.log_audit to service_role;
