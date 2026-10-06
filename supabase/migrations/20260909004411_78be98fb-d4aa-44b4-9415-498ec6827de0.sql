ALTER TABLE public.komentar ADD COLUMN IF NOT EXISTS induk_id uuid REFERENCES public.komentar(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS komentar_induk_idx ON public.komentar(induk_id);

CREATE TABLE IF NOT EXISTS public.reaksi_komentar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  komentar_id uuid NOT NULL REFERENCES public.komentar(id) ON DELETE CASCADE,
  pengurus_id uuid NOT NULL REFERENCES public.pengurus(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (komentar_id, pengurus_id, emoji)
);

GRANT SELECT ON public.reaksi_komentar TO anon;
GRANT SELECT, INSERT, DELETE ON public.reaksi_komentar TO authenticated;
GRANT ALL ON public.reaksi_komentar TO service_role;

ALTER TABLE public.reaksi_komentar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publik baca reaksi notulensi publik" ON public.reaksi_komentar
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.komentar k
  JOIN public.notulensi n ON n.id = k.notulensi_id
  WHERE k.id = reaksi_komentar.komentar_id
    AND n.status_publikasi = 'terbit'
    AND n.visibilitas = 'publik'
    AND n.dihapus_pada IS NULL
));

CREATE POLICY "Pengurus baca semua reaksi" ON public.reaksi_komentar
FOR SELECT TO authenticated
USING (app_private.is_pengurus_aktif());

CREATE POLICY "Pengurus tambah reaksi sendiri" ON public.reaksi_komentar
FOR INSERT TO authenticated
WITH CHECK (app_private.is_pengurus_aktif() AND pengurus_id = app_private.pengurus_id());

CREATE POLICY "Pengurus atau approver hapus reaksi" ON public.reaksi_komentar
FOR DELETE TO authenticated
USING (pengurus_id = app_private.pengurus_id() OR app_private.is_approver());

CREATE OR REPLACE FUNCTION public.notifikasi_komentar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tema text;
  v_judul text;
BEGIN
  SELECT tema INTO v_tema FROM public.notulensi WHERE id = NEW.notulensi_id;
  IF NEW.induk_id IS NULL THEN
    v_judul := 'Masukan baru dari ' || NEW.penulis_nama;
  ELSE
    v_judul := 'Tanggapan baru dari ' || NEW.penulis_nama;
  END IF;
  INSERT INTO public.notifikasi (pengurus_id, jenis, judul, pesan, tautan, notulensi_id)
  SELECT p.id, 'komentar', v_judul,
         left(NEW.isi, 160) || coalesce(' (rapat: ' || v_tema || ')', ''),
         '/notulensi/' || NEW.notulensi_id, NEW.notulensi_id
    FROM public.pengurus p
   WHERE p.aktif AND p.id IS DISTINCT FROM NEW.pengurus_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notifikasi_reaksi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nama text;
  v_pemilik uuid;
  v_notulensi uuid;
  v_isi text;
BEGIN
  SELECT nama_lengkap INTO v_nama FROM public.pengurus WHERE id = NEW.pengurus_id;
  SELECT pengurus_id, notulensi_id, isi INTO v_pemilik, v_notulensi, v_isi
    FROM public.komentar WHERE id = NEW.komentar_id;
  IF v_pemilik IS NULL OR v_pemilik = NEW.pengurus_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifikasi (pengurus_id, jenis, judul, pesan, tautan, notulensi_id)
  VALUES (v_pemilik, 'komentar',
          coalesce(v_nama, 'Pengurus') || ' memberi reaksi ' || NEW.emoji,
          left(coalesce(v_isi, ''), 120),
          '/notulensi/' || v_notulensi, v_notulensi);
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notifikasi_reaksi() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifikasi_reaksi ON public.reaksi_komentar;
CREATE TRIGGER notifikasi_reaksi AFTER INSERT ON public.reaksi_komentar
FOR EACH ROW EXECUTE FUNCTION public.notifikasi_reaksi();