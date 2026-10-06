import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Identitas yayasan yang bisa diganti pengurus tanpa mengubah kode. */
export type Identitas = {
  logo: string | null;
  kop: string | null;
  namaKetua: string;
  jabatanKetua: string;
  namaSekretaris: string;
  jabatanSekretaris: string;
  namaYayasan: string;
};

const BAWAAN: Identitas = {
  logo: null,
  kop: null,
  namaKetua: "Ustadz Jauhari, Lc.",
  jabatanKetua: "Ketua Yayasan",
  namaSekretaris: "Arief Wijaya",
  jabatanSekretaris: "Sekretaris",
  namaYayasan: "Yayasan Al Madinah Surakarta",
};

const PETA: Record<keyof Identitas, string> = {
  logo: "identitas_logo",
  kop: "identitas_kop",
  namaKetua: "identitas_nama_ketua",
  jabatanKetua: "identitas_jabatan_ketua",
  namaSekretaris: "identitas_nama_sekretaris",
  jabatanSekretaris: "identitas_jabatan_sekretaris",
  namaYayasan: "identitas_nama_yayasan",
};

async function baca(kunci: string[]): Promise<Record<string, string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("pengaturan").select("kunci, nilai").in("kunci", kunci);
  const hasil: Record<string, string> = {};
  for (const baris of data ?? []) {
    if (baris.nilai && baris.nilai.trim() !== "") hasil[baris.kunci] = baris.nilai;
  }
  return hasil;
}

/** Dipakai header dan tanda tangan. Tidak memuat gambar kop yang berukuran besar. */
export const ambilIdentitas = createServerFn({ method: "GET" }).handler(async () => {
  const nilai = await baca([
    PETA.logo,
    PETA.namaKetua,
    PETA.jabatanKetua,
    PETA.namaSekretaris,
    PETA.jabatanSekretaris,
    PETA.namaYayasan,
  ]);
  return {
    ...BAWAAN,
    logo: nilai[PETA.logo] ?? null,
    namaKetua: nilai[PETA.namaKetua] ?? BAWAAN.namaKetua,
    jabatanKetua: nilai[PETA.jabatanKetua] ?? BAWAAN.jabatanKetua,
    namaSekretaris: nilai[PETA.namaSekretaris] ?? BAWAAN.namaSekretaris,
    jabatanSekretaris: nilai[PETA.jabatanSekretaris] ?? BAWAAN.jabatanSekretaris,
    namaYayasan: nilai[PETA.namaYayasan] ?? BAWAAN.namaYayasan,
  } satisfies Identitas;
});

/** Gambar kop resmi untuk halaman cetak. Diambil terpisah karena berkasnya besar. */
export const ambilKop = createServerFn({ method: "GET" }).handler(async () => {
  const nilai = await baca([PETA.kop]);
  return { kop: nilai[PETA.kop] ?? null };
});

function periksaGambar(nilai: string | null, nama: string): string | null {
  if (nilai === null || nilai === "") return null;
  if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(nilai)) {
    throw new Error(`Berkas ${nama} harus berupa gambar PNG, JPG, WEBP, atau SVG.`);
  }
  if (nilai.length > 1_400_000) {
    throw new Error(`Ukuran ${nama} terlalu besar. Maksimal sekitar 1 MB.`);
  }
  return nilai;
}

export const simpanIdentitas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<Identitas>) => {
    const teks = (v: unknown, maks = 120) => String(v ?? "").trim().slice(0, maks);
    return {
      logo: input.logo === undefined ? undefined : periksaGambar(input.logo, "logo"),
      kop: input.kop === undefined ? undefined : periksaGambar(input.kop, "kop surat"),
      namaKetua: input.namaKetua === undefined ? undefined : teks(input.namaKetua),
      jabatanKetua: input.jabatanKetua === undefined ? undefined : teks(input.jabatanKetua),
      namaSekretaris:
        input.namaSekretaris === undefined ? undefined : teks(input.namaSekretaris),
      jabatanSekretaris:
        input.jabatanSekretaris === undefined ? undefined : teks(input.jabatanSekretaris),
      namaYayasan: input.namaYayasan === undefined ? undefined : teks(input.namaYayasan, 160),
    };
  })
  .handler(async ({ data, context }) => {
    const baris = (Object.keys(PETA) as (keyof Identitas)[])
      .filter((k) => data[k] !== undefined)
      .map((k) => ({
        kunci: PETA[k],
        nilai: data[k] === null ? "" : String(data[k]),
        diubah_pada: new Date().toISOString(),
      }));
    if (baris.length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("pengaturan")
      .upsert(baris, { onConflict: "kunci" });
    if (error) throw new Error("Hanya approver yang boleh mengubah identitas yayasan.");
    return { ok: true };
  });
