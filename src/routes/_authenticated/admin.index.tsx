import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  FilePlus2,
  FileText,
  Globe,
  ListChecks,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { JudulHalaman } from "@/components/tata-letak-pengurus";
import { LencanaPublikasi } from "@/components/lencana-status";
import { TautanTombol, Tombol } from "@/components/tombol";
import { ambilNotulensiTerhapus, ambilSemuaNotulensi, pulihkanNotulensi } from "@/lib/notulensi-api";
import { ambilNotulensiSudahDibaca } from "@/lib/notifikasi-api";
import { useSesiAktif } from "@/components/tata-letak-pengurus";
import {
  formatTanggal,
  formatWaktuLengkap,
  jumlahLewatTenggat,
  progresTindakLanjut,
  type Notulensi,
} from "@/lib/notulensi-types";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DaftarNotulensi,
});

function KartuAngka({
  label,
  nilai,
  merah,
  Ikon,
}: {
  label: string;
  nilai: string | number;
  merah?: boolean;
  Ikon: typeof CalendarDays;
}) {
  return (
    <div className="angkat rounded-xl border border-border-hair bg-card p-4">
      <div className="flex items-center gap-2">
        <Ikon
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 ${merah ? "text-destructive" : "text-primary"}`}
        />
        <p className="min-w-0 text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-1 text-2xl font-semibold ${merah ? "text-destructive" : "text-primary"}`}>
        {nilai}
      </p>
    </div>
  );
}

function DaftarNotulensi() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["notulensi-semua"],
    queryFn: ambilSemuaNotulensi,
  });
  const semua = useMemo(() => data ?? [], [data]);
  const { data: sudahDibaca } = useQuery({
    queryKey: ["bacaan-notulensi"],
    queryFn: ambilNotulensiSudahDibaca,
  });

  const [kataKunci, setKataKunci] = useState("");
  const [status, setStatus] = useState("semua");
  const [visibilitas, setVisibilitas] = useState("semua");
  const [tahun, setTahun] = useState("semua");
  const [pj, setPj] = useState("semua");

  const daftarTahun = useMemo(
    () => [...new Set(semua.map((n) => n.tanggal.slice(0, 4)))].sort().reverse(),
    [semua],
  );
  const daftarPj = useMemo(
    () =>
      [
        ...new Set(
          semua.flatMap((n) => n.tindak_lanjut.map((t) => t.pj_nama).filter(Boolean) as string[]),
        ),
      ].sort(),
    [semua],
  );

  const hasil = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    return semua.filter((n) => {
      if (status !== "semua" && n.status_publikasi !== status) return false;
      if (visibilitas !== "semua" && n.visibilitas !== visibilitas) return false;
      if (tahun !== "semua" && !n.tanggal.startsWith(tahun)) return false;
      if (pj !== "semua" && !n.tindak_lanjut.some((t) => t.pj_nama === pj)) return false;
      if (!q) return true;
      return (
        n.tema.toLowerCase().includes(q) ||
        (n.nomor ?? "").toLowerCase().includes(q) ||
        n.pembahasan.toLowerCase().includes(q)
      );
    });
  }, [semua, kataKunci, status, visibilitas, tahun, pj]);

  const statistik = useMemo(() => {
    const tl = semua.flatMap((n) => n.tindak_lanjut);
    return {
      total: semua.length,
      draft: semua.filter((n) => n.status_publikasi === "draft").length,
      terbit: semua.filter((n) => n.status_publikasi === "terbit").length,
      progres: progresTindakLanjut(tl),
      lewat: jumlahLewatTenggat(tl),
    };
  }, [semua]);

  return (
    <>
      <JudulHalaman
        judul="Notulensi"
        keterangan="Semua notulensi rapat, termasuk draf dan catatan internal."
        aksi={
          <TautanTombol to="/admin/notulensi/$id" params={{ id: "baru" }}>
            <FilePlus2 aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
            Buat notulensi baru
          </TautanTombol>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KartuAngka label="Total rapat" nilai={statistik.total} Ikon={CalendarDays} />
        <KartuAngka label="Draf" nilai={statistik.draft} Ikon={FileText} />
        <KartuAngka label="Terbit" nilai={statistik.terbit} Ikon={CheckCircle2} />
        <KartuAngka
          label="Tindak lanjut selesai"
          nilai={`${statistik.progres.selesai}/${statistik.progres.total}`}
          Ikon={ListChecks}
        />
        <KartuAngka
          label="Lewat tenggat"
          nilai={statistik.lewat}
          merah={statistik.lewat > 0}
          Ikon={AlarmClock}
        />
      </div>

      <div className="mt-8 rounded-xl border border-border-hair bg-card p-4">
        <label htmlFor="cari" className="flex items-center gap-2 text-base font-semibold">
          <Search aria-hidden="true" className="h-5 w-5 text-primary" />
          Cari tema, nomor, atau isi pembahasan
        </label>
        <input
          id="cari"
          type="search"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-4 py-2 text-base"
          placeholder="Misalnya: anggaran pembangunan"
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Saring
            label="Status publikasi"
            nilai={status}
            ubah={setStatus}
            pilihan={[
              ["semua", "Semua status"],
              ["draft", "Draf"],
              ["terbit", "Terbit"],
            ]}
          />
          <Saring
            label="Visibilitas"
            nilai={visibilitas}
            ubah={setVisibilitas}
            pilihan={[
              ["semua", "Semua"],
              ["internal", "Internal pengurus"],
              ["publik", "Boleh dibaca umum"],
            ]}
          />
          <Saring
            label="Tahun"
            nilai={tahun}
            ubah={setTahun}
            pilihan={[["semua", "Semua tahun"], ...daftarTahun.map((t) => [t, t] as [string, string])]}
          />
          <Saring
            label="Penanggung jawab"
            nilai={pj}
            ubah={setPj}
            pilihan={[["semua", "Semua penanggung jawab"], ...daftarPj.map((p) => [p, p] as [string, string])]}
          />
        </div>
      </div>

      {isPending && <p className="mt-8 text-base text-muted-foreground">Sedang memuat data…</p>}
      {isError && (
        <p className="mt-8 rounded-xl bg-status-danger-bg p-5 text-base text-status-danger-fg">
          Data gagal dimuat. Coba muat ulang halaman.
        </p>
      )}

      <ul className="mt-6 flex list-none flex-col gap-4 p-0">
        {hasil.map((n) => (
          <li key={n.id}>
            <KartuNotulensi n={n} baru={sudahDibaca ? !sudahDibaca.has(n.id) : false} />
          </li>
        ))}
      </ul>

      {!isPending && !isError && hasil.length === 0 && (
        <p className="mt-6 rounded-xl border border-border-field bg-card p-5 text-base">
          Tidak ada notulensi yang cocok dengan pencarian ini.
        </p>
      )}

      <TempatSampah />
    </>
  );
}

