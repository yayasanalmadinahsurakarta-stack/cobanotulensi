import { TeksKaya } from "@/components/teks-kaya";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { periksaGerbang } from "@/lib/gate.functions";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileSearch,
  Info,
  ListChecks,
  MessageSquareText,
  Printer,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { KakiSitus, KopSitus } from "@/components/kop-situs";
import { LencanaKehadiran, LencanaTindakLanjut } from "@/components/lencana-status";
import { MenuBerbagiWa } from "@/components/menu-berbagi-wa";
import {
  ambilDetailPublik,
  ambilRingkasPublik,
  type RingkasPublik,
} from "@/lib/notulensi-api";
import {
  formatRupiah,
  formatTanggal,
  type StatusTindakLanjut,
} from "@/lib/notulensi-types";
import gambarBagikan from "@/assets/notulensi-almadinah.png.asset.json";

const JUDUL = "Notulensi Rapat — Yayasan Al Madinah Surakarta";
const PENJELAS =
  "Portal resmi arsip notulensi rapat Yayasan Al Madinah Surakarta. Telusuri, baca, dan bagikan notulensi yang dibagikan pengurus.";
const ALAMAT_SITUS = "https://notulensirapatyam.lovable.app";
const GAMBAR_BAGIKAN = `${ALAMAT_SITUS}${gambarBagikan.url}`;

