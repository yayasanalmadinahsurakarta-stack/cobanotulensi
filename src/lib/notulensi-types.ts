export type StatusPublikasi = "draft" | "menunggu" | "terbit";
export type VisibilitasNotulensi = "internal" | "publik";
export type StatusTindakLanjut = "Belum dibahas" | "Butuh Tindak Lanjut" | "Sudah dibahas";
export type KehadiranPeserta = "Hadir" | "Izin" | "Tidak Hadir";
export type PeranPengurus = "editor" | "approver";
export type TampilHalUrgen = "tidak" | "disorot" | "teks_berjalan";

export type Peserta = {
  id: string;
  nama: string;
  jabatan: string | null;
  kehadiran: KehadiranPeserta;
};

export type TindakLanjut = {
  id: string;
  urutan: number;
  tugas: string;
  pj_nama: string | null;
  deadline: string | null;
  status: StatusTindakLanjut;
  catatan: string | null;
};

export type Notulensi = {
  id: string;
  nomor: string | null;
  tanggal: string;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  tempat: string | null;
  pemimpin: string | null;
  notulis: string | null;
  tema: string;
  pembahasan: string;
  keputusan: string | null;
  hal_urgen: string | null;
  hal_urgen_tampil: TampilHalUrgen;
  anggaran: number | null;
  link_lampiran: string | null;
  induk_id: string | null;
  visibilitas: VisibilitasNotulensi;
  status_publikasi: StatusPublikasi;
  catatan_penolakan: string | null;
  diterbitkan_pada: string | null;
  disetujui_oleh: string | null;
  dibuat_oleh: string;
  dibuat_pada: string | null;
  diubah_oleh: string | null;
  diubah_pada: string | null;
  dihapus_pada: string | null;
  peserta: Peserta[];
  tindak_lanjut: TindakLanjut[];
};

export type Pengurus = {
  id: string;
  user_id: string | null;
  nama_lengkap: string;
  jabatan: string | null;
  no_wa: string | null;
  email: string;
  username: string | null;
  peran: PeranPengurus;
  aktif: boolean;
};

export type LogAudit = {
  id: number;
  waktu: string | null;
  email: string;
  aksi: string;
  entitas: string;
  entitas_id: string | null;
  ringkasan: string | null;
};

export const namaBulanRomawi = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

export function formatTanggal(tanggal: string): string {
  return new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTanggalSingkat(tanggal: string): string {
  return new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatWaktuLengkap(waktu: string | null): string {
  if (!waktu) return "—";
  return new Date(waktu).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRupiah(nilai: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nilai);
}

/** Tugas dianggap lewat tenggat bila batas waktunya sudah lewat dan belum selesai dibahas. */
export function lewatTenggat(t: TindakLanjut): boolean {
  if (!t.deadline || t.status === "Sudah dibahas") return false;
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  return new Date(t.deadline + "T00:00:00") < hariIni;
}

export function jumlahLewatTenggat(daftar: TindakLanjut[]): number {
  return daftar.filter(lewatTenggat).length;
}

export function progresTindakLanjut(daftar: TindakLanjut[]): { selesai: number; total: number } {
  return {
    selesai: daftar.filter((t) => t.status === "Sudah dibahas").length,
    total: daftar.length,
  };
}

/** Pengurus harian yayasan yang selalu ditawarkan pada daftar hadir. */
export const pengurusHarian: { nama: string; jabatan: string }[] = [
  { nama: "Ustadz Jauhari, Lc.", jabatan: "Ketua Yayasan" },
  { nama: "Aswab Mahassin", jabatan: "Ketua 2" },
  { nama: "Arief Wijaya", jabatan: "Sekretaris 1" },
  { nama: "Fachri Muhammad", jabatan: "Sekretaris 2" },
  { nama: "Bambang Pamilih", jabatan: "Bendahara 1" },
  { nama: "Galih Catur", jabatan: "Bendahara 2" },
  { nama: "Nendyo Susilo", jabatan: "Bendahara 3" },
  { nama: "Muhammad Muslim", jabatan: "Personalia" },
];
