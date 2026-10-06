import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { JudulHalaman } from "@/components/tata-letak-pengurus";
import { Tombol } from "@/components/tombol";
import { LencanaTindakLanjut } from "@/components/lencana-status";
import { TugasTindakLanjut } from "@/components/tugas-tindak-lanjut";
import { ambilDataPengingat, type KelompokPengingat } from "@/lib/pengingat.functions";
import {
  salinTeks,
  susunPesanPengingatGrup,
  susunPesanPengingatPj,
  tautanWa,
} from "@/lib/pesan-wa";

export const Route = createFileRoute("/_authenticated/admin/pengingat")({
  component: HalamanPengingat,
});

async function salin(pesan: string, keterangan: string) {
  const ok = await salinTeks(pesan);
  if (ok) toast.success(`${keterangan} tersalin — tempel di WhatsApp.`);
  else toast.error("Peramban menolak penyalinan. Blok teks pratinjau lalu salin manual.");
}

function KartuPj({ k, acuanPanjang }: { k: KelompokPengingat; acuanPanjang: string }) {
  const [lihat, setLihat] = useState(false);
  const pesan = susunPesanPengingatPj(k.nama, k.lewat, k.mendekat, acuanPanjang);
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 flex-1 text-xl text-primary">{k.nama}</h2>
        <span className="text-sm text-muted-foreground">
          {k.lewat.length} lewat tenggat · {k.mendekat.length} mendekati
        </span>
      </div>

      <ul className="mt-3 list-none space-y-2 p-0">
        {[...k.lewat, ...k.mendekat].map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 text-base">
            <LencanaTindakLanjut status={t.status} />
            <div className="min-w-0 flex-1">
              {t.notulensi_id ? (
                <Link
                  to="/admin/notulensi/$id"
                  params={{ id: t.notulensi_id }}
                  className="block whitespace-pre-line font-medium leading-7 text-primary underline underline-offset-2"
                >
                  {t.tugas}
                </Link>
              ) : (
                <TugasTindakLanjut tugas={t.tugas} />
              )}
              {t.terlambat_hari != null && (
                <span className="ml-2 font-semibold text-destructive">
                  terlambat {t.terlambat_hari} hari
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <Tombol onClick={() => salin(pesan, `Pesan untuk ${k.nama}`)}>Salin pesan</Tombol>
        {k.no_wa ? (
          <a
            href={tautanWa(pesan, k.no_wa)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border-2 border-border-field bg-card px-5 py-2.5 text-base font-semibold text-primary no-underline hover:bg-muted"
          >
            Kirim ke WA {k.nama}
          </a>
        ) : (
          <span className="inline-flex items-center rounded-lg bg-status-warn-bg px-4 py-2 text-sm font-semibold text-status-warn-fg">
            Nomor WA belum ada
          </span>
        )}
        <Tombol varian="sekunder" onClick={() => setLihat((v) => !v)} aria-expanded={lihat}>
          {lihat ? "Tutup pratinjau" : "Pratinjau pesan"}
        </Tombol>
      </div>

      {lihat && (
        <pre className="prosa mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
          {pesan}
        </pre>
      )}
    </section>
  );
}

function HalamanPengingat() {
  const ambil = useServerFn(ambilDataPengingat);
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["pengingat-wa"],
    queryFn: () => ambil(),
  });
  const [lihatGrup, setLihatGrup] = useState(false);

  if (isPending) return <p className="prosa text-muted-foreground">Menyusun pengingat…</p>;
  if (error || !data)
    return <p className="prosa text-destructive">Gagal memuat data pengingat. Coba muat ulang.</p>;

  const pesanGrup = susunPesanPengingatGrup(data.kelompok, data.acuan_panjang);

  return (
    <div>
      <JudulHalaman
        judul="Pengingat WhatsApp"
        keterangan={`Susunan pesan pengingat per ${data.acuan_panjang}. Salin pesan grup ke grup WhatsApp pengurus, atau kirim langsung ke masing-masing penanggung jawab.`}
        aksi={
          <Tombol varian="sekunder" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Memuat…" : "Muat ulang"}
          </Tombol>
        }
      />

      {data.kelompok.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-base text-muted-foreground">
          Alhamdulillah, tidak ada tindak lanjut yang menunggu. Tidak ada pengingat yang perlu
          dikirim hari ini.
        </p>
      ) : (
        <>
          <section className="mb-6 rounded-xl border-2 border-gold bg-card p-5 shadow-sm">
            <h2 className="m-0 text-xl text-primary">Pesan untuk grup WhatsApp</h2>
            <p className="prosa mt-1 text-muted-foreground">
              Satu pesan berisi seluruh {data.total_tugas} tugas dari {data.kelompok.length}{" "}
              penanggung jawab, siap ditempel ke grup.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tombol onClick={() => salin(pesanGrup, "Pesan grup")}>Salin pesan grup</Tombol>
              <Tombol
                varian="sekunder"
                onClick={() => setLihatGrup((v) => !v)}
                aria-expanded={lihatGrup}
              >
                {lihatGrup ? "Tutup pratinjau" : "Pratinjau pesan"}
              </Tombol>
            </div>
            {lihatGrup && (
              <pre className="prosa mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                {pesanGrup}
              </pre>
            )}
          </section>

          {data.tanpa_kontak.length > 0 && (
            <p className="mb-6 rounded-xl bg-status-warn-bg p-4 text-base text-status-warn-fg">
              Perlu dilengkapi: nomor WhatsApp belum tercatat untuk{" "}
              <strong>{data.tanpa_kontak.join(", ")}</strong>. Lengkapi di menu Pengurus agar
              tombol kirim langsung tersedia.
            </p>
          )}

          <div className="space-y-4">
            {data.kelompok.map((k) => (
              <KartuPj key={k.nama} k={k} acuanPanjang={data.acuan_panjang} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
