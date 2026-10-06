create type status_publikasi as enum ('draft', 'menunggu', 'terbit');
create type visibilitas_notulensi as enum ('internal', 'publik');
create type status_tindak_lanjut as enum ('Belum dibahas', 'Butuh Tindak Lanjut', 'Sudah dibahas');
create type kehadiran_peserta as enum ('Hadir', 'Izin', 'Tidak Hadir');
create type peran_pengurus as enum ('editor', 'approver');

create table public.pengurus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nama_lengkap text not null,
  jabatan text,
  no_wa text,
  email text not null unique,
  peran peran_pengurus not null default 'editor',
  aktif boolean not null default true,
  dibuat_pada timestamptz default now()
);
grant select, insert, update, delete on public.pengurus to authenticated;
grant all on public.pengurus to service_role;
alter table public.pengurus enable row level security;

create table public.notulensi (
  id uuid primary key default gen_random_uuid(),
  nomor text unique,
  tanggal date not null,
  waktu_mulai time,
  waktu_selesai time,
  tempat text,
  pemimpin text,
  notulis text,
  tema text not null,
  pembahasan text not null default '',
  keputusan text,
  hal_urgen text,
  anggaran numeric(15,2),
  link_lampiran text,
  induk_id uuid references public.notulensi(id) on delete set null,
  visibilitas visibilitas_notulensi not null default 'internal',
  status_publikasi status_publikasi not null default 'draft',
  catatan_penolakan text,
  diterbitkan_pada timestamptz,
  disetujui_oleh text,
  dibuat_oleh text not null,
  dibuat_pada timestamptz default now(),
  diubah_oleh text,
  diubah_pada timestamptz,
  dihapus_pada timestamptz
);
grant select on public.notulensi to anon;
grant select, insert, update on public.notulensi to authenticated;
grant all on public.notulensi to service_role;
alter table public.notulensi enable row level security;

create table public.tindak_lanjut (
  id uuid primary key default gen_random_uuid(),
  notulensi_id uuid not null references public.notulensi(id) on delete cascade,
  urutan int not null default 1,
  tugas text not null,
  pj_id uuid references public.pengurus(id) on delete set null,
  pj_nama text,
  deadline date,
  status status_tindak_lanjut not null default 'Belum dibahas',
  selesai_pada timestamptz,
  catatan text
);
grant select on public.tindak_lanjut to anon;
grant select, insert, update, delete on public.tindak_lanjut to authenticated;
grant all on public.tindak_lanjut to service_role;
alter table public.tindak_lanjut enable row level security;

create table public.peserta (
  id uuid primary key default gen_random_uuid(),
  notulensi_id uuid not null references public.notulensi(id) on delete cascade,
  nama text not null,
  jabatan text,
  kehadiran kehadiran_peserta not null default 'Hadir'
);
grant select on public.peserta to anon;
grant select, insert, update, delete on public.peserta to authenticated;
grant all on public.peserta to service_role;
alter table public.peserta enable row level security;

create table public.log_audit (
  id bigserial primary key,
  waktu timestamptz default now(),
  email text not null,
  aksi text not null,
  entitas text not null,
  entitas_id uuid,
  ringkasan text
);
grant select, insert on public.log_audit to authenticated;
grant all on public.log_audit to service_role;
alter table public.log_audit enable row level security;

create index notulensi_status_visibilitas_idx on public.notulensi (status_publikasi, visibilitas);
create index notulensi_tanggal_idx on public.notulensi (tanggal desc);
create index notulensi_induk_idx on public.notulensi (induk_id);
create index tindak_lanjut_notulensi_idx on public.tindak_lanjut (notulensi_id);
create index tindak_lanjut_pj_status_idx on public.tindak_lanjut (pj_id, status);
create index tindak_lanjut_deadline_status_idx on public.tindak_lanjut (deadline, status);
create index peserta_notulensi_idx on public.peserta (notulensi_id);

create or replace function public.adalah_pengurus(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pengurus where user_id = _user_id and aktif);
$$;

create or replace function public.punya_peran(_user_id uuid, _peran peran_pengurus)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pengurus where user_id = _user_id and aktif and peran = _peran);
$$;

create policy "Umum membaca notulensi publik" on public.notulensi for select to anon
using (status_publikasi = 'terbit' and visibilitas = 'publik' and dihapus_pada is null);

create policy "Pengurus membaca semua notulensi" on public.notulensi for select to authenticated
using (public.adalah_pengurus(auth.uid()));

create policy "Pengurus membuat notulensi" on public.notulensi for insert to authenticated
with check (public.adalah_pengurus(auth.uid()));

create policy "Pengurus mengubah notulensi" on public.notulensi for update to authenticated
using (public.adalah_pengurus(auth.uid())) with check (public.adalah_pengurus(auth.uid()));

create policy "Umum membaca peserta notulensi publik" on public.peserta for select to anon
using (exists (select 1 from public.notulensi n where n.id = peserta.notulensi_id
  and n.status_publikasi = 'terbit' and n.visibilitas = 'publik' and n.dihapus_pada is null));

create policy "Pengurus mengelola peserta" on public.peserta for all to authenticated
using (public.adalah_pengurus(auth.uid())) with check (public.adalah_pengurus(auth.uid()));

create policy "Umum membaca tindak lanjut notulensi publik" on public.tindak_lanjut for select to anon
using (exists (select 1 from public.notulensi n where n.id = tindak_lanjut.notulensi_id
  and n.status_publikasi = 'terbit' and n.visibilitas = 'publik' and n.dihapus_pada is null));

create policy "Pengurus mengelola tindak lanjut" on public.tindak_lanjut for all to authenticated
using (public.adalah_pengurus(auth.uid())) with check (public.adalah_pengurus(auth.uid()));

create policy "Pengurus membaca daftar pengurus" on public.pengurus for select to authenticated
using (public.adalah_pengurus(auth.uid()));

create policy "Approver mengelola pengurus" on public.pengurus for all to authenticated
using (public.punya_peran(auth.uid(), 'approver')) with check (public.punya_peran(auth.uid(), 'approver'));

create policy "Pengurus membaca log audit" on public.log_audit for select to authenticated
using (public.adalah_pengurus(auth.uid()));

create policy "Pengurus menulis log audit" on public.log_audit for insert to authenticated
with check (public.adalah_pengurus(auth.uid()));