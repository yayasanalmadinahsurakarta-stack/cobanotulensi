import { createContext, useContext, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BellRing,
  FileText,
  Globe,
  Image as ImageIcon,
  LogOut,
  Menu as IkonMenu,
  ScrollText,
  Settings,
  Upload,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tombol } from "@/components/tombol";
import { TombolTampilan } from "@/components/tombol-tampilan";
import { LoncengNotifikasi } from "@/components/lonceng-notifikasi";
import type { SesiPengurus } from "@/lib/pengurus.functions";

const KonteksSesi = createContext<SesiPengurus | null>(null);

export function useSesiAktif(): SesiPengurus {
  const sesi = useContext(KonteksSesi);
  if (!sesi) throw new Error("Sesi pengurus belum tersedia");
  return sesi;
}

type Menu = { label: string; ke: string; approverSaja?: boolean; Ikon: typeof FileText };

const menu: Menu[] = [
  { label: "Notulensi", ke: "/admin", Ikon: FileText },
  { label: "Unggah", ke: "/admin/unggah", Ikon: Upload },
  { label: "Pengingat", ke: "/admin/pengingat", Ikon: BellRing },
  { label: "Analitik", ke: "/admin/analitik", Ikon: BarChart3 },
  { label: "Pengurus", ke: "/admin/pengurus", approverSaja: true, Ikon: Users },
  { label: "Log", ke: "/admin/log", approverSaja: true, Ikon: ScrollText },
  { label: "Identitas", ke: "/admin/identitas", approverSaja: true, Ikon: ImageIcon },
  { label: "Pengaturan", ke: "/admin/pengaturan", approverSaja: true, Ikon: Settings },
];

export function TataLetakPengurus({
  sesi,
  children,
}: {
  sesi: SesiPengurus;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bukaMenu, setBukaMenu] = useState(false);
  const approver = sesi.peran === "approver";
  const tampil = menu.filter((m) => approver || !m.approverSaja);

  async function keluar() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <KonteksSesi.Provider value={sesi}>
      <div className="flex min-h-screen flex-col">
        <header className="kaca sticky top-0 z-30 w-full max-w-full overflow-x-clip border-b border-border-hair print:hidden">
          <div className="mx-auto grid w-full min-w-0 max-w-[80rem] grid-cols-1 gap-3 px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:px-6 sm:py-4">
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex sm:flex-1">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary p-1.5 ring-1 ring-gold/40">
                <img
                  src="/logo-almadinah.png"
                  alt="Logo Yayasan Al Madinah Surakarta"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base font-semibold uppercase tracking-wide text-primary sm:text-lg">
                  Area Sekertaris
                </span>
                <span className="truncate text-xs text-muted-foreground sm:text-sm">
                  {sesi.nama_lengkap ?? sesi.email} — {approver ? "Approver" : "Editor"}
                </span>
              </span>
            </div>
            <div className="grid grid-cols-2 items-center gap-2 sm:ml-auto sm:flex sm:flex-wrap">
              <Link
                to="/"
                className="inline-flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground no-underline hover:bg-muted sm:px-4 sm:text-base"
              >
                <Globe aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                <span className="truncate">Portal umum</span>
              </Link>
              <TombolTampilan />
              <LoncengNotifikasi />
              <Tombol varian="sekunder" onClick={keluar}>
                <LogOut aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
                Keluar
              </Tombol>
              <Tombol
                varian="sekunder"
                className="lg:hidden"
                aria-expanded={bukaMenu}
                onClick={() => setBukaMenu((v) => !v)}
              >
                {bukaMenu ? (
                  <X aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
                ) : (
                  <IkonMenu aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
                )}
                {bukaMenu ? "Tutup" : "Menu"}
              </Tombol>
            </div>
          </div>
        </header>


        <div className="mx-auto flex w-full max-w-[80rem] flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
          <nav
            aria-label="Navigasi area sekertaris"
            className={`${bukaMenu ? "block" : "hidden"} lg:block lg:w-60 lg:shrink-0 print:hidden`}
          >
            <ul className="flex list-none flex-col gap-1 p-0">
              {tampil.map((m) => (
                <li key={m.ke}>
                  <Link
                    to={m.ke}
                    activeOptions={{ exact: m.ke === "/admin" }}
                    activeProps={{ className: "bg-primary text-primary-foreground" }}
                    onClick={() => setBukaMenu(false)}
                    className="inline-flex min-h-[2.75rem] w-full items-center gap-3 rounded-lg px-4 py-2 text-base font-semibold text-foreground no-underline hover:bg-muted"
                  >
                    <m.Ikon aria-hidden="true" className="h-5 w-5 shrink-0" />
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </KonteksSesi.Provider>
  );
}

export function JudulHalaman({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl break-words text-primary sm:text-3xl">{judul}</h1>
        {keterangan && <p className="prosa mt-2 text-muted-foreground">{keterangan}</p>}
      </div>
      {aksi && <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{aksi}</div>}
    </div>

  );
}
