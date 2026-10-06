/**
 * Pendeteksi tanggal rapat dari isi notulensi berbahasa Indonesia.
 * Empat lapis berurutan: baris berlabel, isi dokumen, keluaran AI, nama berkas.
 * Tidak pernah menebak dengan tanggal hari ini.
 */

export type Keyakinan = "tinggi" | "sedang" | "rendah" | "tidak";

export type HasilDeteksiTanggal = {
  /** Format YYYY-MM-DD, atau kosong bila tidak ditemukan. */
  tanggal: string;
  keyakinan: Keyakinan;
  /** Potongan baris sumber tanggal, untuk ditampilkan ke pengguna. */
  cuplikan: string;
};

const BULAN: Record<string, number> = {
  jan: 1,
  feb: 2,
  peb: 2,
  mar: 3,
  apr: 4,
  mei: 5,
  jun: 6,
  jul: 7,
  agu: 8,
  ags: 8,
  aug: 8,
  sep: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  nop: 11,
  des: 12,
  dec: 12,
};

const KATA_KUNCI = [
  "hari/tanggal",
  "hari / tanggal",
  "haritanggal",
  "tanggal",
  "hari",
  "waktu",
  "pada hari",
];

const AWAL = 2000;

function nomorBulan(kata: string): number | null {
  const bersih = kata
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");
  if (bersih.length < 3) return null;
  return BULAN[bersih.slice(0, 3)] ?? null;
}

function rakit(tahun: number, bulan: number, hari: number): string | null {
  if (tahun < 1900 || tahun > 2100) return null;
  if (bulan < 1 || bulan > 12) return null;
  if (hari < 1 || hari > 31) return null;
  const d = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (d.getUTCMonth() !== bulan - 1 || d.getUTCDate() !== hari) return null;
  return `${tahun}-${String(bulan).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;
}

const POLA_TEKS = /(\d{1,2})\s+([A-Za-z]{3,12})\.?\s+(\d{4})/g;
const POLA_ANGKA = /(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})/g;
const POLA_ISO = /(\d{4})-(\d{1,2})-(\d{1,2})/g;

/**
 * Mencari tanggal Masehi pertama dalam sepotong teks.
 * Bagian Hijriah otomatis terabaikan karena tahunnya di luar 1900–2100
 * dan nama bulannya tidak dikenali.
 */
export function cariTanggalMasehi(teks: string): { tanggal: string; posisi: number } | null {
  const kandidat: { tanggal: string; posisi: number }[] = [];

  for (const m of teks.matchAll(POLA_TEKS)) {
    const bulan = nomorBulan(m[2]!);
    if (bulan === null) continue;
    const t = rakit(Number(m[3]), bulan, Number(m[1]!));
    if (t) kandidat.push({ tanggal: t, posisi: m.index ?? 0 });
  }
  for (const m of teks.matchAll(POLA_ISO)) {
    const t = rakit(Number(m[1]), Number(m[2]), Number(m[3]));
    if (t) kandidat.push({ tanggal: t, posisi: m.index ?? 0 });
  }
  for (const m of teks.matchAll(POLA_ANGKA)) {
    const t = rakit(Number(m[3]), Number(m[2]), Number(m[1]));
    if (t) kandidat.push({ tanggal: t, posisi: m.index ?? 0 });
  }

  if (kandidat.length === 0) return null;
  kandidat.sort((a, b) => a.posisi - b.posisi);
  return kandidat[0]!;
}

function potong(baris: string): string {
  const b = baris.trim().replace(/\s+/g, " ");
  return b.length > 140 ? `${b.slice(0, 140)}…` : b;
}

/** Lapis 1: baris berlabel "Hari/Tanggal", "Tanggal", "Waktu", dan sejenisnya. */
function lapisBarisBerlabel(teks: string): HasilDeteksiTanggal | null {
  for (const baris of teks.split(/\r?\n/)) {
    const awal = baris.trim().toLowerCase().replace(/^[-•*\d.)\s]+/, "");
    if (!KATA_KUNCI.some((k) => awal.startsWith(k))) continue;
    const temu = cariTanggalMasehi(baris);
    if (temu) return { tanggal: temu.tanggal, keyakinan: "tinggi", cuplikan: potong(baris) };
  }
  return null;
}

/** Lapis 2: pola tanggal di mana pun pada bagian awal dokumen. */
function lapisIsiDokumen(teks: string): HasilDeteksiTanggal | null {
  const temu = cariTanggalMasehi(teks);
  if (!temu) return null;
  const mulai = Math.max(0, temu.posisi - 60);
  return {
    tanggal: temu.tanggal,
    keyakinan: "sedang",
    cuplikan: potong(teks.slice(mulai, temu.posisi + 80)),
  };
}

/** Lapis 4: nama berkas, mis. notulen-2026-08-22.pdf atau 22-08-2026.docx. */
function lapisNamaBerkas(nama: string): HasilDeteksiTanggal | null {
  const tanpaEkstensi = nama.replace(/\.[a-z0-9]+$/i, "").replace(/[_]/g, "-");
  const temu = cariTanggalMasehi(tanpaEkstensi);
  if (!temu) return null;
  return { tanggal: temu.tanggal, keyakinan: "rendah", cuplikan: `Nama berkas: ${nama}` };
}

/**
 * Menjalankan lapis 1, 2, lalu 4 (lapis 3 dari AI ditambahkan pemanggil).
 * Hanya membaca AWAL karakter pertama agar tenggat tindak lanjut di bagian
 * bawah dokumen tidak tertukar dengan tanggal rapat.
 */
export function deteksiTanggal(teks: string, namaBerkas = ""): HasilDeteksiTanggal {
  const awal = teks.slice(0, AWAL);
  return (
    lapisBarisBerlabel(awal) ??
    lapisIsiDokumen(awal) ??
    (namaBerkas ? lapisNamaBerkas(namaBerkas) : null) ?? {
      tanggal: "",
      keyakinan: "tidak",
      cuplikan: "",
    }
  );
}

/** Menebak tema rapat dari baris berlabel Tema/Agenda/Perihal, atau baris judul. */
export function tebakTema(teks: string): string {
  const baris = teks.slice(0, AWAL).split(/\r?\n/);
  for (const b of baris) {
    const cocok = b.match(/^\s*(tema|agenda|perihal|acara|judul)\s*[:\-]\s*(.+)$/i);
    if (cocok && cocok[2]!.trim().length > 2) return potong(cocok[2]!);
  }
  for (const b of baris) {
    const isi = b.trim();
    if (isi.length >= 8 && isi.length <= 120 && !/\d{4}/.test(isi)) return potong(isi);
  }
  return "";
}

/** Kemiripan dua teks (0–1) memakai koefisien Dice atas pasangan huruf. */
export function kemiripan(a: string, b: string): number {
  const siap = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const x = siap(a);
  const y = siap(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const pasangan = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const px = pasangan(x);
  const py = pasangan(y);
  let sama = 0;
  for (const p of px) if (py.has(p)) sama++;
  return (2 * sama) / (px.size + py.size);
}

export const labelKeyakinan: Record<Keyakinan, string> = {
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
  tidak: "Tidak ada",
};
