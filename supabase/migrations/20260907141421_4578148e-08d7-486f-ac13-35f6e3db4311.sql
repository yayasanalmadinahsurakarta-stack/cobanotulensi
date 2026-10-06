ALTER TABLE public.notulensi
  ADD COLUMN IF NOT EXISTS nama_berkas_asli text,
  ADD COLUMN IF NOT EXISTS berkas_path text;

DROP POLICY IF EXISTS "Pengurus baca berkas notulensi" ON storage.objects;
CREATE POLICY "Pengurus baca berkas notulensi" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notulensi-berkas' AND app_private.is_pengurus_aktif());

DROP POLICY IF EXISTS "Pengurus unggah berkas notulensi" ON storage.objects;
CREATE POLICY "Pengurus unggah berkas notulensi" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notulensi-berkas' AND app_private.is_pengurus_aktif());

DROP POLICY IF EXISTS "Pengurus ubah berkas notulensi" ON storage.objects;
CREATE POLICY "Pengurus ubah berkas notulensi" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'notulensi-berkas' AND app_private.is_pengurus_aktif())
  WITH CHECK (bucket_id = 'notulensi-berkas' AND app_private.is_pengurus_aktif());