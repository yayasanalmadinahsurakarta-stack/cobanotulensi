import { supabase } from "@/integrations/supabase/client";
import type {
  KehadiranPeserta,
  LogAudit,
  Notulensi,
  Pengurus,
  StatusPublikasi,
  StatusTindakLanjut,
  TampilHalUrgen,
  VisibilitasNotulensi,
} from "./notulensi-types";

const KOLOM_NOTULENSI =
  "id, nomor, tanggal, waktu_mulai, waktu_selesai, tempat, pemimpin, notulis, tema, pembahasan, keputusan, hal_urgen, hal_urgen_tampil, anggaran, link_lampiran, induk_id, visibilitas, status_publikasi, catatan_penolakan, diterbitkan_pada, disetujui_oleh, dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, dihapus_pada";

const RELASI = `${KOLOM_NOTULENSI}, peserta(id, nama, jabatan, kehadiran), tindak_lanjut(id, urutan, tugas, pj_nama, deadline, status, catatan)`;

function rapikan(baris: Record<string, unknown>): Notulensi {
  const n = baris as unknown as Notulensi;
  return {
    ...n,
    anggaran: n.anggaran === null ? null : Number(n.anggaran),
    peserta: n.peserta ?? [],
    tindak_lanjut: [...(n.tindak_lanjut ?? [])].sort((a, b) => a.urutan - b.urutan),
  };
}

async function emailSaya(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? "tidak diketahui";
}

/** Menulis satu baris jejak audit. Kegagalan pencatatan tidak boleh membatalkan pekerjaan. */
export async function catatLog(
  aksi: string,
  entitas: string,
  entitasId: string | null,
  ringkasan: string,
): Promise<void> {
  try {
    await supabase.from("log_audit").insert({
      email: await emailSaya(),
      aksi,
      entitas,
      entitas_id: entitasId,
      ringkasan,
    });
  } catch {
    // sengaja diabaikan
  }
}

/* ---------------------------------- baca ---------------------------------- */

export async function ambilNotulensiUmum(): Promise<Notulensi[]> {
  const { data, error } = await supabase
    .from("notulensi")
    .select(RELASI)
    .eq("status_publikasi", "terbit")
    .eq("visibilitas", "publik")
    .is("dihapus_pada", null)
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rapikan);
}

export async function ambilSatuNotulensi(id: string): Promise<Notulensi | null> {
  const { data, error } = await supabase.from("notulensi").select(RELASI).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rapikan(data) : null;
}

export async function ambilSemuaNotulensi(): Promise<Notulensi[]> {
  const { data, error } = await supabase
    .from("notulensi")
    .select(RELASI)
    .is("dihapus_pada", null)
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rapikan);
}

export async function ambilNotulensiTerhapus(): Promise<Notulensi[]> {
  const { data, error } = await supabase
    .from("notulensi")
    .select(RELASI)
    .not("dihapus_pada", "is", null)
    .order("dihapus_pada", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rapikan);
}

/* --------------------------------- simpan --------------------------------- */

export type BarisTindakLanjut = {
  tugas: string;
  pj_nama: string;
  pj_id?: string | null;
  deadline: string;
  status: StatusTindakLanjut;
};

export type BarisPeserta = {
  nama: string;
  jabatan: string;
  kehadiran: KehadiranPeserta;
};

export type IsianNotulensi = {
  id?: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  tempat: string;
  pemimpin: string;
  notulis: string;
  tema: string;
  pembahasan: string;
  keputusan: string;
  hal_urgen: string;
  hal_urgen_tampil: TampilHalUrgen;
  anggaran: string;
  link_lampiran: string;
  induk_id: string;
  tindak_lanjut: BarisTindakLanjut[];
  peserta: BarisPeserta[];
};

function kosongJadiNull(nilai: string): string | null {
  const v = nilai.trim();
  return v === "" ? null : v;
}

type PerubahanStatus = {
  status_publikasi?: StatusPublikasi;
  visibilitas?: VisibilitasNotulensi;
  catatan_penolakan?: string | null;
  diterbitkan_pada?: string | null;
  disetujui_oleh?: string | null;
};

