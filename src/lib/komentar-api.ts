import { supabase } from "@/integrations/supabase/client";

export type Reaksi = {
  id: string;
  komentar_id: string;
  pengurus_id: string;
  emoji: string;
};

export type Komentar = {
  id: string;
  notulensi_id: string;
  induk_id: string | null;
  pengurus_id: string | null;
  penulis_nama: string;
  penulis_jabatan: string | null;
  isi: string;
  dibuat_pada: string;
  reaksi: Reaksi[];
  balasan: Komentar[];
};

export type IdentitasKomentator = {
  pengurusId: string;
  nama: string;
  jabatan: string | null;
  approver: boolean;
} | null;

/** Emoji reaksi yang tersedia pada setiap komentar. */
export const daftarEmoji = ["👍", "❤️", "😊", "🙏", "🎉", "😮"];

/** Mengenali pengurus yang sedang masuk, untuk menentukan hak menulis dan menghapus. */
export async function ambilIdentitasKomentator(): Promise<IdentitasKomentator> {
  const { data: pengguna } = await supabase.auth.getUser();
  if (!pengguna.user) return null;
  const { data } = await supabase
    .from("pengurus")
    .select("id, nama_lengkap, jabatan, peran, aktif")
    .eq("user_id", pengguna.user.id)
    .maybeSingle();
  if (!data || !data.aktif) return null;
  return {
    pengurusId: data.id as string,
    nama: data.nama_lengkap as string,
    jabatan: (data.jabatan as string | null) ?? null,
    approver: data.peran === "approver",
  };
}

export async function ambilKomentar(notulensiId: string): Promise<Komentar[]> {
  const { data, error } = await supabase
    .from("komentar")
    .select(
      "id, notulensi_id, induk_id, pengurus_id, penulis_nama, penulis_jabatan, isi, dibuat_pada",
    )
    .eq("notulensi_id", notulensiId)
    .order("dibuat_pada", { ascending: true });
  if (error || !data) return [];

  const ids = data.map((k) => k.id as string);
  let reaksi: Reaksi[] = [];
  if (ids.length > 0) {
    const { data: r } = await supabase
      .from("reaksi_komentar")
      .select("id, komentar_id, pengurus_id, emoji")
      .in("komentar_id", ids);
    reaksi = (r ?? []) as Reaksi[];
  }

  const peta = new Map<string, Komentar>();
  for (const baris of data) {
    const k = baris as unknown as Komentar;
    peta.set(k.id, {
      ...k,
      reaksi: reaksi.filter((x) => x.komentar_id === k.id),
      balasan: [],
    });
  }

  const utama: Komentar[] = [];
  for (const k of peta.values()) {
    if (k.induk_id && peta.has(k.induk_id)) peta.get(k.induk_id)!.balasan.push(k);
    else utama.push(k);
  }
  return utama;
}

/** Menambahkan masukan atau tanggapan pada satu notulensi. Hanya pengurus aktif. */
export async function kirimKomentar(
  notulensiId: string,
  isi: string,
  indukId?: string | null,
): Promise<void> {
  const teks = isi.trim();
  if (teks.length < 2) throw new Error("Masukan masih kosong.");

  const saya = await ambilIdentitasKomentator();
  if (!saya) throw new Error("Silakan masuk sebagai pengurus aktif lebih dulu.");

  const { error } = await supabase.from("komentar").insert({
    notulensi_id: notulensiId,
    induk_id: indukId ?? null,
    pengurus_id: saya.pengurusId,
    penulis_nama: saya.nama,
    penulis_jabatan: saya.jabatan,
    isi: teks,
  });
  if (error) throw new Error("Masukan gagal dikirim. Pastikan akun Anda pengurus aktif.");
}

export async function hapusKomentar(id: string): Promise<void> {
  const { error } = await supabase.from("komentar").delete().eq("id", id);
  if (error) throw new Error("Masukan gagal dihapus.");
}

/** Memberi atau menarik satu reaksi emoji pada komentar. */
export async function ubahReaksi(
  komentarId: string,
  emoji: string,
  pengurusId: string,
  sudahAda: boolean,
): Promise<void> {
  if (sudahAda) {
    const { error } = await supabase
      .from("reaksi_komentar")
      .delete()
      .eq("komentar_id", komentarId)
      .eq("pengurus_id", pengurusId)
      .eq("emoji", emoji);
    if (error) throw new Error("Reaksi gagal ditarik.");
    return;
  }
  const { error } = await supabase
    .from("reaksi_komentar")
    .insert({ komentar_id: komentarId, pengurus_id: pengurusId, emoji });
  if (error) throw new Error("Reaksi gagal dikirim.");
}