export const Route = createFileRoute("/")({
  beforeLoad: async ({ location }) => {
    const { terbuka } = await periksaGerbang();
    if (!terbuka) throw redirect({ to: "/pin", search: { lanjut: location.href } });
  },
  head: () => ({
    meta: [
      { title: JUDUL },
      { name: "description", content: PENJELAS },
      { property: "og:title", content: JUDUL },
      { property: "og:description", content: PENJELAS },
      { property: "og:type", content: "website" },
      { property: "og:url", content: ALAMAT_SITUS },
      { property: "og:image", content: GAMBAR_BAGIKAN },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Logo Yayasan Al Madinah Surakarta" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: JUDUL },
      { name: "twitter:description", content: PENJELAS },
      { name: "twitter:image", content: GAMBAR_BAGIKAN },
    ],
    links: [{ rel: "canonical", href: ALAMAT_SITUS }],
  }),
  component: PortalTamu,
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

const jenisRapat: Record<string, string> = {
  PH: "Rapat Pengurus Harian",
  PL: "Rapat Pleno",
  YYS: "Rapat Yayasan",
  KOR: "Rapat Koordinasi",
  EVL: "Rapat Evaluasi",
};

/** Menebak jenis rapat dari kode di nomor notulen, misal 007/NOT-PH/VIII/2026. */
function jenisDariNomor(nomor: string | null): string {
  if (!nomor) return "Rapat";
  const kode = nomor.split("/")[1]?.split("-")[1]?.toUpperCase() ?? "";
  return jenisRapat[kode] ?? "Rapat";
}

const semuaStatus: StatusTindakLanjut[] = [
  "Belum dibahas",
  "Butuh Tindak Lanjut",
  "Sudah dibahas",
];

const kelasPilihan =
  "mt-2 block min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-card px-3 py-2.5 text-base text-foreground";

function PortalTamu() {
  const [kataKunci, setKataKunci] = useState("");
  const [status, setStatus] = useState("");
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [pj, setPj] = useState("");
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const refHasil = useRef<HTMLParagraphElement>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ["notulensi-publik-ringkas"],
    queryFn: ambilRingkasPublik,
  });
  const semua = useMemo(() => data ?? [], [data]);

  const daftarTahun = useMemo(
    () => [...new Set(semua.map((n) => n.tanggal.slice(0, 4)))].sort().reverse(),
    [semua],
  );
  const daftarPj = useMemo(
    () => [...new Set(semua.flatMap((n) => n.daftar_pj))].sort((a, b) => a.localeCompare(b, "id")),
    [semua],
  );

  const hasil = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    return semua.filter((n) => {
      if (
        q &&
        !n.tema.toLowerCase().includes(q) &&
        !n.cuplikan.toLowerCase().includes(q) &&
        !(n.nomor ?? "").toLowerCase().includes(q)
      )
        return false;
      if (status && !n.status_tindak_lanjut.includes(status as StatusTindakLanjut)) return false;
      if (bulan && n.tanggal.slice(5, 7) !== bulan) return false;
      if (tahun && n.tanggal.slice(0, 4) !== tahun) return false;
      if (pj && !n.daftar_pj.includes(pj)) return false;
      return true;
    });
  }, [semua, kataKunci, status, bulan, tahun, pj]);

  const urgen = useMemo(
    () => semua.filter((n) => n.hal_urgen && n.hal_urgen_tampil !== "tidak"),
    [semua],
  );

  const adaSaringan = Boolean(kataKunci || status || bulan || tahun || pj);

  return (
    <div className="flex min-h-screen flex-col">
      <KopSitus />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <section className="sorotan-portal muncul overflow-hidden rounded-2xl p-6 text-primary-foreground sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-primary-pressed">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Yayasan Al Madinah Surakarta
          </span>
          <h1 className="mt-3 flex items-center gap-3 text-2xl text-primary-foreground sm:text-3xl">
            <ClipboardList aria-hidden="true" className="h-8 w-8 shrink-0 text-gold" />
            Arsip Notulensi Rapat
          </h1>
          <p className="prosa mt-3 max-w-3xl text-primary-foreground/90">{PENJELAS}</p>
        </section>

        {urgen.length > 0 && (
          <section aria-label="Hal penting" className="muncul jeda-1 mt-8 space-y-3">
            {urgen.map((n) => (
              <PanelUrgen key={n.id} notulensi={n} />
            ))}
          </section>
        )}

        <section aria-label="Pencarian dan saringan" className="panel-saringan-portal muncul jeda-2 mt-8 rounded-xl p-5">
          <form
            className="max-w-xl"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              refHasil.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <label htmlFor="cari" className="flex items-center gap-2 text-base font-semibold">
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              Cari notulensi (tema atau isi pembahasan)
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="cari"
                type="search"
                enterKeyHint="search"
                value={kataKunci}
                onChange={(e) => setKataKunci(e.target.value)}
                placeholder="Contoh: tahun ajaran, atau 007"
                className="block min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-4 py-2.5 text-base text-foreground placeholder:text-faint-foreground"
              />
              <button
                type="submit"
                aria-label="Cari notulensi"
                title="Cari"
                className="inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground transition-transform hover:bg-primary-deep active:scale-95"
              >
                <Search aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </form>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="f-status" className="block text-base font-semibold">
                Status tindak lanjut
              </label>
              <select
                id="f-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={kelasPilihan}
              >
                <option value="">Semua status</option>
                {semuaStatus.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-bulan" className="block text-base font-semibold">
                Bulan
              </label>
              <select
                id="f-bulan"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className={kelasPilihan}
              >
                <option value="">Semua bulan</option>
                {namaBulan.map((b, i) => (
                  <option key={b} value={String(i + 1).padStart(2, "0")}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-tahun" className="block text-base font-semibold">
                Tahun
              </label>
              <select
                id="f-tahun"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                className={kelasPilihan}
              >
                <option value="">Semua tahun</option>
                {daftarTahun.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-pj" className="block text-base font-semibold">
                Nama penanggung jawab
              </label>
              <select
                id="f-pj"
                value={pj}
                onChange={(e) => setPj(e.target.value)}
                className={kelasPilihan}
              >
                <option value="">Semua penanggung jawab</option>
                {daftarPj.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {isPending && (
          <p className="mt-8 text-base text-muted-foreground">Sedang memuat daftar notulensi…</p>
        )}

        {isError && (
          <p className="mt-8 rounded-xl bg-status-danger-bg p-5 text-base text-status-danger-fg">
            Daftar notulensi gagal dimuat. Silakan muat ulang halaman ini.
          </p>
        )}

        {!isPending && !isError && (
          <>
            <p ref={refHasil} className="mt-6 scroll-mt-24 text-base text-muted-foreground" aria-live="polite">
              {hasil.length} dari {semua.length} notulensi
            </p>

            <ul className="muncul jeda-3 mt-4 grid list-none gap-4 p-0">
              {hasil.map((n) => (
                <KartuNotulensi
                  key={n.id}
                  notulensi={n}
                  kataKunci={kataKunci.trim()}
                  terbuka={terbuka === n.id}
                  onGanti={() => setTerbuka(terbuka === n.id ? null : n.id)}
                />
              ))}
            </ul>

            {hasil.length === 0 && (
              <div className="mt-6 rounded-xl border border-border-field bg-card p-6 text-center">
                <FileSearch aria-hidden="true" className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-3 text-lg font-semibold text-primary">
                  Belum ada notulensi yang cocok
                </p>
                <p className="prosa mt-2 text-base text-muted-foreground">
                  {adaSaringan
                    ? "Coba pakai kata yang lebih pendek, atau kembalikan saringan ke pilihan “Semua”."
                    : "Notulensi yang sudah disetujui dan boleh dibaca umum akan muncul di halaman ini."}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <KakiSitus />
    </div>
  );
}

function PanelUrgen({ notulensi }: { notulensi: RingkasPublik }) {
  const teks = `${notulensi.hal_urgen} — ${notulensi.tema}`;
  return (
    <div className="overflow-hidden rounded-xl border-2 border-destructive bg-status-danger-bg p-4">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-status-danger-fg">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        Hal penting
      </p>
      {notulensi.hal_urgen_tampil === "teks_berjalan" ? (
        <div className="mt-2 overflow-hidden">
          <div className="teks-berjalan">
            <span className="whitespace-nowrap text-base text-status-danger-fg">{teks}</span>
            <span aria-hidden="true" className="whitespace-nowrap text-base text-status-danger-fg">
              {teks}
            </span>
          </div>
        </div>
      ) : (
        <p className="prosa mt-2 text-base text-status-danger-fg">{teks}</p>
      )}
    </div>
  );
}

/** Menyorot kata kunci pencarian di dalam teks dengan <mark>. */
function Sorot({ teks, kataKunci }: { teks: string; kataKunci: string }) {
  if (!kataKunci) return <>{teks}</>;
  const bagian = teks.split(new RegExp(`(${kataKunci.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {bagian.map((b, i) =>
        b.toLowerCase() === kataKunci.toLowerCase() ? (
          <mark key={i} className="sorot-cari">
            {b}
          </mark>
        ) : (
          <span key={i}>{b}</span>
        ),
      )}
    </>
  );
}

function KartuNotulensi({
  notulensi,
  kataKunci,
  terbuka,
  onGanti,
}: {
  notulensi: RingkasPublik;
  kataKunci: string;
  terbuka: boolean;
  onGanti: () => void;
}) {
  const idPanel = useId();
  return (
    <li className="angkat min-w-0 max-w-full rounded-xl border border-border-hair bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
          {formatTanggal(notulensi.tanggal)}
        </span>
        <span className="rounded-md bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
          {jenisDariNomor(notulensi.nomor)}
        </span>
        {notulensi.nomor && <span className="nomor-notulen text-sm">{notulensi.nomor}</span>}
      </div>

      <h2 className="mt-2 text-xl">
        <Link
          to="/notulensi/$id"
          params={{ id: notulensi.id }}
          className="text-primary no-underline transition-colors hover:text-gold-text hover:underline focus-visible:underline"
        >
          <Sorot teks={notulensi.tema} kataKunci={kataKunci} />
        </Link>
      </h2>
      <Link
        to="/notulensi/$id"
        params={{ id: notulensi.id }}
        className="prosa mt-2 block line-clamp-2 text-base text-foreground no-underline hover:text-primary"
      >
        <Sorot teks={notulensi.cuplikan} kataKunci={kataKunci} />
        {notulensi.ada_lanjutan ? "…" : ""}
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">
        Klik judul atau ringkasan di atas untuk membuka notulensi lengkap.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGanti}
          aria-expanded={terbuka}
          aria-controls={idPanel}
          className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border-2 border-border-field bg-card px-5 py-2.5 text-base font-semibold text-primary hover:bg-muted"
        >
          {terbuka ? (
            <ChevronUp aria-hidden="true" className="h-5 w-5" />
          ) : (
            <ChevronDown aria-hidden="true" className="h-5 w-5" />
          )}
          {terbuka ? "Tutup Detail" : "Lihat Detail"}
        </button>

        <MenuBerbagiWa dapatkan={() => ambilDetailPublik(notulensi.id)} />

        <Link
          to="/cetak/$id"
          params={{ id: notulensi.id }}
          target="_blank"
          className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border-2 border-border-field bg-card px-5 py-2.5 text-base font-semibold text-primary no-underline hover:bg-muted"
        >
          <Printer aria-hidden="true" className="h-5 w-5" />
          Cetak / PDF
        </Link>
      </div>

      {terbuka && (
        <div id={idPanel} className="muncul-lembut mt-5 border-t border-border-hair pt-5">
          <IsiDetail id={notulensi.id} />
        </div>
      )}
    </li>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <tr>
      <th scope="row" className="w-32 py-2 pr-3 text-left align-top text-base font-semibold break-words sm:w-56 sm:pr-4">
        {label}
      </th>
      <td className="py-2 text-base break-words">{nilai}</td>
    </tr>
  );
}

function IsiDetail({ id }: { id: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["notulensi-publik-detail", id],
    queryFn: () => ambilDetailPublik(id),
  });

  if (isPending) return <p className="text-base text-muted-foreground">Sedang memuat isi notulensi…</p>;
  if (isError || !data)
    return (
      <p className="rounded-lg bg-status-danger-bg p-4 text-base text-status-danger-fg">
        Isi notulensi gagal dimuat. Silakan coba lagi.
      </p>
    );

  const waktu =
    data.waktu_mulai || data.waktu_selesai
      ? `${(data.waktu_mulai ?? "").slice(0, 5) || "—"} s.d. ${(data.waktu_selesai ?? "").slice(0, 5) || "selesai"}`
      : "—";

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <section className="min-w-0">
        <h3 className="flex items-center gap-2 text-lg text-primary">
          <Info aria-hidden="true" className="h-5 w-5" />
          Identitas Rapat
        </h3>
        <div className="mt-2 max-w-full">
          <table className="w-full table-fixed border-collapse">

            <tbody>
              <Baris label="Hari / tanggal" nilai={formatTanggal(data.tanggal)} />
              <Baris label="Waktu" nilai={waktu} />
              <Baris label="Tempat" nilai={data.tempat ?? "—"} />
              <Baris label="Pemimpin rapat" nilai={data.pemimpin ?? "—"} />
              <Baris label="Notulis" nilai={data.notulis ?? "—"} />
              {data.anggaran !== null && (
                <Baris label="Anggaran" nilai={formatRupiah(data.anggaran)} />
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-lg text-primary">
          <Users aria-hidden="true" className="h-5 w-5" />
          Daftar Hadir
        </h3>
        {data.peserta.length === 0 ? (
          <p className="mt-2 text-base text-muted-foreground">Daftar hadir tidak dicatat.</p>
        ) : (
          <div className="tabel-responsif mt-2 max-w-full overflow-x-auto">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b-2 border-border-field text-left">
                  <th className="py-2 pr-4">Nama</th>
                  <th className="py-2 pr-4">Jabatan</th>
                  <th className="py-2">Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {data.peserta.map((p) => (
                  <tr key={p.id} className="border-b border-border-hair">
                    <td className="py-2 pr-4">{p.nama}</td>
                    <td className="py-2 pr-4">{p.jabatan ?? "—"}</td>
                    <td className="py-2">
                      <LencanaKehadiran status={p.kehadiran} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-lg text-primary">
          <MessageSquareText aria-hidden="true" className="h-5 w-5" />
          Pembahasan
        </h3>
        <TeksKaya panel nilai={data.pembahasan} className="mt-3 text-foreground" />
      </section>

      {data.keputusan && (
        <section>
          <h3 className="flex items-center gap-2 text-lg text-primary">
            <ClipboardList aria-hidden="true" className="h-5 w-5" />
            Hasil / Keputusan Rapat
          </h3>
          <p className="prosa mt-2 whitespace-pre-wrap text-base text-foreground">
            {data.keputusan}
          </p>
        </section>
      )}

      <section>
        <h3 className="flex items-center gap-2 text-lg text-primary">
          <ListChecks aria-hidden="true" className="h-5 w-5" />
          Tindak Lanjut
        </h3>
        {data.tindak_lanjut.length === 0 ? (
          <p className="mt-2 text-base text-muted-foreground">Tidak ada tindak lanjut dicatat.</p>
        ) : (
          <div className="tabel-responsif mt-2 max-w-full overflow-x-auto">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b-2 border-border-field text-left">
                  <th className="py-2 pr-4">No.</th>
                  <th className="py-2 pr-4">Tugas</th>
                  <th className="py-2 pr-4">Penanggung jawab</th>
                  <th className="py-2 pr-4">Batas waktu</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.tindak_lanjut.map((t) => (
                  <tr key={t.id} className="border-b border-border-hair align-top">
                    <td className="py-2 pr-4">{t.urutan}</td>
                    <td className="py-2 pr-4">{t.tugas}</td>
                    <td className="py-2 pr-4">{t.pj_nama ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {t.deadline ? formatTanggal(t.deadline) : "—"}
                    </td>
                    <td className="py-2">
                      <LencanaTindakLanjut status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
