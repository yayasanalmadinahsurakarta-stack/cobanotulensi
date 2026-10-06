CREATE OR REPLACE VIEW public.notulensi_publik_ringkas
WITH (security_invoker = true) AS
SELECT
  n.id,
  n.nomor,
  n.tanggal,
  n.tema,
  left(n.pembahasan, 200) AS cuplikan,
  (length(n.pembahasan) > 200) AS ada_lanjutan,
  n.hal_urgen,
  n.hal_urgen_tampil,
  n.diterbitkan_pada,
  COALESCE((SELECT array_agg(DISTINCT t.status::text) FROM public.tindak_lanjut t WHERE t.notulensi_id = n.id), '{}') AS status_tindak_lanjut,
  COALESCE((SELECT array_agg(DISTINCT t.pj_nama) FROM public.tindak_lanjut t WHERE t.notulensi_id = n.id AND t.pj_nama IS NOT NULL AND t.pj_nama <> ''), '{}') AS daftar_pj
FROM public.notulensi n
WHERE n.status_publikasi = 'terbit'
  AND n.visibilitas = 'publik'
  AND n.dihapus_pada IS NULL;

GRANT SELECT ON public.notulensi_publik_ringkas TO anon, authenticated;