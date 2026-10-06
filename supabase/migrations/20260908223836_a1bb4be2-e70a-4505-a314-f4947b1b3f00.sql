DROP POLICY IF EXISTS "Ketua dan approver menulis komentar" ON public.komentar;
CREATE POLICY "Pengurus aktif menulis komentar"
ON public.komentar FOR INSERT TO authenticated
WITH CHECK (app_private.is_pengurus_aktif() AND pengurus_id = app_private.pengurus_id());