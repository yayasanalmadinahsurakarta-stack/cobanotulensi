INSERT INTO public.pengaturan (kunci, nilai, keterangan) VALUES
  ('email_pengirim', '', 'Alamat email pengirim pengingat, misal notulensi@domainanda.com'),
  ('email_sekretaris', 'yayasanalmadinahsurakarta@gmail.com', 'Alamat email sekretaris penerima surat rekap harian'),
  ('hari_pengingat', '7,3,1,0', 'Sisa hari sebelum tenggat yang memicu pengingat'),
  ('pengingat_aktif', 'ya', 'Sakelar pengiriman pengingat harian (ya/tidak)')
ON CONFLICT (kunci) DO NOTHING;