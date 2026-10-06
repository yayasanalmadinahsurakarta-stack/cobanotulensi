-- 1. Username pengurus
ALTER TABLE public.pengurus ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS pengurus_username_unik ON public.pengurus (lower(username)) WHERE username IS NOT NULL;

UPDATE public.pengurus SET username = 'admin'
 WHERE lower(email) = 'yayasanalmadinahsurakarta@gmail.com' AND username IS NULL;

INSERT INTO public.pengurus (nama_lengkap, jabatan, email, username, peran, aktif)
SELECT * FROM (VALUES
  ('Ustadz Jauhari, Lc.', 'Ketua Yayasan', 'jauhari@almadinah.local', 'jauhari', 'approver'::peran_pengurus, true),
  ('Aswab Mahassin', 'Ketua 2', 'aswab@almadinah.local', 'aswab', 'approver'::peran_pengurus, true),
  ('Arief Wijaya', 'Sekretaris 1', 'arief@almadinah.local', 'arief', 'approver'::peran_pengurus, true),
  ('Fachri Muhammad', 'Sekretaris 2', 'fachri@almadinah.local', 'fachri', 'editor'::peran_pengurus, true),
  ('Bambang Pamilih', 'Bendahara 1', 'bambang@almadinah.local', 'bambang', 'editor'::peran_pengurus, true),
  ('Galih Catur', 'Bendahara 2', 'galih@almadinah.local', 'galih', 'editor'::peran_pengurus, true),
  ('Nendyo Susilo', 'Bendahara 3', 'nendyo@almadinah.local', 'nendyo', 'editor'::peran_pengurus, true),
  ('Muhammad Muslim', 'Personalia', 'muslim@almadinah.local', 'muslim', 'editor'::peran_pengurus, true)
) AS t(nama_lengkap, jabatan, email, username, peran, aktif)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pengurus p WHERE lower(p.nama_lengkap) = lower(t.nama_lengkap) OR lower(p.email) = lower(t.email)
);

-- 2. Fungsi bantu
CREATE OR REPLACE FUNCTION app_private.pengurus_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id FROM pengurus WHERE user_id = auth.uid() AND aktif LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.boleh_komentar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM pengurus
     WHERE user_id = auth.uid() AND aktif
       AND (peran = 'approver' OR lower(coalesce(jabatan,'')) LIKE 'ketua%')
  );
$$;

-- 3. Notifikasi
CREATE TABLE IF NOT EXISTS public.notifikasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pengurus_id uuid NOT NULL REFERENCES public.pengurus(id) ON DELETE CASCADE,
  jenis text NOT NULL DEFAULT 'umum',
  judul text NOT NULL,
  pesan text,
  tautan text,
  notulensi_id uuid REFERENCES public.notulensi(id) ON DELETE CASCADE,
  dibaca_pada timestamptz,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifikasi_penerima ON public.notifikasi (pengurus_id, dibuat_pada DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifikasi TO authenticated;
GRANT ALL ON public.notifikasi TO service_role;
ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pengurus baca notifikasi sendiri" ON public.notifikasi;
CREATE POLICY "Pengurus baca notifikasi sendiri" ON public.notifikasi FOR SELECT TO authenticated
  USING (pengurus_id = app_private.pengurus_id());
DROP POLICY IF EXISTS "Pengurus tandai notifikasi sendiri" ON public.notifikasi;
CREATE POLICY "Pengurus tandai notifikasi sendiri" ON public.notifikasi FOR UPDATE TO authenticated
  USING (pengurus_id = app_private.pengurus_id()) WITH CHECK (pengurus_id = app_private.pengurus_id());
DROP POLICY IF EXISTS "Pengurus hapus notifikasi sendiri" ON public.notifikasi;
CREATE POLICY "Pengurus hapus notifikasi sendiri" ON public.notifikasi FOR DELETE TO authenticated
  USING (pengurus_id = app_private.pengurus_id());

-- 4. Bacaan notulensi
CREATE TABLE IF NOT EXISTS public.bacaan_notulensi (
  pengurus_id uuid NOT NULL REFERENCES public.pengurus(id) ON DELETE CASCADE,
  notulensi_id uuid NOT NULL REFERENCES public.notulensi(id) ON DELETE CASCADE,
  dibaca_pada timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pengurus_id, notulensi_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bacaan_notulensi TO authenticated;
GRANT ALL ON public.bacaan_notulensi TO service_role;
ALTER TABLE public.bacaan_notulensi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pengurus kelola bacaan sendiri" ON public.bacaan_notulensi;
CREATE POLICY "Pengurus kelola bacaan sendiri" ON public.bacaan_notulensi FOR ALL TO authenticated
  USING (pengurus_id = app_private.pengurus_id()) WITH CHECK (pengurus_id = app_private.pengurus_id());

-- 5. Komentar
CREATE TABLE IF NOT EXISTS public.komentar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notulensi_id uuid NOT NULL REFERENCES public.notulensi(id) ON DELETE CASCADE,
  pengurus_id uuid REFERENCES public.pengurus(id) ON DELETE SET NULL,
  penulis_nama text NOT NULL,
  penulis_jabatan text,
  isi text NOT NULL,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS komentar_notulensi ON public.komentar (notulensi_id, dibuat_pada);
GRANT SELECT ON public.komentar TO anon;
GRANT SELECT, INSERT, DELETE ON public.komentar TO authenticated;
GRANT ALL ON public.komentar TO service_role;
ALTER TABLE public.komentar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Publik baca komentar notulensi publik" ON public.komentar;
CREATE POLICY "Publik baca komentar notulensi publik" ON public.komentar FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.notulensi n WHERE n.id = komentar.notulensi_id
    AND n.status_publikasi = 'terbit' AND n.visibilitas = 'publik' AND n.dihapus_pada IS NULL));
