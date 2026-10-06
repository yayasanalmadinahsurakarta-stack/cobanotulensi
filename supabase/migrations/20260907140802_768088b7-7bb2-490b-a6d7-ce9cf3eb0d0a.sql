CREATE TABLE public.pengaturan (
  kunci text PRIMARY KEY,
  nilai text NOT NULL,
  keterangan text,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pengaturan TO authenticated;
GRANT ALL ON public.pengaturan TO service_role;

ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pengurus aktif membaca pengaturan"
  ON public.pengaturan FOR SELECT TO authenticated
  USING (app_private.is_pengurus_aktif());

CREATE POLICY "approver menambah pengaturan"
  ON public.pengaturan FOR INSERT TO authenticated
  WITH CHECK (app_private.is_approver());

CREATE POLICY "approver mengubah pengaturan"
  ON public.pengaturan FOR UPDATE TO authenticated
  USING (app_private.is_approver())
  WITH CHECK (app_private.is_approver());

CREATE OR REPLACE FUNCTION public.set_diubah_pada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.diubah_pada = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_diubah_pada() FROM public, anon, authenticated;

CREATE TRIGGER set_diubah_pada
BEFORE UPDATE ON public.pengaturan
FOR EACH ROW EXECUTE FUNCTION public.set_diubah_pada();

INSERT INTO public.pengaturan (kunci, nilai, keterangan) VALUES
  ('model_ai', 'google/gemini-2.5-flash', 'Nama model AI yang dipakai untuk merapikan notulensi');
