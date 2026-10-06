import { supabase } from "@/integrations/supabase/client";
import { catatLog } from "@/lib/notulensi-api";
import type { HasilRapi } from "@/lib/ai.functions";

export const BUCKET = "notulensi-berkas";

async function emailSaya(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? "tidak diketahui";
}

export type NotulensiRingkas = { id: string; tanggal: string; tema: string };

/** Daftar ringkas notulensi yang sudah ada, untuk deteksi kemungkinan duplikat. */
export async function ambilRingkasNotulensi(): Promise<NotulensiRingkas[]> {
  const { data, error } = await supabase
    .from("notulensi")
    .select("id, tanggal, tema")
    .is("dihapus_pada", null);
  if (error) throw error;
  return (data ?? []) as NotulensiRingkas[];
}

function jalurBerkas(tanggal: string, namaAsli: string): string {
  const [tahun, bulan] = tanggal.split("-");
  const titik = namaAsli.lastIndexOf(".");
  const ext = titik === -1 ? "" : namaAsli.slice(titik).toLowerCase();
  return `notulensi/${tahun}/${bulan}/${crypto.randomUUID()}${ext}`;
}

/**
 * Mengunggah satu berkas ke penyimpanan privat lalu membuat satu notulensi
 * berstatus draft dengan tanggal hasil deteksi.
 */
export async function simpanBerkasSebagaiDraf(args: {
  berkas: File;
  tanggal: string;
  tema: string;
  pembahasan: string;
  hasil?: HasilRapi | null;
}): Promise<string> {
  const path = jalurBerkas(args.tanggal, args.berkas.name);
  const h = args.hasil ?? null;

  const { error: errUnggah } = await supabase.storage
    .from(BUCKET)
    .upload(path, args.berkas, args.berkas.type ? { contentType: args.berkas.type, upsert: false } : { upsert: false });
  if (errUnggah) throw new Error(`Berkas gagal diunggah: ${errUnggah.message}`);

  const emailPengunggah = await emailSaya();

  const { data, error } = await supabase
    .from("notulensi")
    .insert({
      tanggal: args.tanggal,
      tema: args.tema.trim() || args.berkas.name,
      pembahasan: args.pembahasan,
      keputusan: h?.keputusan?.trim() || null,
      status_publikasi: "terbit",
      visibilitas: "publik",
      disetujui_oleh: emailPengunggah,
      hal_urgen: h?.halUrgen?.trim() || null,

      waktu_mulai: h?.waktuMulai || null,
      waktu_selesai: h?.waktuSelesai || null,
      tempat: h?.tempat?.trim() || null,
      pemimpin: h?.pemimpin?.trim() || null,
      notulis: h?.notulis?.trim() || null,
      anggaran: h?.anggaran ?? null,
      link_lampiran: path,
      berkas_path: path,
      nama_berkas_asli: args.berkas.name,
      dibuat_oleh: emailPengunggah,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`Notulensi gagal dibuat: ${error.message}`);
  }


  const id = data.id as string;

  const peserta = (h?.peserta ?? [])
    .filter((p) => p.nama.trim() !== "")
    .map((p) => ({
      notulensi_id: id,
      nama: p.nama.trim(),
      jabatan: p.jabatan?.trim() || null,
      kehadiran: (["Hadir", "Izin", "Tidak Hadir"].includes(p.kehadiran)
        ? p.kehadiran
        : "Hadir") as "Hadir" | "Izin" | "Tidak Hadir",
    }));
  if (peserta.length > 0) await supabase.from("peserta").insert(peserta);

  const tugas = (h?.tindakLanjut ?? [])
    .filter((t) => t.tugas.trim() !== "")
    .map((t, i) => ({
      notulensi_id: id,
      urutan: i + 1,
      tugas: t.tugas.trim(),
      pj_nama: t.pjNama?.trim() || null,
      pj_id: t.pjId ?? null,
      deadline: t.deadline || null,
    }));
  if (tugas.length > 0) await supabase.from("tindak_lanjut").insert(tugas);

  void catatLog("unggah berkas", "notulensi", id, `Notulensi dari berkas ${args.berkas.name}`);
  return id;
}


/** Tautan sementara untuk membuka berkas asli (berlaku 1 jam). */
export async function tautanBerkas(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