DROP POLICY IF EXISTS "Pengurus baca semua komentar" ON public.komentar;
CREATE POLICY "Pengurus baca semua komentar" ON public.komentar FOR SELECT TO authenticated
  USING (app_private.is_pengurus_aktif());
DROP POLICY IF EXISTS "Ketua dan approver menulis komentar" ON public.komentar;
CREATE POLICY "Ketua dan approver menulis komentar" ON public.komentar FOR INSERT TO authenticated
  WITH CHECK (app_private.boleh_komentar() AND pengurus_id = app_private.pengurus_id());
DROP POLICY IF EXISTS "Penulis atau approver hapus komentar" ON public.komentar;
CREATE POLICY "Penulis atau approver hapus komentar" ON public.komentar FOR DELETE TO authenticated
  USING (pengurus_id = app_private.pengurus_id() OR app_private.is_approver());

-- 6. Pemicu notifikasi
CREATE OR REPLACE FUNCTION public.notifikasi_notulensi_baru()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notifikasi (pengurus_id, jenis, judul, pesan, tautan, notulensi_id)
  SELECT p.id, 'notulensi_baru', 'Notulensi baru: ' || NEW.tema,
         'Ditambahkan oleh ' || coalesce(NEW.dibuat_oleh, 'pengurus'),
         '/admin/notulensi/' || NEW.id, NEW.id
    FROM public.pengurus p
   WHERE p.aktif AND lower(coalesce(p.email,'')) <> lower(coalesce(NEW.dibuat_oleh,''));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notifikasi_notulensi_baru ON public.notulensi;
CREATE TRIGGER notifikasi_notulensi_baru AFTER INSERT ON public.notulensi
FOR EACH ROW EXECUTE FUNCTION public.notifikasi_notulensi_baru();

CREATE OR REPLACE FUNCTION public.notifikasi_tindak_lanjut()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_tema text;
BEGIN
  IF NEW.pj_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.pj_id IS NOT DISTINCT FROM NEW.pj_id THEN RETURN NEW; END IF;
  SELECT tema INTO v_tema FROM public.notulensi WHERE id = NEW.notulensi_id;
  INSERT INTO public.notifikasi (pengurus_id, jenis, judul, pesan, tautan, notulensi_id)
  VALUES (NEW.pj_id, 'tindak_lanjut', 'Anda menjadi penanggung jawab',
          NEW.tugas || coalesce(' — tenggat ' || to_char(NEW.deadline, 'DD-MM-YYYY'), '')
            || coalesce(' (rapat: ' || v_tema || ')', ''),
          '/admin/notulensi/' || NEW.notulensi_id, NEW.notulensi_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notifikasi_tindak_lanjut ON public.tindak_lanjut;
CREATE TRIGGER notifikasi_tindak_lanjut AFTER INSERT OR UPDATE OF pj_id ON public.tindak_lanjut
FOR EACH ROW EXECUTE FUNCTION public.notifikasi_tindak_lanjut();

CREATE OR REPLACE FUNCTION public.notifikasi_komentar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_tema text;
BEGIN
  SELECT tema INTO v_tema FROM public.notulensi WHERE id = NEW.notulensi_id;
  INSERT INTO public.notifikasi (pengurus_id, jenis, judul, pesan, tautan, notulensi_id)
  SELECT p.id, 'komentar', 'Masukan baru dari ' || NEW.penulis_nama,
         left(NEW.isi, 160) || coalesce(' (rapat: ' || v_tema || ')', ''),
         '/admin/notulensi/' || NEW.notulensi_id, NEW.notulensi_id
    FROM public.pengurus p
   WHERE p.aktif AND p.id IS DISTINCT FROM NEW.pengurus_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notifikasi_komentar ON public.komentar;
CREATE TRIGGER notifikasi_komentar AFTER INSERT ON public.komentar
FOR EACH ROW EXECUTE FUNCTION public.notifikasi_komentar();