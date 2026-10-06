import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KakiSitus, KopSitus } from "@/components/kop-situs";
import { Tombol } from "@/components/tombol";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk Area Sekertaris — Yayasan Al Madinah Surakarta" },
      {
        name: "description",
        content:
          "Halaman masuk bagi pengurus Yayasan Al Madinah Surakarta untuk mengelola notulensi rapat.",
      },
      { property: "og:title", content: "Masuk Area Sekertaris — Yayasan Al Madinah Surakarta" },
      {
        property: "og:description",
        content: "Halaman masuk bagi pengurus yayasan untuk mengelola notulensi rapat.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HalamanMasuk,
});

function HalamanMasuk() {
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);
  const [sedangProses, setSedangProses] = useState(false);

  async function masukEmail(e: React.FormEvent) {
    e.preventDefault();
    setSedangProses(true);
    setPesan(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: kataSandi,
    });
    if (error || !data.session) {
      setSedangProses(false);
      setPesan("Email atau kata sandi belum cocok. Silakan periksa kembali lalu coba lagi.");
      return;
    }
    // Muat ulang penuh agar sesi benar-benar siap sebelum Area Sekertaris dibuka.
    window.location.replace("/admin");
  }

  async function masukGoogle() {
    setPesan(null);
    const hasil = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (hasil.error) {
      setPesan("Masuk dengan akun Google belum berhasil. Silakan coba sekali lagi.");
      return;
    }
    if (hasil.redirected) return;
    window.location.replace("/admin");
  }


  return (
    <div className="flex min-h-screen flex-col">
      <KopSitus />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-2xl text-primary">Masuk ke Area Sekertaris</h1>
        <p className="prosa mt-3 text-muted-foreground">
          Area ini hanya untuk pengurus yayasan. Notulensi internal dan draf hanya terlihat setelah
          Anda masuk.
        </p>

        <form onSubmit={masukEmail} className="mt-8 grid gap-5">
          <div>
            <label htmlFor="email" className="block text-base font-semibold">
              Alamat email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={kataSandi}
              onChange={(e) => setKataSandi(e.target.value)}
              className="mt-2 block min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-card px-4 py-2.5 text-base"
            />
          </div>

          {pesan && (
            <p className="rounded-lg bg-status-danger-bg p-4 text-base text-status-danger-fg">
              {pesan}
            </p>
          )}

          <Tombol type="submit" disabled={sedangProses}>
            {sedangProses ? "Sedang memeriksa…" : "Masuk ke Area Sekertaris"}
          </Tombol>
        </form>

        <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border-hair" />
          atau
          <span className="h-px flex-1 bg-border-hair" />
        </div>

        <Tombol varian="sekunder" className="w-full" onClick={masukGoogle}>
          Masuk dengan akun Google
        </Tombol>

        <p className="prosa mt-8 text-sm text-muted-foreground">
          Belum punya akses? Hubungi sekretaris yayasan agar email Anda didaftarkan sebagai
          pengurus.
        </p>
      </main>
      <KakiSitus />
    </div>
  );
}
