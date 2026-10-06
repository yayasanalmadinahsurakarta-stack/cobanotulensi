import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PeranPengurus = "editor" | "approver";

export type SesiPengurus = {
  terdaftar: boolean;
  pengurus_id: string | null;
  boleh_komentar: boolean;
  nama_lengkap: string | null;
  jabatan: string | null;
  peran: PeranPengurus | null;
  email: string | null;
};

/**
 * Memeriksa apakah akun yang sedang masuk terdaftar sebagai pengurus aktif.
 * Saat login pertama, kolom pengurus.user_id diisi otomatis berdasarkan email.
 */
export const ambilSesiPengurus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SesiPengurus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = String(context.claims["email"] ?? "").toLowerCase();
    const kosong: SesiPengurus = {
      terdaftar: false,
      pengurus_id: null,
      boleh_komentar: false,
      nama_lengkap: null,
      jabatan: null,
      peran: null,
      email: email || null,
    };
    if (!email) return kosong;

    // Tautkan akun ke baris pengurus yang cocok (hanya bila masih aktif).
    await supabaseAdmin
      .from("pengurus")
      .update({ user_id: context.userId })
      .ilike("email", email)
      .eq("aktif", true)
      .is("user_id", null);

    let { data } = await supabaseAdmin
      .from("pengurus")
      .select("id, nama_lengkap, jabatan, peran, email, aktif")
      .eq("user_id", context.userId)
      .eq("aktif", true)
      .maybeSingle();

    // Cadangan: baris pengurus tertaut ke akun lain (mis. akun username lama).
    // Alamat email adalah identitas utama, jadi tautan diperbaiki otomatis.
    if (!data) {
      const { data: lewatEmail } = await supabaseAdmin
        .from("pengurus")
        .select("id, nama_lengkap, jabatan, peran, email, aktif")
        .ilike("email", email)
        .eq("aktif", true)
        .maybeSingle();
      if (lewatEmail) {
        await supabaseAdmin
          .from("pengurus")
          .update({ user_id: context.userId })
          .eq("id", lewatEmail.id);
        data = lewatEmail;
      }
    }

    if (!data) return kosong;


    return {
      terdaftar: true,
      pengurus_id: data.id,
      // Semua pengurus aktif boleh memberi komentar dan masukan.
      boleh_komentar: true,
      nama_lengkap: data.nama_lengkap,
      jabatan: data.jabatan,
      peran: data.peran as PeranPengurus,
      email: data.email,
    };
  });
