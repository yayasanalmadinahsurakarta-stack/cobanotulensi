CREATE TYPE tampil_hal_urgen AS ENUM ('tidak', 'disorot', 'teks_berjalan');

ALTER TABLE public.notulensi
  ADD COLUMN hal_urgen_tampil tampil_hal_urgen NOT NULL DEFAULT 'tidak';

CREATE OR REPLACE FUNCTION public.buat_nomor_notulen(p_tanggal date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tahun int := EXTRACT(year FROM p_tanggal)::int;
  v_bulan int := EXTRACT(month FROM p_tanggal)::int;
  v_urut int;
  v_romawi text[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
  IF NOT app_private.is_pengurus_aktif() THEN
    RAISE EXCEPTION 'Tidak berwenang';
  END IF;
  SELECT COALESCE(MAX(NULLIF(split_part(nomor, '/', 1), '')::int), 0) + 1
    INTO v_urut
    FROM public.notulensi
   WHERE nomor IS NOT NULL
     AND split_part(nomor, '/', 4) = v_tahun::text;
  RETURN lpad(v_urut::text, 3, '0') || '/NOT-PH/' || v_romawi[v_bulan] || '/' || v_tahun::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buat_nomor_notulen(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buat_nomor_notulen(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.jaga_wewenang_notulensi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF app_private.is_approver() THEN
    RETURN NEW;
  END IF;
  IF NEW.status_publikasi = 'terbit' OR OLD.status_publikasi = 'terbit' THEN
    RAISE EXCEPTION 'Hanya approver yang boleh menerbitkan atau mengubah notulensi yang sudah terbit';
  END IF;
  IF NEW.dihapus_pada IS DISTINCT FROM OLD.dihapus_pada THEN
    RAISE EXCEPTION 'Hanya approver yang boleh menghapus atau memulihkan notulensi';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jaga_wewenang_notulensi ON public.notulensi;
CREATE TRIGGER jaga_wewenang_notulensi
  BEFORE UPDATE ON public.notulensi
  FOR EACH ROW EXECUTE FUNCTION public.jaga_wewenang_notulensi();

CREATE OR REPLACE FUNCTION public.jaga_pengurus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sisa int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Anda tidak dapat menghapus akun Anda sendiri';
    END IF;
    IF OLD.aktif AND OLD.peran = 'approver' THEN
      SELECT count(*) INTO v_sisa FROM public.pengurus
       WHERE aktif AND peran = 'approver' AND id <> OLD.id;
      IF v_sisa = 0 THEN
        RAISE EXCEPTION 'Ini satu-satunya approver. Angkat approver lain lebih dulu.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.aktif AND NOT NEW.aktif AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Anda tidak dapat menonaktifkan akun Anda sendiri';
  END IF;

  IF OLD.aktif AND OLD.peran = 'approver'
     AND (NOT NEW.aktif OR NEW.peran <> 'approver') THEN
    SELECT count(*) INTO v_sisa FROM public.pengurus
     WHERE aktif AND peran = 'approver' AND id <> OLD.id;
    IF v_sisa = 0 THEN
      RAISE EXCEPTION 'Ini satu-satunya approver. Angkat approver lain lebih dulu.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jaga_pengurus ON public.pengurus;
CREATE TRIGGER jaga_pengurus
  BEFORE UPDATE OR DELETE ON public.pengurus
  FOR EACH ROW EXECUTE FUNCTION public.jaga_pengurus();