function Saring({
  label,
  nilai,
  ubah,
  pilihan,
}: {
  label: string;
  nilai: string;
  ubah: (v: string) => void;
  pilihan: [string, string][];
}) {
  return (
    <label className="block text-base font-semibold">
      {label}
      <select
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base font-normal"
      >
        {pilihan.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

function KartuNotulensi({ n, baru }: { n: Notulensi; baru: boolean }) {
  const progres = progresTindakLanjut(n.tindak_lanjut);
  const lewat = jumlahLewatTenggat(n.tindak_lanjut);
  return (
    <article className="angkat rounded-xl border border-border-hair bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        {baru && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1 text-sm font-bold text-primary">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Belum dibaca
          </span>
        )}
        <LencanaPublikasi status={n.status_publikasi} />
        {n.visibilitas === "publik" && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-status-ok-bg px-3 py-1 text-sm font-semibold text-status-ok-fg">
            <Globe aria-hidden="true" className="h-4 w-4" />
            Publik
          </span>
        )}
        {lewat > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-status-danger-bg px-3 py-1 text-sm font-semibold text-status-danger-fg">
            <AlarmClock aria-hidden="true" className="h-4 w-4" />
            {lewat} lewat tenggat
          </span>
        )}
      </div>
      <p className="nomor-notulen mt-3 text-sm text-muted-foreground">
        {n.nomor ?? "Belum bernomor"}
      </p>
      <h2 className="mt-1 text-xl text-primary">
        <Link
          to="/admin/notulensi/$id"
          params={{ id: n.id }}
          className="text-primary no-underline hover:underline"
        >
          {n.tema}
        </Link>
      </h2>
      <p className="mt-1 flex items-center gap-2 text-base text-muted-foreground">
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
        {formatTanggal(n.tanggal)}
      </p>
      <p className="mt-2 flex items-center gap-2 text-base">
        <ListChecks aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
        Tindak lanjut selesai: {progres.selesai}/{progres.total}
      </p>
      {n.catatan_penolakan && (
        <p className="mt-3 rounded-lg bg-status-danger-bg p-3 text-base text-status-danger-fg">
          Catatan penolakan: {n.catatan_penolakan}
        </p>
      )}
    </article>
  );
}

/** Notulensi yang dihapus tidak dibuang permanen; approver dapat memulihkannya. */
function TempatSampah() {
  const sesi = useSesiAktif();
  const queryClient = useQueryClient();
  const approver = sesi.peran === "approver";

  const { data: terhapus } = useQuery({
    queryKey: ["notulensi-terhapus"],
    queryFn: ambilNotulensiTerhapus,
    enabled: approver,
  });

  const pulihkan = useMutation({
    mutationFn: pulihkanNotulensi,
    onSuccess: () => {
      toast.success("Notulensi dipulihkan");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!approver || (terhapus ?? []).length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-2xl text-primary">
        <Trash2 aria-hidden="true" className="h-6 w-6" />
        Tempat Sampah
      </h2>
      <p className="prosa mt-2 text-muted-foreground">
        Notulensi yang dihapus masih tersimpan di sini dan dapat dipulihkan kapan saja.
      </p>
      <ul className="mt-4 flex list-none flex-col gap-3 p-0">
        {(terhapus ?? []).map((n) => (
          <li
            key={n.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-border-hair bg-card p-5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-primary">{n.tema}</p>
              <p className="text-base text-muted-foreground">
                {formatTanggal(n.tanggal)} · dihapus {formatWaktuLengkap(n.dihapus_pada)}
              </p>
            </div>
            <Tombol
              varian="sekunder"
              onClick={() => pulihkan.mutate(n.id)}
              disabled={pulihkan.isPending}
            >
              <RotateCcw aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
              Pulihkan
            </Tombol>
          </li>
        ))}
      </ul>
    </section>
  );
}
