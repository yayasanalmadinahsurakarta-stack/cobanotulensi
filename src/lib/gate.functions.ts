import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, timingSafeEqual } from "node:crypto";

type SesiGerbang = { terbuka?: boolean };

function konfigurasiSesi() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "gerbang-pin",
    // Sekali masuk, kunci bertahan 30 hari agar tidak perlu login berulang.
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

function cocok(masukan: string, seharusnya: string): boolean {
  const a = createHash("sha256").update(masukan, "utf8").digest();
  const b = createHash("sha256").update(seharusnya, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** PIN aktif: yang tersimpan di basis data, atau cadangan dari variabel lingkungan. */
async function bacaPin(): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("rahasia_ai").select("pin_situs").maybeSingle();
    const tersimpan = (data?.pin_situs ?? "").trim();
    if (tersimpan) return tersimpan;
  } catch {
    // lanjut ke variabel lingkungan
  }
  return process.env["SITE_PIN"]?.trim() || null;
}

export const periksaGerbang = createServerFn({ method: "GET" }).handler(async () => {
  const sesi = await useSession<SesiGerbang>(konfigurasiSesi());
  return { terbuka: sesi.data.terbuka === true };
});

export const bukaGerbang = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string }) => data)
  .handler(async ({ data }) => {
    const seharusnya = await bacaPin();
    if (!seharusnya) throw new Error("PIN situs belum diatur");
    if (!cocok(data.pin, seharusnya)) return { ok: false as const };
    const sesi = await useSession<SesiGerbang>(konfigurasiSesi());
    await sesi.update({ terbuka: true });
    return { ok: true as const };
  });

export const kunciGerbang = createServerFn({ method: "POST" }).handler(async () => {
  const sesi = await useSession<SesiGerbang>(konfigurasiSesi());
  await sesi.clear();
  return { ok: true as const };
});

/** Memberi tahu berapa digit PIN yang berlaku, tanpa membocorkan isinya. */
export const statusPin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const pin = await bacaPin();
    return { terisi: Boolean(pin), panjang: pin ? pin.length : 0 };
  });

/** Mengganti PIN situs. Hanya approver yang diizinkan oleh aturan basis data. */
export const gantiPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string }) => {
    const pin = String(input?.pin ?? "").trim();
    if (!/^[0-9]{4,12}$/.test(pin)) throw new Error("PIN harus berupa 4–12 angka.");
    return { pin };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rahasia_ai")
      .update({ pin_situs: data.pin, diubah_pada: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error("Hanya approver yang boleh mengganti PIN.");
    return { ok: true };
  });

/**
 * Membuka portal untuk pengurus yang sudah masuk dengan username dan sandi.
 * Kunci portal (cookie) dipasang di sisi server agar halaman publik tetap
 * bisa dibuka lewat tautan WhatsApp tanpa memasukkan apa pun lagi.
 */
export const bukaGerbangPengurus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("pengurus")
      .select("id")
      .eq("user_id", context.userId)
      .eq("aktif", true)
      .maybeSingle();
    if (!data) return { ok: false as const };
    const sesi = await useSession<SesiGerbang>(konfigurasiSesi());
    await sesi.update({ terbuka: true });
    return { ok: true as const };
  });
