import { TeksKaya } from "@/components/teks-kaya";
import kopAsset from "@/assets/kop-yayasan.png.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ambilSatuNotulensi } from "@/lib/notulensi-api";
import { formatRupiah, formatTanggal } from "@/lib/notulensi-types";
import { jenisDariNomor } from "@/lib/pesan-wa";
import { useIdentitas, useKop } from "@/hooks/use-identitas";

export const Route = createFileRoute("/cetak/$id")({
  head: () => ({
    meta: [
      { title: "Cetak Notulensi — Yayasan Al Madinah Surakarta" },
      {
        name: "description",
        content:
          "Tampilan dokumen resmi notulensi rapat Yayasan Al Madinah Surakarta, siap dicetak atau disimpan sebagai PDF.",
      },
      { property: "og:title", content: "Cetak Notulensi — Yayasan Al Madinah Surakarta" },
      {
        property: "og:description",
        content: "Tampilan dokumen resmi notulensi rapat, siap dicetak atau disimpan sebagai PDF.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HalamanCetak,
});

function HalamanCetak() {
  const { id } = Route.useParams();
  const identitas = useIdentitas();
  const kopKustom = useKop();
  const { data, isPending, isError } = useQuery({
    queryKey: ["notulensi-cetak", id],
    queryFn: () => ambilSatuNotulensi(id),
  });

  if (isPending) {
    return <p className="p-8 text-base text-muted-foreground">Sedang memuat notulensi…</p>;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl text-primary">Notulensi tidak ditemukan</h1>
        <p className="prosa mt-3 text-base">
          Notulensi ini tidak ada, sudah dihapus, atau hanya boleh dibaca pengurus yang sudah masuk.
        </p>
        <Link to="/" className="mt-5 inline-flex min-h-[2.75rem] items-center text-base font-semibold">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const waktu =
    data.waktu_mulai || data.waktu_selesai
      ? `${(data.waktu_mulai ?? "").slice(0, 5) || "—"} – ${(data.waktu_selesai ?? "").slice(0, 5) || "selesai"} WIB`
      : "—";

  return (
    <div className="lembar-cetak mx-auto max-w-3xl bg-card px-8 py-10 text-foreground">
      <div className="tanpa-cetak kaca mb-8 flex flex-wrap gap-3 rounded-xl p-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-[2.75rem] items-center rounded-lg bg-primary px-5 py-2.5 text-base font-semibold text-primary-foreground hover:bg-primary-pressed"
        >
          Cetak / simpan PDF
        </button>
        <Link
          to="/"
          className="inline-flex min-h-[2.75rem] items-center rounded-lg border-2 border-border-field px-5 py-2.5 text-base font-semibold text-primary no-underline hover:bg-muted"
        >
          Kembali
        </Link>
      </div>

      <header className="border-b-4 border-double border-primary pb-3">
        <img
          src={kopKustom ?? kopAsset.url}
          alt="Kop resmi yayasan"
          className="mx-auto w-full max-w-2xl object-contain"
        />
      </header>


      <div className="mt-6 text-center">
        <h1 className="text-2xl uppercase text-primary">
          Notulensi {jenisDariNomor(data.nomor).toLowerCase().replace(/^rapat/, "Rapat")}
        </h1>
        {data.nomor && <p className="mt-1 text-base">Nomor: {data.nomor}</p>}
      </div>

      <section className="mt-6">
        <h2 className="text-lg text-primary">Identitas Rapat</h2>
        <table className="mt-2 w-full border-collapse text-base">
          <tbody>
            {[
              ["Hari / tanggal", formatTanggal(data.tanggal)],
              ["Waktu", waktu],
              ["Tempat", data.tempat ?? "—"],
              ["Pemimpin rapat", data.pemimpin ?? "—"],
              ["Notulis", data.notulis ?? "—"],
              ["Tema rapat", data.tema],
              ...(data.anggaran !== null
                ? [["Anggaran", formatRupiah(data.anggaran)] as [string, string]]
                : []),
            ].map(([label, nilai]) => (
              <tr key={label} className="border-b border-border-hair">
                <th scope="row" className="w-56 py-2 pr-4 text-left align-top font-semibold">
                  {label}
                </th>
                <td className="py-2">{nilai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-lg text-primary">Daftar Hadir</h2>
        {data.peserta.length === 0 ? (
          <p className="mt-2 text-base">Daftar hadir tidak dicatat.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-base">
            <thead>
              <tr className="border-y-2 border-border-field text-left">
                <th className="w-12 py-2 pr-3">No.</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Jabatan</th>
                <th className="py-2">Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {data.peserta.map((p, i) => (
                <tr key={p.id} className="border-b border-border-hair">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3">{p.nama}</td>
                  <td className="py-2 pr-3">{p.jabatan ?? "—"}</td>
                  <td className="py-2">{p.kehadiran}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg text-primary">Pembahasan</h2>
        <TeksKaya panel nilai={data.pembahasan} className="mt-2" />
      </section>

      {data.keputusan && (
        <section className="mt-6">
          <h2 className="text-lg text-primary">Hasil / Keputusan Rapat</h2>
          <p className="mt-2 whitespace-pre-wrap text-base">{data.keputusan}</p>
        </section>
      )}

      {data.tindak_lanjut.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg text-primary">Tindak Lanjut</h2>
          <table className="mt-2 w-full border-collapse text-base">
            <thead>
              <tr className="border-y-2 border-border-field text-left">
                <th className="w-12 py-2 pr-3">No.</th>
                <th className="py-2 pr-3">Tugas</th>
                <th className="py-2 pr-3">Penanggung jawab</th>
                <th className="py-2 pr-3">Batas waktu</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tindak_lanjut.map((t, i) => (
                <tr key={t.id} className="border-b border-border-hair align-top">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3">{t.tugas}</td>
                  <td className="py-2 pr-3">{t.pj_nama ?? "—"}</td>
                  <td className="py-2 pr-3">{t.deadline ? formatTanggal(t.deadline) : "—"}</td>
                  <td className="py-2">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.hal_urgen && (
        <section className="mt-6 border-2 border-destructive p-4">
          <h2 className="text-lg text-destructive">Hal Mendesak</h2>
          <p className="mt-2 whitespace-pre-wrap text-base">{data.hal_urgen}</p>
        </section>
      )}

      <p className="mt-8 text-base">
        Demikian notulensi rapat ini dibuat dengan sebenarnya untuk menjadi catatan dan pedoman
        pelaksanaan bagi seluruh pihak yang berkepentingan.
      </p>

      <div className="mt-12 grid grid-cols-2 gap-8 text-base">
        <div className="text-center">
          <p>{identitas?.jabatanSekretaris ?? "Sekretaris"},</p>
          <div className="h-24" />
          <p className="font-semibold underline">{identitas?.namaSekretaris ?? "Arief Wijaya"}</p>
        </div>
        <div className="text-center">
          <p>{identitas?.jabatanKetua ?? "Ketua Yayasan"},</p>
          <div className="h-24" />
          <p className="font-semibold underline">{identitas?.namaKetua ?? "Ustadz Jauhari, Lc."}</p>
        </div>
      </div>

    </div>
  );
}
