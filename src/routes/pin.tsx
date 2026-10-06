import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { KakiSitus, KopSitus } from "@/components/kop-situs";
import { Tombol } from "@/components/tombol";
import { TombolPasang } from "@/components/tombol-pasang";
import { supabase } from "@/integrations/supabase/client";
import { bukaGerbang, bukaGerbangPengurus } from "@/lib/gate.functions";
import gambarBagikan from "@/assets/notulensi-almadinah.png.asset.json";

const JUDUL = "Masuk Portal Notulensi — Yayasan Al Madinah Surakarta";
const PENJELAS =
  "Portal resmi arsip notulensi rapat Yayasan Al Madinah Surakarta. Masuk dengan nama pengguna dan kata sandi pengurus.";
const ALAMAT_SITUS = "https://notulensirapatyam.lovable.app";
const GAMBAR_BAGIKAN = `${ALAMAT_SITUS}${gambarBagikan.url}`;

/** Nama pengguna sederhana diubah menjadi alamat masuk yang tetap. */
export function alamatMasuk(namaPengguna: string): string {
  const t = namaPengguna.trim().toLowerCase();
  return t.includes("@") ? t : `${t}@almadinah.local`;
}

export const Route = createFileRoute("/pin")({
  validateSearch: (search: Record<string, unknown>) => ({
    lanjut: typeof search["lanjut"] === "string" ? (search["lanjut"] as string) : undefined,
  }),
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
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HalamanMasukPortal,
});

function HalamanMasukPortal() {
  const { lanjut } = Route.useSearch();
  const bukaPin = useServerFn(bukaGerbang);
  const bukaPengurus = useServerFn(bukaGerbangPengurus);

  const [nama, setNama] = useState("");
  const [sandi, setSandi] = useState("");
  const [pin, setPin] = useState("");
  const [pakaiPin, setPakaiPin] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  function lanjutkan() {
    const tujuan = lanjut && lanjut.startsWith("/") && !lanjut.startsWith("//") ? lanjut : "/";
    window.location.replace(tujuan);
  }

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setPesan(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: alamatMasuk(nama),
      password: sandi,
    });
    if (error || !data.session) {
      setProses(false);
      setPesan("Nama pengguna atau kata sandi belum cocok. Silakan coba lagi.");
      return;
    }
    const hasil = await bukaPengurus({});
    setProses(false);
    if (!hasil.ok) {
      setPesan("Akun ini belum terdaftar sebagai pengurus aktif. Hubungi sekretaris yayasan.");
      return;
    }
    lanjutkan();
  }

  async function masukPin(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setPesan(null);
    const hasil = await bukaPin({ data: { pin } });
    setProses(false);
    if (!hasil.ok) {
      setPesan("PIN belum cocok. Silakan periksa kembali lalu coba lagi.");
      return;
    }
    lanjutkan();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <KopSitus />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
        <div className="muncul">
          <h1 className="text-2xl text-primary">Masuk ke Portal Notulensi</h1>
          <p className="prosa mt-3 text-muted-foreground">
            Silakan masuk memakai nama pengguna dan kata sandi yang diberikan sekretaris yayasan.
            Sekali masuk, Anda tidak perlu mengulang login di perangkat yang sama.
          </p>
        </div>

        {!pakaiPin ? (
          <form onSubmit={masuk} className="muncul jeda-2 mt-8 grid gap-5">
            <div>
              <label htmlFor="nama" className="block text-base font-semibold">
                Nama pengguna
              </label>
              <input
                id="nama"
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Misalnya: arief"
                className="mt-2 block min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-card px-4 py-2.5 text-base"
              />
            </div>
            <div>
              <label htmlFor="sandi" className="block text-base font-semibold">
                Kata sandi
              </label>
              <input
                id="sandi"
                type="password"
                required
                autoComplete="current-password"
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                className="mt-2 block min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-card px-4 py-2.5 text-base"
              />
            </div>

            {pesan && (
              <p className="muncul-lembut rounded-lg bg-status-danger-bg p-4 text-base text-status-danger-fg">
                {pesan}
              </p>
            )}

            <Tombol type="submit" disabled={proses}>
              <LogIn aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
              {proses ? "Sedang memeriksa…" : "Masuk"}
            </Tombol>
          </form>
        ) : (
          <form onSubmit={masukPin} className="muncul jeda-2 mt-8 grid gap-5">
            <div>
              <label htmlFor="pin" className="block text-base font-semibold">
                PIN portal
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-2 block min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-card px-4 py-2.5 text-lg tracking-[0.4em]"
              />
            </div>

            {pesan && (
              <p className="muncul-lembut rounded-lg bg-status-danger-bg p-4 text-base text-status-danger-fg">
                {pesan}
              </p>
            )}

            <Tombol type="submit" disabled={proses}>
              {proses ? "Sedang memeriksa…" : "Buka arsip notulensi"}
            </Tombol>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setPesan(null);
            setPakaiPin((v) => !v);
          }}
          className="mt-6 inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg px-2 text-base font-semibold text-primary hover:bg-muted"
        >
          <KeyRound aria-hidden="true" className="h-5 w-5" />
          {pakaiPin ? "Masuk dengan nama pengguna" : "Masuk dengan PIN portal"}
        </button>

        <div className="mt-8">
          <TombolPasang />
        </div>
      </main>
      <KakiSitus />
    </div>
  );
}
