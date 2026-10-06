import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProfilPribadi = {
  nama_lengkap: string;
  jabatan: string | null;
  no_wa: string | null;
  email: string;
  username: string | null;
};

export const ambilProfilPribadi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfilPribadi> => {
    const { data, error } = await context.supabase
      .from("pengurus")
      .select("nama_lengkap, jabatan, no_wa, email, username")
      .eq("user_id", context.userId)
      .eq("aktif", true)
      .maybeSingle();
    if (error || !data) throw new Error("Profil pengurus tidak ditemukan.");
    return data;
  });

export const simpanProfilPribadi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nama: string; email: string; noWa: string }) => {
    const nama = String(input?.nama ?? "").trim();
    const email = String(input?.email ?? "").trim().toLowerCase();
    const noWa = String(input?.noWa ?? "").trim();
    if (nama.length < 3 || nama.length > 120) throw new Error("Nama harus berisi 3–120 karakter.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Alamat email belum valid.");
    if (noWa && !/^[+0-9 ()-]{8,24}$/.test(noWa)) throw new Error("Nomor WhatsApp belum valid.");
    return { nama, email, noWa };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pengurus")
      .update({
        nama_lengkap: data.nama,
        email: data.email,
        no_wa: data.noWa || null,
      })
      .eq("user_id", context.userId)
      .eq("aktif", true);
    if (error) throw new Error("Profil gagal disimpan.");
    return { ok: true };
  });