import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rapikanNomorWa } from "./pesan-wa";
import type { StatusTindakLanjut } from "./notulensi-types";

export type TugasPengingat = {
  id: string;
  tugas: string;
  deadline: string;
  status: StatusTindakLanjut;
  asal: string | null;
  notulensi_id: string | null;
  terlambat_hari: number | null; // negatif = sisa hari
};

export type KelompokPengingat = {
  nama: string;
  no_wa: string | null;
  lewat: TugasPengingat[];
  mendekat: TugasPengingat[];
};

export type DataPengingat = {
  acuan: string;
  acuan_panjang: string;
  kelompok: KelompokPengingat[];
  total_tugas: number;
  tanpa_kontak: string[];
};

/** Tanggal hari ini menurut Waktu Indonesia Barat (UTC+7), format YYYY-MM-DD. */
function hariIniWIB(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function selisihHari(deadline: string, acuan: string): number {
  return Math.round(
    (Date.parse(deadline + "T00:00:00Z") - Date.parse(acuan + "T00:00:00Z")) / 86400000,
  );
}

/**
 * Mengambil seluruh tindak lanjut yang belum selesai dan punya tenggat,
 * dikelompokkan per penanggung jawab untuk disusun menjadi pesan WhatsApp.
 * Berbeda dengan pengingat surat, di sini SEMUA tugas mendatang ikut ditampilkan
 * agar sekretaris punya gambaran lengkap saat menempel ke grup.
 */
export const ambilDataPengingat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<DataPengingat> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const acuan = hariIniWIB();

    const { data: tugasRaw, error: errTugas } = await supabaseAdmin
      .from("tindak_lanjut")
      .select(
        "id, tugas, deadline, status, pj_id, pj_nama, notulensi_id, notulensi:notulensi_id (nomor, tema, dihapus_pada)",
      )
      .neq("status", "Sudah dibahas")
      .not("deadline", "is", null)
      .order("deadline", { ascending: true });

    if (errTugas) throw new Error(errTugas.message);

    const { data: pengurusRaw } = await supabaseAdmin
      .from("pengurus")
      .select("id, nama_lengkap, no_wa, aktif");

    const pengurusPerId = new Map((pengurusRaw ?? []).map((p) => [p.id, p]));
    const pengurusPerNama = new Map(
      (pengurusRaw ?? []).map((p) => [
        (p.nama_lengkap as string).toLowerCase().trim(),
        p,
      ]),
    );

    const kelompok = new Map<string, KelompokPengingat>();
    const tanpaKontak = new Set<string>();
    let total = 0;

    for (const mentah of (tugasRaw ?? []) as unknown as {
      id: string;
      tugas: string;
      deadline: string;
      status: string;
      pj_id: string | null;
      pj_nama: string | null;
      notulensi_id: string | null;
      notulensi: { nomor: string | null; tema: string; dihapus_pada: string | null } | null;
    }[]) {
      if (mentah.notulensi?.dihapus_pada) continue;
      const p =
        (mentah.pj_id ? pengurusPerId.get(mentah.pj_id) : undefined) ??
        (mentah.pj_nama
          ? pengurusPerNama.get(mentah.pj_nama.toLowerCase().trim())
          : undefined);
      const nama = (p?.nama_lengkap as string | undefined) ?? mentah.pj_nama ?? "Belum ditentukan";
      const noWa = p?.aktif ? rapikanNomorWa(p.no_wa as string | null) : null;

      if (!kelompok.has(nama)) kelompok.set(nama, { nama, no_wa: noWa, lewat: [], mendekat: [] });
      if (!noWa) tanpaKontak.add(nama);

      const sisa = selisihHari(mentah.deadline, acuan);
      const item: TugasPengingat = {
        id: mentah.id,
        tugas: mentah.tugas,
        deadline: mentah.deadline,
        status: mentah.status as StatusTindakLanjut,
        asal: mentah.notulensi
          ? [mentah.notulensi.nomor, mentah.notulensi.tema].filter(Boolean).join(" — ")
          : null,
        notulensi_id: mentah.notulensi_id,
        terlambat_hari: sisa < 0 ? Math.abs(sisa) : null,
      };
      if (sisa < 0) kelompok.get(nama)!.lewat.push(item);
      else kelompok.get(nama)!.mendekat.push(item);
      total += 1;
    }

    // Urutkan: yang punya tugas lewat tenggat paling banyak di atas.
    const daftar = [...kelompok.values()].sort(
      (a, b) => b.lewat.length - a.lewat.length || b.mendekat.length - a.mendekat.length,
    );

    return {
      acuan,
      acuan_panjang: new Date(acuan + "T00:00:00Z").toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      kelompok: daftar,
      total_tugas: total,
      tanpa_kontak: [...tanpaKontak],
    };
  });
