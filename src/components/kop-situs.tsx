import { Link } from "@tanstack/react-router";
import { TombolTampilan } from "@/components/tombol-tampilan";
import { useIdentitas } from "@/hooks/use-identitas";
import { AkunPortal } from "@/components/akun-portal";

export function KopSitus() {
  const identitas = useIdentitas();
  const logo = identitas?.logo ?? "/logo-almadinah.png";
  const nama = identitas?.namaYayasan ?? "Yayasan Al Madinah Surakarta";
  return (
    <header className="sticky top-0 z-30 w-full max-w-full overflow-x-clip kaca border-b border-border-hair">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-1 gap-3 px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:px-6">

        <Link
          to="/"
          className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 no-underline sm:flex sm:flex-1"
          aria-label="Beranda portal notulensi"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary p-1.5 ring-1 ring-gold/40">
            <img
              src={logo}
              alt={`Logo ${nama}`}
              width={36}
              height={36}
              className="h-8 w-8 object-contain"
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-base font-semibold leading-snug text-primary sm:truncate sm:text-lg">
              {nama}
            </span>
            <span className="truncate text-xs text-muted-foreground sm:text-sm">
              Sistem Manajemen Notulensi
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center justify-between gap-2 sm:order-none sm:justify-self-auto">
          <TombolTampilan />
          <AkunPortal />
        </div>

        <nav
          className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto"
          aria-label="Navigasi utama"
        >
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-muted text-primary" }}
            className="inline-flex min-h-[2.75rem] min-w-0 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-semibold leading-snug text-foreground no-underline hover:bg-muted sm:shrink-0 sm:px-4 sm:text-base"
          >
            Notulensi Umum
          </Link>
          <Link
            to="/admin"
            activeProps={{ className: "bg-muted text-primary" }}
            className="inline-flex min-h-[2.75rem] min-w-0 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-semibold leading-snug text-foreground no-underline hover:bg-muted sm:shrink-0 sm:px-4 sm:text-base"
          >
            Area Sekertaris
          </Link>
        </nav>
      </div>
    </header>

  );
}

export function KakiSitus() {
  return (
    <footer className="mt-16 border-t border-border-hair bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p className="prosa">
          Portal ini memuat notulensi rapat yang telah disetujui dan ditetapkan boleh dibaca umum.
          Notulensi internal hanya dapat dibuka oleh pengurus yang masuk ke Area Sekertaris.
        </p>
        <p className="mt-3">© {new Date().getFullYear()} Yayasan Al Madinah Surakarta</p>
      </div>
    </footer>
  );
}