/** Menyimpan notulensi beserta tabel tindak lanjut dan daftar hadirnya. */
export async function simpanNotulensi(
  isian: IsianNotulensi,
  perubahan: PerubahanStatus = {},
): Promise<string> {
  const email = await emailSaya();
  const inti = {
    tanggal: isian.tanggal,
    waktu_mulai: kosongJadiNull(isian.waktu_mulai),
    waktu_selesai: kosongJadiNull(isian.waktu_selesai),
    tempat: kosongJadiNull(isian.tempat),
    pemimpin: kosongJadiNull(isian.pemimpin),
    notulis: kosongJadiNull(isian.notulis),
    tema: isian.tema.trim(),
    pembahasan: isian.pembahasan,
    keputusan: kosongJadiNull(isian.keputusan),
    hal_urgen: kosongJadiNull(isian.hal_urgen),
    hal_urgen_tampil: isian.hal_urgen_tampil,
    anggaran: isian.anggaran.trim() === "" ? null : Number(isian.anggaran),
    link_lampiran: kosongJadiNull(isian.link_lampiran),
    induk_id: kosongJadiNull(isian.induk_id),
    ...perubahan,
  };

  let id = isian.id;
  if (id) {
    const { error } = await supabase
      .from("notulensi")
      .update({ ...inti, diubah_oleh: email, diubah_pada: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("notulensi")
      .insert({ ...inti, dibuat_oleh: email })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id as string;
  }

  const notulensiId = id!;

  await supabase.from("tindak_lanjut").delete().eq("notulensi_id", notulensiId);
  const tl = isian.tindak_lanjut
    .filter((t) => t.tugas.trim() !== "")
    .map((t, i) => ({
      notulensi_id: notulensiId,
      urutan: i + 1,
      tugas: t.tugas.trim(),
      pj_nama: kosongJadiNull(t.pj_nama),
      pj_id: t.pj_id ?? null,
      deadline: kosongJadiNull(t.deadline),
      status: t.status,
    }));
  if (tl.length > 0) {
    const { error } = await supabase.from("tindak_lanjut").insert(tl);
    if (error) throw error;
  }

  await supabase.from("peserta").delete().eq("notulensi_id", notulensiId);
  const ps = isian.peserta
    .filter((p) => p.nama.trim() !== "")
    .map((p) => ({
      notulensi_id: notulensiId,
      nama: p.nama.trim(),
      jabatan: kosongJadiNull(p.jabatan),
      kehadiran: p.kehadiran,
    }));
  if (ps.length > 0) {
    const { error } = await supabase.from("peserta").insert(ps);
    if (error) throw error;
  }

  return notulensiId;
}

export async function ubahStatusNotulensi(id: string, perubahan: PerubahanStatus): Promise<void> {
  const email = await emailSaya();
  const { error } = await supabase
    .from("notulensi")
    .update({ ...perubahan, diubah_oleh: email, diubah_pada: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function hapusNotulensi(id: string): Promise<void> {
  const { error } = await supabase
    .from("notulensi")
    .update({ dihapus_pada: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await catatLog("hapus", "notulensi", id, "Notulensi dipindahkan ke tempat sampah");
}

export async function pulihkanNotulensi(id: string): Promise<void> {
  const { error } = await supabase.from("notulensi").update({ dihapus_pada: null }).eq("id", id);
  if (error) throw error;
  await catatLog("pulihkan", "notulensi", id, "Notulensi dipulihkan dari tempat sampah");
}

/* -------------------------------- pengurus -------------------------------- */

export async function ambilDaftarPengurus(): Promise<Pengurus[]> {
  const { data, error } = await supabase
    .from("pengurus")
    .select("id, user_id, nama_lengkap, jabatan, no_wa, email, username, peran, aktif")
    .order("nama_lengkap");
  if (error) throw error;
  return (data ?? []) as Pengurus[];
}

export type IsianPengurus = {
  id?: string;
  nama_lengkap: string;
  jabatan: string;
  no_wa: string;
  email: string;
  username: string;
  peran: "editor" | "approver";
  aktif: boolean;
};

export async function simpanPengurus(isian: IsianPengurus): Promise<void> {
  const baris = {
    nama_lengkap: isian.nama_lengkap.trim(),
    jabatan: kosongJadiNull(isian.jabatan),
    no_wa: kosongJadiNull(isian.no_wa),
    email: isian.email.trim().toLowerCase(),
    username: kosongJadiNull(isian.username.trim().toLowerCase()),
    peran: isian.peran,
    aktif: isian.aktif,
  };
  if (isian.id) {
    const { error } = await supabase.from("pengurus").update(baris).eq("id", isian.id);
    if (error) throw error;
    await catatLog("ubah", "pengurus", isian.id, `Data pengurus ${baris.nama_lengkap} diperbarui`);
  } else {
    const { error } = await supabase.from("pengurus").insert(baris);
    if (error) throw error;
    await catatLog("buat", "pengurus", null, `Pengurus baru ditambahkan: ${baris.nama_lengkap}`);
  }
}

export async function hapusPengurus(id: string, nama: string): Promise<void> {
  const { error } = await supabase.from("pengurus").delete().eq("id", id);
  if (error) throw error;
  await catatLog("hapus", "pengurus", id, `Pengurus dihapus: ${nama}`);
}

/* ---------------------------------- log ----------------------------------- */

export async function ambilLogAudit(): Promise<LogAudit[]> {
  const { data, error } = await supabase
    .from("log_audit")
    .select("id, waktu, email, aksi, entitas, entitas_id, ringkasan")
    .order("waktu", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as LogAudit[];
}

/* ------------------------------ portal publik ------------------------------ */

export type RingkasPublik = {
  id: string;
  nomor: string | null;
  tanggal: string;
  tema: string;
  cuplikan: string;
  ada_lanjutan: boolean;
  hal_urgen: string | null;
  hal_urgen_tampil: TampilHalUrgen;
  status_tindak_lanjut: StatusTindakLanjut[];
  daftar_pj: string[];
};

/**
 * Daftar ringkas untuk beranda publik. Saringan terbit + publik + belum dihapus
 * dijalankan di basis data (tampilan `notulensi_publik_ringkas`), sehingga
 * notulensi internal tidak pernah dikirim ke browser. Pembahasan hanya dikirim
 * 200 karakter pertama; isi penuh diambil saat pembaca membuka detail.
 */
export async function ambilRingkasPublik(): Promise<RingkasPublik[]> {
  const { data, error } = await supabase
    .from("notulensi_publik_ringkas")
    .select(
      "id, nomor, tanggal, tema, cuplikan, ada_lanjutan, hal_urgen, hal_urgen_tampil, status_tindak_lanjut, daftar_pj",
    )
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id as string,
    nomor: b.nomor,
    tanggal: b.tanggal as string,
    tema: b.tema as string,
    cuplikan: b.cuplikan ?? "",
    ada_lanjutan: b.ada_lanjutan ?? false,
    hal_urgen: b.hal_urgen,
    hal_urgen_tampil: (b.hal_urgen_tampil ?? "tidak") as TampilHalUrgen,
    status_tindak_lanjut: (b.status_tindak_lanjut ?? []) as StatusTindakLanjut[],
    daftar_pj: b.daftar_pj ?? [],
  }));
}

/** Isi lengkap satu notulensi publik. RLS memastikan hanya notulensi terbit-publik yang terbaca. */
export async function ambilDetailPublik(id: string): Promise<Notulensi | null> {
  const { data, error } = await supabase
    .from("notulensi")
    .select(RELASI)
    .eq("id", id)
    .eq("status_publikasi", "terbit")
    .eq("visibilitas", "publik")
    .is("dihapus_pada", null)
    .maybeSingle();
  if (error) throw error;
  return data ? rapikan(data) : null;
}
