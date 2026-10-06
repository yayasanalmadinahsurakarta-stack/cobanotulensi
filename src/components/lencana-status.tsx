import { cn } from "@/lib/utils";
import type {
  StatusPublikasi,
  StatusTindakLanjut,
  KehadiranPeserta,
  VisibilitasNotulensi,
} from "@/lib/notulensi-types";

const dasar =
  "inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold";

function Lencana({ className, teks }: { className: string; teks: string }) {
  // Selalu memuat tulisan, tidak pernah warna saja.
  return <span className={cn(dasar, className)}>{teks}</span>;
}

const publikasi: Record<StatusPublikasi, { teks: string; kelas: string }> = {
  draft: { teks: "Draf", kelas: "bg-muted text-muted-foreground" },
  menunggu: { teks: "Menunggu persetujuan", kelas: "bg-status-warn-bg text-status-warn-fg" },
  terbit: { teks: "Terbit", kelas: "bg-status-ok-bg text-status-ok-fg" },
};

const tindakLanjut: Record<StatusTindakLanjut, string> = {
  "Belum dibahas": "bg-status-danger-bg text-status-danger-fg",
  "Butuh Tindak Lanjut": "bg-status-warn-bg text-status-warn-fg",
  "Sudah dibahas": "bg-status-ok-bg text-status-ok-fg",
};

const kehadiran: Record<KehadiranPeserta, string> = {
  Hadir: "bg-status-ok-bg text-status-ok-fg",
  Izin: "bg-status-warn-bg text-status-warn-fg",
  "Tidak Hadir": "bg-status-danger-bg text-status-danger-fg",
};

export function LencanaPublikasi({ status }: { status: StatusPublikasi }) {
  return <Lencana teks={publikasi[status].teks} className={publikasi[status].kelas} />;
}

export function LencanaTindakLanjut({ status }: { status: StatusTindakLanjut }) {
  return <Lencana teks={status} className={tindakLanjut[status]} />;
}

export function LencanaKehadiran({ status }: { status: KehadiranPeserta }) {
  return <Lencana teks={status} className={kehadiran[status]} />;
}

export function LencanaVisibilitas({ visibilitas }: { visibilitas: VisibilitasNotulensi }) {
  return (
    <Lencana
      teks={visibilitas === "publik" ? "Boleh dibaca umum" : "Internal pengurus"}
      className={
        visibilitas === "publik"
          ? "bg-status-ok-bg text-status-ok-fg"
          : "bg-status-danger-bg text-status-danger-fg"
      }
    />
  );
}
