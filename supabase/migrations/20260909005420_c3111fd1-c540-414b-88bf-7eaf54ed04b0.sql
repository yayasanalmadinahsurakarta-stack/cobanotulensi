ALTER TABLE public.notifikasi
  ADD COLUMN IF NOT EXISTS komentar_id uuid REFERENCES public.komentar(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifikasi_komentar_idx
  ON public.notifikasi (komentar_id)
  WHERE komentar_id IS NOT NULL;

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
  INSERT INTO public.notifikasi (pengurus_id, jenis, judul, pesan, tautan, notulensi_id, komentar_id)
  SELECT p.id, 'komentar', v_judul,
         left(NEW.isi, 160) || coalesce(' (rapat: ' || v_tema || ')', ''),
         '/notulensi/' || NEW.notulensi_id || '#komentar-' || NEW.id,
         NEW.notulensi_id,
         NEW.id
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
  INSERT INTO public.notifikasi (pengurus_id, jenis, judul, pesan, tautan, notulensi_id, komentar_id)
  VALUES (v_pemilik, 'komentar',
          coalesce(v_nama, 'Pengurus') || ' memberi reaksi ' || NEW.emoji,
          left(coalesce(v_isi, ''), 120),
          '/notulensi/' || v_notulensi || '#komentar-' || NEW.komentar_id,
          v_notulensi,
          NEW.komentar_id);
  RETURN NEW;
END;
$function$;