# Unggah Satu Dokumen di Notulensi Baru

## Hasil yang Dibangun
- Tambahkan pilihan **Unggah satu dokumen** pada halaman Notulensi Baru, hanya untuk akun Approver/Admin.
- Terima satu berkas PDF, Word (.docx), TXT, Markdown, atau RTF dengan batas ukuran yang jelas.
- Setelah dipilih, baca isi dokumen lalu jalankan AI untuk merapikan dan mengelompokkan isinya ke kolom yang sudah tersedia: tema, tanggal, waktu, tempat, pemimpin, notulis, pembahasan, keputusan, hal urgen, anggaran, peserta, dan tindak lanjut.
- Tampilkan nama berkas, proses pembacaan/AI, serta pesan kesalahan yang jelas. Formulir tetap dapat diisi manual bila pembacaan atau AI gagal.
- Hasil AI hanya mengisi formulir untuk diperiksa dan dikoreksi; dokumen tidak langsung disimpan atau diterbitkan.
- Bila pengguna memilih lebih dari satu berkas, arahkan ke menu **Unggah** untuk pemrosesan banyak berkas.

## Tampilan dan Alur
1. Approver membuka **Notulensi Baru**.
2. Pada bagian awal tersedia pilihan tempel catatan yang sudah ada dan unggah satu dokumen.
3. Setelah satu dokumen dipilih, sistem menampilkan status “membaca dokumen” lalu “merapikan dengan AI”.
4. Formulir terisi otomatis dan tetap berada di halaman yang sama untuk ditinjau.
5. Penyimpanan tetap memakai tombol **Simpan & terbitkan** yang sudah ada.

## Detail Teknis
- Gunakan pembaca berkas dan fungsi AI yang sudah dipakai menu Unggah agar hasil dan tipe berkas konsisten.
- Batasi pemilih berkas ke satu dokumen dan cek hak akses dari sesi aktif sebelum menampilkan serta menjalankan alur.
- Pertahankan isi formulir yang telah diisi; hasil AI melengkapi menggunakan aturan penggabungan yang sudah ada.
- Uji peran Approver, pembatasan satu berkas, dokumen valid/tidak valid, kegagalan AI, serta tampilan ponsel.
