import { supabase } from "@/integrations/supabase/client";

export type Notifikasi = {
  id: string;
  jenis: string;
  judul: string;
  pesan: string | null;
  tautan: string | null;
  notulensi_id: string | null;
  komentar_id: string | null;
  dibaca_pada: string | null;
  dibuat_pada: string;
};

/** Notifikasi milik pengurus yang sedang masuk (60 terbaru). */
export async function ambilNotifikasi(): Promise<Notifikasi[]> {
  const { data, error } = await supabase
    .from("notifikasi")
    .select("id, jenis, judul, pesan, tautan, notulensi_id, komentar_id, dibaca_pada, dibuat_pada")
    .order("dibuat_pada", { ascending: false })
    .limit(60);
  if (error) return [];
  return (data ?? []) as Notifikasi[];
}

export async function tandaiNotifikasiDibaca(id: string): Promise<void> {
  await supabase.from("notifikasi").update({ dibaca_pada: new Date().toISOString() }).eq("id", id);
}

export async function tandaiSemuaNotifikasiDibaca(): Promise<void> {
  await supabase
    .from("notifikasi")
    .update({ dibaca_pada: new Date().toISOString() })
    .is("dibaca_pada", null);
}

/* --------------------------- tanda belum dibaca --------------------------- */

/** Id notulensi yang sudah pernah dibuka oleh pengurus yang sedang masuk. */
export async function ambilNotulensiSudahDibaca(): Promise<Set<string>> {
  const { data, error } = await supabase.from("bacaan_notulensi").select("notulensi_id");
  if (error) return new Set();
  return new Set((data ?? []).map((b) => b.notulensi_id));
}

/** Menandai satu notulensi sebagai sudah dibaca oleh pengurus yang sedang masuk. */
export async function tandaiNotulensiDibaca(notulensiId: string): Promise<void> {
  const { data: pengguna } = await supabase.auth.getUser();
  if (!pengguna.user) return;
  const { data: p } = await supabase
    .from("pengurus")
    .select("id")
    .eq("user_id", pengguna.user.id)
    .maybeSingle();
  if (!p) return;
  await supabase
    .from("bacaan_notulensi")
    .upsert(
      { pengurus_id: p.id, notulensi_id: notulensiId, dibaca_pada: new Date().toISOString() },
      { onConflict: "pengurus_id,notulensi_id" },
    );
}
