-- 1. Semua notulensi unggahan pengurus otomatis disetujui
CREATE OR REPLACE FUNCTION public.jaga_wewenang_notulensi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tahun int;
  v_bulan int;
  v_urut int;
  v_romawi text[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.nomor := NULL;
  ELSE
    IF NOT app_private.is_approver() AND NEW.dihapus_pada IS DISTINCT FROM OLD.dihapus_pada THEN
      RAISE EXCEPTION 'Hanya approver yang boleh menghapus atau memulihkan notulensi';
    END IF;
    IF OLD.nomor IS NOT NULL THEN
      NEW.nomor := OLD.nomor;
    END IF;
  END IF;

  IF NEW.nomor IS NULL AND NEW.status_publikasi = 'terbit' THEN
    v_tahun := EXTRACT(year FROM NEW.tanggal)::int;
    v_bulan := EXTRACT(month FROM NEW.tanggal)::int;
    SELECT COALESCE(MAX(NULLIF(split_part(nomor, '/', 1), '')::int), 0) + 1
      INTO v_urut
      FROM public.notulensi
     WHERE nomor IS NOT NULL
       AND split_part(nomor, '/', 4) = v_tahun::text;
    NEW.nomor := lpad(v_urut::text, 3, '0') || '/NOT-PH/' || v_romawi[v_bulan] || '/' || v_tahun::text;
    IF NEW.diterbitkan_pada IS NULL THEN
      NEW.diterbitkan_pada := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS jaga_wewenang_notulensi_insert ON public.notulensi;
CREATE TRIGGER jaga_wewenang_notulensi_insert
  BEFORE INSERT ON public.notulensi
  FOR EACH ROW EXECUTE FUNCTION public.jaga_wewenang_notulensi();

-- 2. Semua notulensi lama menjadi terbit dan boleh dibaca umum
UPDATE public.notulensi
   SET status_publikasi = 'terbit',
       visibilitas = 'publik',
       catatan_penolakan = NULL
 WHERE dihapus_pada IS NULL
   AND (status_publikasi <> 'terbit' OR visibilitas <> 'publik');

-- 3. Tempat menyimpan kunci Google Gemini milik yayasan (tidak bisa dibaca peramban)
CREATE TABLE IF NOT EXISTS public.rahasia_ai (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  kunci_google text,
  diubah_pada timestamptz NOT NULL DEFAULT now(),
  diubah_oleh text
);

GRANT INSERT, UPDATE ON public.rahasia_ai TO authenticated;
GRANT ALL ON public.rahasia_ai TO service_role;
ALTER TABLE public.rahasia_ai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approver menyimpan kunci ai" ON public.rahasia_ai;
CREATE POLICY "approver menyimpan kunci ai" ON public.rahasia_ai
  FOR UPDATE TO authenticated
  USING (app_private.is_approver())
  WITH CHECK (app_private.is_approver());

DROP POLICY IF EXISTS "approver menambah kunci ai" ON public.rahasia_ai;
CREATE POLICY "approver menambah kunci ai" ON public.rahasia_ai
  FOR INSERT TO authenticated
  WITH CHECK (app_private.is_approver());

INSERT INTO public.rahasia_ai (id, kunci_google) VALUES (true, NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Model AI baku
UPDATE public.pengaturan SET nilai = 'gemini-3.1-pro-preview' WHERE kunci = 'model_ai';