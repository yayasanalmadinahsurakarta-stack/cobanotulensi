import { htmlKeWa } from "@/lib/teks-kaya";
import { formatTanggal, type Notulensi, type TindakLanjut } from "./notulensi-types";

const jenisRapat: Record<string, string> = {
  PH: "RAPAT PENGURUS HARIAN",
  PL: "RAPAT PLENO",
  YYS: "RAPAT YAYASAN",
  KOR: "RAPAT KOORDINASI",
  EVL: "RAPAT EVALUASI",
};

/** Menebak jenis rapat dari kode di nomor notulen, misal 007/NOT-PH/VIII/2026. */
export function jenisDariNomor(nomor: string | null): string {
  const kode = (nomor ?? "").split("/")[1]?.split("-")[1]?.toUpperCase() ?? "";
  return jenisRapat[kode] ?? "RAPAT PENGURUS";
}

function jam(waktu: string | null): string {
  return waktu ? waktu.slice(0, 5).replace(":", ".") : "";
}

/** Mengubah nomor WA apa pun menjadi format 628xxxxxxxxxx. Mengembalikan null bila tidak layak. */
export function rapikanNomorWa(nomor: string | null | undefined): string | null {
  if (!nomor) return null;
  let bersih = nomor.replace(/[^0-9+]/g, "");
  if (bersih.startsWith("+")) bersih = bersih.slice(1);
  if (bersih.startsWith("0")) bersih = "62" + bersih.slice(1);
  if (bersih.startsWith("8")) bersih = "62" + bersih;
  if (!bersih.startsWith("62") || bersih.length < 10) return null;
  return bersih;
}

