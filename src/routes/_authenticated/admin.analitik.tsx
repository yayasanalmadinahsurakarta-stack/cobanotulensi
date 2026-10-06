import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { JudulHalaman } from "@/components/tata-letak-pengurus";
import { LencanaTindakLanjut } from "@/components/lencana-status";
import { TugasTindakLanjut } from "@/components/tugas-tindak-lanjut";
import { ambilSemuaNotulensi } from "@/lib/notulensi-api";
import {
  formatTanggalSingkat,
  jumlahLewatTenggat,
  lewatTenggat,
  progresTindakLanjut,
} from "@/lib/notulensi-types";

export const Route = createFileRoute("/_authenticated/admin/analitik")({
  head: () => ({
    meta: [
      { title: "Analitik Notulensi — Yayasan Al Madinah Surakarta" },
      { name: "description", content: "Ringkasan rapat dan tindak lanjut Yayasan Al Madinah Surakarta." },
      { property: "og:title", content: "Analitik Notulensi — Yayasan Al Madinah Surakarta" },
      { property: "og:description", content: "Ringkasan rapat dan tindak lanjut Yayasan Al Madinah Surakarta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HalamanAnalitik,
});

const namaBulan = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function HalamanAnalitik() {
  const { data, isPending } = useQuery({
    queryKey: ["notulensi-semua"],
    queryFn: ambilSemuaNotulensi,
  });
  const semua = useMemo(() => data ?? [], [data]);

  const perBulan = useMemo(() => {
    const tahunIni = new Date().getFullYear().toString();
    return namaBulan.map((nama, i) => ({
      nama,
      jumlah: semua.filter(
        (n) => n.tanggal.startsWith(tahunIni) && Number(n.tanggal.slice(5, 7)) === i + 1,
      ).length,
    }));
  }, [semua]);

  const perOrang = useMemo(() => {
    const peta = new Map<string, { total: number; selesai: number; lewat: number }>();
    for (const n of semua) {
      for (const t of n.tindak_lanjut) {
        const nama = t.pj_nama ?? "Belum ditentukan";
        const b = peta.get(nama) ?? { total: 0, selesai: 0, lewat: 0 };
        b.total += 1;
        if (t.status === "Sudah dibahas") b.selesai += 1;
        if (lewatTenggat(t)) b.lewat += 1;
        peta.set(nama, b);
      }
    }
    return [...peta.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [semua]);

  const tl = semua.flatMap((n) => n.tindak_lanjut);
  const progres = progresTindakLanjut(tl);
  const maks = Math.max(1, ...perBulan.map((b) => b.jumlah));

  const lewatTenggatDaftar = useMemo(() => {
    const hariIni = new Date().toISOString().slice(0, 10);
    return semua
      .flatMap((n) =>
        n.tindak_lanjut
          .filter((t) => lewatTenggat(t))
          .map((t) => ({
            notulensiId: n.id,
            tema: n.tema,
            tugas: t.tugas,
            pj: t.pj_nama ?? "Belum ditentukan",
            deadline: t.deadline as string,
            status: t.status,
            hariTerlambat: Math.floor(
              (new Date(hariIni + "T00:00:00").getTime() -
                new Date(t.deadline + "T00:00:00").getTime()) /
                86_400_000,
            ),
          })),
      )
      .sort((a, b) => b.hariTerlambat - a.hariTerlambat);
  }, [semua]);

  if (isPending) return <p className="text-base text-muted-foreground">Sedang memuat data…</p>;

  return (
    <>
      <JudulHalaman
        judul="Analitik"
        keterangan="Ringkasan kegiatan rapat dan penyelesaian tindak lanjut."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kotak label="Jumlah rapat" nilai={semua.length} />
        <Kotak label="Tindak lanjut selesai" nilai={`${progres.selesai} dari ${progres.total}`} />
        <Kotak label="Lewat tenggat" nilai={jumlahLewatTenggat(tl)} merah />
      </div>

      <section className="mt-10">
        <h2 className="text-2xl text-primary">
          Rapat per bulan ({new Date().getFullYear()})
        </h2>
        <ul className="mt-4 flex list-none flex-col gap-2 p-0">
          {perBulan.map((b) => (
            <li key={b.nama} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-base">{b.nama}</span>
              <span
                className="h-6 rounded bg-primary"
                style={{ width: `${(b.jumlah / maks) * 100}%`, minWidth: b.jumlah ? "0.5rem" : 0 }}
                aria-hidden="true"
              />
              <span className="text-base font-semibold">{b.jumlah} rapat</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl text-primary">Beban tindak lanjut per penanggung jawab</h2>
        <div className="tabel-gulir mt-4 rounded-xl border border-border-hair bg-card">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border-hair">
                {["Penanggung jawab", "Total tugas", "Selesai", "Lewat tenggat"].map((h) => (
                  <th key={h} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perOrang.map(([nama, b]) => (
                <tr key={nama} className="border-b border-border-hair last:border-b-0">
                  <td className="px-4 py-3 text-base">{nama}</td>
                  <td className="px-4 py-3 text-base">{b.total}</td>
                  <td className="px-4 py-3 text-base">{b.selesai}</td>
                  <td
                    className={`px-4 py-3 text-base ${b.lewat > 0 ? "font-semibold text-destructive" : ""}`}
                  >
                    {b.lewat}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {perOrang.length === 0 && (
          <p className="mt-4 rounded-xl border border-border-field bg-card p-5 text-base">
            Belum ada tindak lanjut yang tercatat.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl text-primary">
          Tindak lanjut lewat tenggat ({lewatTenggatDaftar.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Diurutkan dari yang paling lama terlambat. Klik tema untuk membuka notulensinya.
        </p>
        {lewatTenggatDaftar.length > 0 ? (
          <div className="tabel-gulir mt-4 rounded-xl border border-border-hair bg-card">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-hair">
                  {[
                    "Terlambat",
                    "Tugas",
                    "Penanggung jawab",
                    "Tenggat",
                    "Status",
                    "Notulensi",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lewatTenggatDaftar.map((t, i) => (
                  <tr key={i} className="border-b border-border-hair last:border-b-0">
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-status-danger-bg px-2.5 py-0.5 text-sm font-semibold text-status-danger-fg">
                        {t.hariTerlambat} hari
                      </span>
                    </td>
                    <td className="px-4 py-3 text-base"><TugasTindakLanjut tugas={t.tugas} /></td>
                    <td className="px-4 py-3 text-base">{t.pj}</td>
                    <td className="px-4 py-3 text-base">{formatTanggalSingkat(t.deadline)}</td>
                    <td className="px-4 py-3">
                      <LencanaTindakLanjut status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-base">
                      <Link
                        to="/admin/notulensi/$id"
                        params={{ id: t.notulensiId }}
                        className="font-semibold text-primary underline underline-offset-2"
                      >
                        {t.tema}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-border-field bg-card p-5 text-base">
            Alhamdulillah, tidak ada tindak lanjut yang lewat tenggat.
          </p>
        )}
      </section>
    </>
  );
}

function Kotak({
  label,
  nilai,
  merah,
}: {
  label: string;
  nilai: string | number;
  merah?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-hair bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${merah && Number(nilai) > 0 ? "text-destructive" : "text-primary"}`}
      >
        {nilai}
      </p>
    </div>
  );
}
