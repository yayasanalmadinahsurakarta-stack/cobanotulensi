import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { JudulHalaman, useSesiAktif } from "@/components/tata-letak-pengurus";
import { ambilLogAudit } from "@/lib/notulensi-api";
import { formatWaktuLengkap } from "@/lib/notulensi-types";

export const Route = createFileRoute("/_authenticated/admin/log")({
  component: HalamanLog,
});

function HalamanLog() {
  const sesi = useSesiAktif();
  const { data, isPending } = useQuery({
    queryKey: ["log-audit"],
    queryFn: ambilLogAudit,
    enabled: sesi.peran === "approver",
  });

  if (sesi.peran !== "approver") {
    return (
      <p className="rounded-xl bg-status-danger-bg p-5 text-base text-status-danger-fg">
        Halaman ini hanya untuk approver.
      </p>
    );
  }

  return (
    <>
      <JudulHalaman
        judul="Log Kegiatan"
        keterangan="Catatan 200 tindakan terakhir yang dilakukan pengurus di sistem ini."
      />
      {isPending ? (
        <p className="text-base text-muted-foreground">Sedang memuat data…</p>
      ) : (
        <div className="tabel-gulir rounded-xl border border-border-hair bg-card">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border-hair">
                {["Waktu", "Oleh", "Aksi", "Objek", "Keterangan"].map((h) => (
                  <th key={h} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((l) => (
                <tr key={l.id} className="border-b border-border-hair last:border-b-0">
                  <td className="px-4 py-3 align-top text-base">{formatWaktuLengkap(l.waktu)}</td>
                  <td className="px-4 py-3 align-top text-base">{l.email}</td>
                  <td className="px-4 py-3 align-top text-base">{l.aksi}</td>
                  <td className="px-4 py-3 align-top text-base">{l.entitas}</td>
                  <td className="px-4 py-3 align-top text-base">{l.ringkasan ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isPending && (data ?? []).length === 0 && (
        <p className="mt-6 rounded-xl border border-border-field bg-card p-5 text-base">
          Belum ada kegiatan yang tercatat.
        </p>
      )}
    </>
  );
}
