import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sandi awal seragam untuk semua akun pengurus yang baru dibuat. */
export const SANDI_AWAL = "almadinah2026";

export type HasilAkun = {
  nama: string;
  username: string;
  email: string;
  status: "baru" | "sandi-diperbarui" | "sudah-ada" | "tanpa-username" | "gagal";
  pesan?: string;
};

/**
 * Membuat akun masuk (username + sandi) untuk setiap pengurus aktif yang punya
 * nama pengguna. Hanya approver yang boleh menjalankannya.
 */
export const siapkanAkunPengurus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { setelUlangSandi?: boolean } | undefined) => ({
    setelUlangSandi: Boolean(input?.setelUlangSandi),
  }))
  .handler(async ({ data, context }): Promise<{ sandiAwal: string; hasil: HasilAkun[] }> => {
    const { data: aku } = await context.supabase
      .from("pengurus")
      .select("peran")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (aku?.peran !== "approver") throw new Error("Hanya approver yang boleh membuat akun.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: daftar, error } = await supabaseAdmin
      .from("pengurus")
      .select("id, nama_lengkap, email, username, aktif")
      .eq("aktif", true)
      .order("nama_lengkap");
    if (error) throw new Error("Daftar pengurus gagal dibaca.");

    // Kumpulkan akun yang sudah ada agar tidak dibuat dua kali.
    const sudah = new Map<string, string>();
    const { data: pengguna } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of pengguna?.users ?? []) {
      if (u.email) sudah.set(u.email.toLowerCase(), u.id);
    }

    const hasil: HasilAkun[] = [];
    for (const p of daftar ?? []) {
      const nama = p.nama_lengkap;
      const username = (p.username ?? "").trim().toLowerCase();
      if (!username) {
        hasil.push({ nama, username: "", email: "", status: "tanpa-username" });
        continue;
      }
      // Akun masuk memakai alamat tetap dari nama pengguna, bukan email pribadi,
      // supaya pengurus cukup mengingat nama pengguna yang sederhana.
      const email = `${username}@almadinah.local`;
      const adaId = sudah.get(email);
      try {
        if (adaId) {
          if (data.setelUlangSandi) {
            const { error: e2 } = await supabaseAdmin.auth.admin.updateUserById(adaId, {
              password: SANDI_AWAL,
            });
            if (e2) throw e2;
            hasil.push({ nama, username, email, status: "sandi-diperbarui" });
          } else {
            hasil.push({ nama, username, email, status: "sudah-ada" });
          }
          await supabaseAdmin.from("pengurus").update({ user_id: adaId }).eq("id", p.id);
          continue;
        }
        const { data: baru, error: e1 } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: SANDI_AWAL,
          email_confirm: true,
          user_metadata: { nama_lengkap: nama, username },
        });
        if (e1 || !baru?.user) throw e1 ?? new Error("Akun gagal dibuat");
        await supabaseAdmin.from("pengurus").update({ user_id: baru.user.id }).eq("id", p.id);
        hasil.push({ nama, username, email, status: "baru" });
      } catch (e) {
        hasil.push({
          nama,
          username,
          email,
          status: "gagal",
          pesan: e instanceof Error ? e.message : "Tidak diketahui",
        });
      }
    }

    return { sandiAwal: SANDI_AWAL, hasil };
  });

/** Mengganti sandi satu pengurus (approver saja). */
export const gantiSandiPengurus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pengurusId: string; sandi: string }) => {
    const sandi = String(input?.sandi ?? "");
    if (sandi.length < 6) throw new Error("Sandi minimal 6 karakter.");
    return { pengurusId: String(input.pengurusId), sandi };
  })
  .handler(async ({ data, context }) => {
    const { data: aku } = await context.supabase
      .from("pengurus")
      .select("peran")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (aku?.peran !== "approver") throw new Error("Hanya approver yang boleh mengganti sandi.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("pengurus")
      .select("user_id, email")
      .eq("id", data.pengurusId)
      .maybeSingle();
    if (!p?.user_id) throw new Error("Pengurus ini belum punya akun masuk.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(p.user_id, {
      password: data.sandi,
    });
    if (error) throw new Error("Sandi gagal diganti.");
    return { ok: true };
  });

async function pastikanApprover(context: { supabase: any; userId: string }) {
  const { data: aku } = await context.supabase
    .from("pengurus").select("peran").eq("user_id", context.userId).maybeSingle();
  if (aku?.peran !== "approver") throw new Error("Hanya approver yang boleh mengelola akun.");
}

/** Membuat akun masuk untuk satu pengurus dengan sandi pilihan approver. */
export const buatAkunPengurus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pengurusId: string; sandi: string }) => {
    const sandi = String(input?.sandi ?? "");
    if (sandi.length < 6) throw new Error("Sandi minimal 6 karakter.");
    return { pengurusId: String(input.pengurusId), sandi };
  })
  .handler(async ({ data, context }) => {
    await pastikanApprover(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("pengurus").select("id, nama_lengkap, username, user_id")
      .eq("id", data.pengurusId).maybeSingle();
    if (!p) throw new Error("Pengurus tidak ditemukan.");
    if (p.user_id) throw new Error("Pengurus ini sudah punya akun masuk.");
    const username = (p.username ?? "").trim().toLowerCase();
    if (!username) throw new Error("Isi dulu nama pengguna untuk pengurus ini.");
    const email = `${username}@almadinah.local`;
    const { data: baru, error } = await supabaseAdmin.auth.admin.createUser({
      email, password: data.sandi, email_confirm: true,
      user_metadata: { nama_lengkap: p.nama_lengkap, username },
    });
    if (error || !baru?.user) throw new Error(error?.message ?? "Akun gagal dibuat.");
    await supabaseAdmin.from("pengurus").update({ user_id: baru.user.id }).eq("id", p.id);
    return { ok: true, username };
  });

/** Menghapus akun masuk seorang pengurus (data pengurus tetap ada). */
export const hapusAkunPengurus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pengurusId: string }) => ({ pengurusId: String(input.pengurusId) }))
  .handler(async ({ data, context }) => {
    await pastikanApprover(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("pengurus").select("id, user_id").eq("id", data.pengurusId).maybeSingle();
    if (!p?.user_id) throw new Error("Pengurus ini belum punya akun masuk.");
    if (p.user_id === context.userId) throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
    await supabaseAdmin.from("pengurus").update({ user_id: null }).eq("id", p.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(p.user_id);
    if (error) throw new Error("Akun gagal dihapus.");
    return { ok: true };
  });
