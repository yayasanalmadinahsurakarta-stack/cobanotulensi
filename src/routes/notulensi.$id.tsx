import { TeksKaya } from "@/components/teks-kaya";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { periksaGerbang } from "@/lib/gate.functions";
import { useQuery } from "@tanstack/react-query";
import { KakiSitus, KopSitus } from "@/components/kop-situs";
import {
  LencanaKehadiran,
  LencanaTindakLanjut,
  LencanaVisibilitas,
} from "@/components/lencana-status";
import { TautanTombol } from "@/components/tombol";
import { KolomKomentarPublik } from "@/components/komentar";
import { TugasTindakLanjut } from "@/components/tugas-tindak-lanjut";
import { ambilSatuNotulensi } from "@/lib/notulensi-api";
import { formatRupiah, formatTanggal, type Notulensi } from "@/lib/notulensi-types";

export const Route = createFileRoute("/notulensi/$id")({
  beforeLoad: async ({ location }) => {
    const { terbuka } = await periksaGerbang();
    if (!terbuka) throw redirect({ to: "/pin", search: { lanjut: location.href } });
  },
  head: () => ({
    meta: [
      { title: "Notulensi Rapat — Yayasan Al Madinah Surakarta" },
      {
        name: "description",
        content: "Rincian notulensi rapat Yayasan Al Madinah Surakarta beserta keputusan, tindak lanjut, dan daftar hadir.",
      },
      { property: "og:title", content: "Notulensi Rapat — Yayasan Al Madinah Surakarta" },
      {
        property: "og:description",
        content: "Rincian notulensi rapat beserta keputusan, tindak lanjut, dan daftar hadir.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HalamanNotulensi,
});

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="border-b-2 border-b-gold pb-2 text-xl text-primary">{judul}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HalamanNotulensi() {
  const { id } = Route.useParams();
  const { data, isPending, isError } = useQuery({
    queryKey: ["notulensi", id],
    queryFn: () => ambilSatuNotulensi(id),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <div className="tanpa-cetak">
        <KopSitus />
      </div>

      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {isPending && <p className="text-base text-muted-foreground">Sedang memuat notulensi…</p>}
        {isError && (
          <p className="rounded-xl bg-status-danger-bg p-5 text-base text-status-danger-fg">
            Notulensi gagal dimuat. Silakan muat ulang halaman ini.
          </p>
        )}
        {!isPending && !isError && !data && <TidakTersedia />}
        {data && <IsiNotulensi notulensi={data} />}
      </main>

      <div className="tanpa-cetak">
        <KakiSitus />
      </div>
    </div>
  );
}

function TidakTersedia() {
  return (
    <div>
      <h1 className="text-2xl text-primary">Notulensi ini tidak tersedia untuk umum</h1>
      <p className="prosa mt-3 text-muted-foreground">
        Notulensi yang Anda cari mungkin masih berupa draf, menunggu persetujuan, atau ditetapkan
        sebagai catatan internal pengurus. Pengurus dapat membukanya melalui Area Sekertaris.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <TautanTombol to="/">Kembali ke daftar notulensi</TautanTombol>
        <TautanTombol to="/admin" varian="sekunder">
          Masuk ke Area Sekertaris
        </TautanTombol>
      </div>
    </div>
  );
}

function IsiNotulensi({ notulensi }: { notulensi: Notulensi }) {
  const pesanWa = encodeURIComponent(
    `Notulensi ${notulensi.nomor ?? ""} — ${notulensi.tema}\n${formatTanggal(notulensi.tanggal)}`,
  );

  return (
    <article className="min-w-0 max-w-full">
      <div className="hidden items-center gap-3 border-b-[3px] border-b-gold pb-3 print:flex">
        <img
          src="/logo-almadinah.png"
          alt="Logo Yayasan Al Madinah Surakarta"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
        />
        <span className="flex flex-col">
          <span className="text-lg font-semibold uppercase text-primary">
            Yayasan Al Madinah Surakarta
          </span>
          <span className="text-sm">Notulensi Rapat</span>
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {notulensi.nomor && <span className="nomor-notulen text-base">{notulensi.nomor}</span>}
        <LencanaVisibilitas visibilitas={notulensi.visibilitas} />
      </div>

      <h1 className="mt-3 text-2xl break-words text-primary sm:text-3xl">{notulensi.tema}</h1>

      <dl className="mt-6 grid gap-x-8 gap-y-3 rounded-xl border border-border-hair bg-card p-5 sm:grid-cols-2">
        <Baris label="Tanggal" nilai={formatTanggal(notulensi.tanggal)} />
        <Baris
          label="Waktu"
          nilai={
            notulensi.waktu_mulai
              ? `${notulensi.waktu_mulai}${notulensi.waktu_selesai ? ` – ${notulensi.waktu_selesai}` : ""} WIB`
              : "Tidak dicatat"
          }
        />
        <Baris label="Tempat" nilai={notulensi.tempat ?? "Tidak dicatat"} />
        <Baris label="Pemimpin rapat" nilai={notulensi.pemimpin ?? "Tidak dicatat"} />
        <Baris label="Notulis" nilai={notulensi.notulis ?? "Tidak dicatat"} />
        {notulensi.anggaran !== null && (
          <Baris label="Anggaran dibahas" nilai={formatRupiah(notulensi.anggaran)} />
        )}
      </dl>

      <Bagian judul="Pembahasan">
        <TeksKaya panel nilai={notulensi.pembahasan} className="mt-3" />
      </Bagian>

      {notulensi.keputusan && (
        <Bagian judul="Hasil dan Keputusan Rapat">
          <p className="prosa whitespace-pre-line rounded-xl bg-gold-pale p-5 text-base">
            {notulensi.keputusan}
          </p>
        </Bagian>
      )}

      {notulensi.hal_urgen && (
        <Bagian judul="Hal yang Butuh Keputusan Segera">
          <p className="prosa rounded-xl bg-status-warn-bg p-5 text-base text-status-warn-fg">
            {notulensi.hal_urgen}
          </p>
        </Bagian>
      )}

      {notulensi.tindak_lanjut.length > 0 && (
        <Bagian judul="Tindak Lanjut">
          <p className="mb-3 text-sm text-muted-foreground">
            Tugas yang panjang dapat diklik untuk dibaca selengkapnya.
          </p>
          <div className="tabel-gulir max-w-full overflow-x-auto rounded-xl border border-border-hair bg-card">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-hair">
                  <Kepala>No.</Kepala>
                  <Kepala>Pekerjaan</Kepala>
                  <Kepala>Penanggung jawab</Kepala>
                  <Kepala>Batas waktu</Kepala>
                  <Kepala>Status</Kepala>
                </tr>
              </thead>
              <tbody>
                {notulensi.tindak_lanjut.map((t) => (
                  <tr key={t.id} className="border-b border-border-hair last:border-b-0">
                    <Sel>{t.urutan}</Sel>
                    <Sel><TugasTindakLanjut tugas={t.tugas} /></Sel>
                    <Sel>{t.pj_nama ?? "Belum ditentukan"}</Sel>
                    <Sel>{t.deadline ? formatTanggal(t.deadline) : "Tidak ada"}</Sel>
                    <Sel>
                      <LencanaTindakLanjut status={t.status} />
                    </Sel>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bagian>
      )}

      {notulensi.peserta.length > 0 && (
        <Bagian judul="Daftar Hadir">
          <div className="tabel-gulir max-w-full overflow-x-auto rounded-xl border border-border-hair bg-card">
            <table className="w-full min-w-[26rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-hair">
                  <Kepala>Nama</Kepala>
                  <Kepala>Jabatan</Kepala>
                  <Kepala>Kehadiran</Kepala>
                </tr>
              </thead>
              <tbody>
                {notulensi.peserta.map((p) => (
                  <tr key={p.id} className="border-b border-border-hair last:border-b-0">
                    <Sel>{p.nama}</Sel>
                    <Sel>{p.jabatan ?? "—"}</Sel>
                    <Sel>
                      <LencanaKehadiran status={p.kehadiran} />
                    </Sel>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bagian>
      )}

      <div className="tanpa-cetak mt-10 rounded-xl border border-border-hair bg-card p-5">
        <KolomKomentarPublik notulensiId={notulensi.id} />
      </div>

      <div className="tanpa-cetak mt-10 flex flex-wrap gap-3">
        <a
          href={`https://wa.me/?text=${pesanWa}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-base font-semibold text-primary-foreground no-underline hover:bg-primary-pressed"
        >
          Bagikan ke WhatsApp
        </a>
        <button
          onClick={() => window.print()}
          className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border-2 border-border-field bg-card px-5 py-2.5 text-base font-semibold text-primary hover:bg-muted"
        >
          Cetak halaman notulensi
        </button>
        <TautanTombol to="/" varian="sekunder">
          Kembali ke daftar notulensi
        </TautanTombol>
      </div>
    </article>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="m-0 text-base">{nilai}</dd>
    </div>
  );
}

function Kepala({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">{children}</th>;
}

function Sel({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-base break-words">{children}</td>;
}