function barisTindakLanjut(t: TindakLanjut, i: number): string {
  const rinci = [
    t.pj_nama ? `PJ: ${t.pj_nama}` : "",
    t.deadline
      ? `batas ${new Date(t.deadline + "T00:00:00").toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  return `${i + 1}. *${t.tugas}*${rinci ? `\n   _${rinci}_` : ""}`;
}

const ALAMAT_SITUS = "https://notulensirapatyam.lovable.app";

/** Tautan langsung ke rincian notulensi; pembaca diarahkan setelah memasukkan PIN. */
export function tautanNotulensi(id: string, asalSitus?: string): string {
  const asal = asalSitus && asalSitus.startsWith("http") ? asalSitus : ALAMAT_SITUS;
  return `${asal}/notulensi/${id}`;
}

/** Menyusun pesan WhatsApp lengkap. Tautan portal hanya untuk notulensi publik. */
export function susunPesanWa(n: Notulensi, asalSitus?: string): string {
  const baris: string[] = [];
  baris.push(`📋 *NOTULENSI ${jenisDariNomor(n.nomor)}*`);
  baris.push("Yayasan Al Madinah Surakarta");
  if (n.nomor) baris.push(`No. ${n.nomor}`);
  baris.push("");
  baris.push(`🗓️ ${formatTanggal(n.tanggal)}`);
  const mulai = jam(n.waktu_mulai);
  const selesai = jam(n.waktu_selesai);
  if (mulai || selesai) baris.push(`🕐 ${mulai || "—"} – ${selesai || "selesai"} WIB`);
  if (n.tempat) baris.push(`📍 ${n.tempat}`);
  baris.push(`📌 ${n.tema}`);

  if (n.pembahasan.trim()) {
    baris.push("", "———————————————", "📝 *PEMBAHASAN*", "", htmlKeWa(n.pembahasan).trim());
  }
  if (n.keputusan?.trim()) {
    baris.push("", "———————————————", "✅ *HASIL / KEPUTUSAN RAPAT*", "", n.keputusan.trim());
  }
  if (n.tindak_lanjut.length > 0) {
    baris.push("", "———————————————", "📌 *TINDAK LANJUT*", "");
    n.tindak_lanjut.forEach((t, i) => baris.push(barisTindakLanjut(t, i)));
  }
  if (n.hal_urgen?.trim()) {
    baris.push("", "———————————————", "⚠️ *HAL MENDESAK*", "", `_${n.hal_urgen.trim()}_`);
  }
  baris.push("", "———————————————");
  baris.push("📎 *Buka notulensi lengkap:*");
  baris.push(tautanNotulensi(n.id, asalSitus));
  baris.push("_(masukkan PIN portal bila diminta)_");
  return baris.join("\n");
}

/** Pesan ringkas untuk satu penanggung jawab: hanya tugas milik orang itu. */
export function susunPesanTugas(n: Notulensi, pjNama: string, asalSitus?: string): string {
  const tugas = n.tindak_lanjut.filter((t) => (t.pj_nama ?? "") === pjNama);
  const baris: string[] = [];
  baris.push(`📋 *TINDAK LANJUT ${jenisDariNomor(n.nomor)}*`);
  baris.push("Yayasan Al Madinah Surakarta");
  if (n.nomor) baris.push(`No. ${n.nomor}`);
  baris.push("");
  baris.push(`🗓️ ${formatTanggal(n.tanggal)}`);
  baris.push(`📌 ${n.tema}`);
  baris.push("", `Assalamu'alaikum ${pjNama}, berikut tugas untuk Anda:`);
  tugas.forEach((t, i) => baris.push(barisTindakLanjut(t, i)));
  baris.push("", "———————————————");
  baris.push("📎 *Buka notulensi lengkap:*");
  baris.push(tautanNotulensi(n.id, asalSitus));
  baris.push("_(masukkan PIN portal bila diminta)_");
  return baris.join("\n");
}

export function tautanWa(pesan: string, nomor?: string | null): string {
  const teks = encodeURIComponent(pesan);
  return nomor ? `https://wa.me/${nomor}?text=${teks}` : `https://wa.me/?text=${teks}`;
}

// ---------- Pesan pengingat tenggat ----------

export type ButirPengingat = {
  tugas: string;
  deadline: string; // YYYY-MM-DD
  status: string;
  asal: string | null;
  terlambat_hari: number | null;
};

export type KelompokPengingatPesan = {
  nama: string;
  lewat: ButirPengingat[];
  mendekat: ButirPengingat[];
};

function tanggalPendek(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function barisPengingat(t: ButirPengingat, i: number): string[] {
  const ket =
    t.terlambat_hari != null
      ? `terlambat ${t.terlambat_hari} hari`
      : "belum lewat tenggat";
  const baris = [`${i + 1}. ${t.tugas} _(batas ${tanggalPendek(t.deadline)}, ${ket})_`];
  if (t.asal) baris.push(`   Dari: ${t.asal}`);
  return baris;
}

function bagianPengingat(judul: string, daftar: ButirPengingat[]): string[] {
  if (daftar.length === 0) return [];
  const baris = ["", `*${judul} (${daftar.length})*`];
  daftar.forEach((t, i) => baris.push(...barisPengingat(t, i)));
  return baris;
}

/** Pesan pengingat untuk satu penanggung jawab. */
export function susunPesanPengingatPj(
  nama: string,
  lewat: ButirPengingat[],
  mendekat: ButirPengingat[],
  acuanPanjang: string,
): string {
  const baris: string[] = [];
  baris.push("⏰ *PENGINGAT TINDAK LANJUT*");
  baris.push("Yayasan Al Madinah Surakarta");
  baris.push(acuanPanjang);
  baris.push("");
  baris.push(`Assalamu'alaikum ${nama}, mohon perhatian untuk tugas berikut:`);
  baris.push(...bagianPengingat("🔴 Sudah lewat tenggat", lewat));
  baris.push(...bagianPengingat("🟡 Mendekati tenggat", mendekat));
  baris.push("");
  baris.push("Bila sudah selesai, mohon kabari sekretaris agar statusnya diperbarui. Terima kasih. 🙏");
  return baris.join("\n");
}

/** Satu pesan rekap seluruh PJ untuk ditempel ke grup WhatsApp. */
export function susunPesanPengingatGrup(
  kelompok: KelompokPengingatPesan[],
  acuanPanjang: string,
): string {
  const baris: string[] = [];
  baris.push("⏰ *REKAP TINDAK LANJUT*");
  baris.push("Yayasan Al Madinah Surakarta");
  baris.push(acuanPanjang);
  for (const k of kelompok) {
    baris.push("");
    baris.push(`👤 *${k.nama}*`);
    k.lewat.forEach((t, i) => baris.push(...barisPengingat(t, i).map((b, j) => (j === 0 ? `🔴 ${b}` : b))));
    k.mendekat.forEach((t, i) => baris.push(...barisPengingat(t, i).map((b, j) => (j === 0 ? `🟡 ${b}` : b))));
  }
  baris.push("");
  baris.push("Bila tugas sudah selesai, mohon kabari sekretaris. Terima kasih. 🙏");
  return baris.join("\n");
}

/** Menyalin teks ke papan klip, dengan cadangan textarea bila peramban menolak. */
export async function salinTeks(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    // lanjut ke cara cadangan
  }
  try {
    const kotak = document.createElement("textarea");
    kotak.value = teks;
    kotak.setAttribute("readonly", "");
    kotak.style.position = "fixed";
    kotak.style.opacity = "0";
    document.body.appendChild(kotak);
    kotak.select();
    const berhasil = document.execCommand("copy");
    document.body.removeChild(kotak);
    return berhasil;
  } catch {
    return false;
  }
}
