DROP FUNCTION IF EXISTS public.buat_nomor_notulen(date);

CREATE OR REPLACE FUNCTION public.jaga_wewenang_notulensi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tahun int;
  v_bulan int;
  v_urut int;
  v_romawi text[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
  IF NOT app_private.is_approver() THEN
    IF NEW.status_publikasi = 'terbit' OR OLD.status_publikasi = 'terbit' THEN
      RAISE EXCEPTION 'Hanya approver yang boleh menerbitkan atau mengubah notulensi yang sudah terbit';
    END IF;
    IF NEW.dihapus_pada IS DISTINCT FROM OLD.dihapus_pada THEN
      RAISE EXCEPTION 'Hanya approver yang boleh menghapus atau memulihkan notulensi';
    END IF;
  END IF;

  IF OLD.nomor IS NOT NULL THEN
    NEW.nomor := OLD.nomor;
  ELSIF NEW.status_publikasi = 'terbit' THEN
    v_tahun := EXTRACT(year FROM NEW.tanggal)::int;
    v_bulan := EXTRACT(month FROM NEW.tanggal)::int;
    SELECT COALESCE(MAX(NULLIF(split_part(nomor, '/', 1), '')::int), 0) + 1
      INTO v_urut
      FROM public.notulensi
     WHERE nomor IS NOT NULL
       AND split_part(nomor, '/', 4) = v_tahun::text;
    NEW.nomor := lpad(v_urut::text, 3, '0') || '/NOT-PH/' || v_romawi[v_bulan] || '/' || v_tahun::text;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.jaga_wewenang_notulensi() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jaga_pengurus() FROM PUBLIC, anon, authenticated;