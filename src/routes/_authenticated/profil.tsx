import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, KeyRound, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KakiSitus, KopSitus } from "@/components/kop-situs";
import { Tombol } from "@/components/tombol";
import { supabase } from "@/integrations/supabase/client";
import { simpanProfilPribadi, type ProfilPribadi } from "@/lib/profil.functions";

const JUDUL = "Profil Saya — Portal Notulensi Al Madinah";
const PENJELAS = "Ubah profil dan kata sandi akun pengurus Yayasan Al Madinah Surakarta.";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: JUDUL },
      { name: "description", content: PENJELAS },
      { property: "og:title", content: JUDUL },
      { property: "og:description", content: PENJELAS },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HalamanProfil,
});

function HalamanProfil() {
  const simpanFn = useServerFn(simpanProfilPribadi);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [noWa, setNoWa] = useState("");
  const [sandiLama, setSandiLama] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [profil, setProfil] = useState<ProfilPribadi | null>(null);
  const [gagalProfil, setGagalProfil] = useState(false);

  useEffect(() => {
    let aktif = true;
    async function muatProfil() {
      const { data: sesi } = await supabase.auth.getSession();
      const userId = sesi.session?.user.id;
      if (!userId) {
        if (aktif) setGagalProfil(true);
        return;
      }
      const { data, error } = await supabase
        .from("pengurus")
        .select("nama_lengkap, jabatan, no_wa, email, username")
        .eq("user_id", userId)
        .eq("aktif", true)
        .maybeSingle();
      if (!aktif) return;
      if (error || !data) {
        setGagalProfil(true);
        return;
      }
      setProfil(data);
      setNama(data.nama_lengkap);
      setEmail(data.email);
      setNoWa(data.no_wa ?? "");
    }
    void muatProfil();
    return () => { aktif = false; };
  }, []);

  const simpan = useMutation({
    mutationFn: () => simpanFn({ data: { nama, email, noWa } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profil-pribadi"] });
      toast.success("Profil berhasil disimpan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gantiSandi = useMutation({
    mutationFn: async () => {
      if (sandiBaru.length < 6) throw new Error("Kata sandi baru minimal 6 karakter.");
      const { error } = await supabase.auth.updateUser({
        password: sandiBaru,
        current_password: sandiLama,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setSandiLama("");
      setSandiBaru("");
      toast.success("Kata sandi berhasil diganti");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function keluar() {
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/pin", search: { lanjut: undefined }, replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <KopSitus />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-base font-semibold text-primary no-underline hover:underline">
          <ArrowLeft aria-hidden="true" className="h-5 w-5" /> Kembali ke beranda
        </Link>
        <h1 className="mt-6 flex items-center gap-3 text-2xl text-primary sm:text-3xl">
          <UserRound aria-hidden="true" className="h-7 w-7" /> Profil Saya
        </h1>

        {!profil && !gagalProfil && <p className="mt-6 text-muted-foreground">Sedang memuat profil…</p>}
        {gagalProfil && <p className="mt-6 rounded-lg bg-status-danger-bg p-4 text-status-danger-fg">Profil gagal dimuat.</p>}
        {profil && <>
            <form onSubmit={(e) => { e.preventDefault(); simpan.mutate(); }} className="mt-6 grid gap-4 rounded-xl border border-border-hair bg-card p-5 sm:grid-cols-2">
              <Isian label="Nama lengkap" nilai={nama} ubah={setNama} wajib />
              <Isian label="Jabatan" nilai={profil.jabatan ?? "—"} ubah={() => {}} nonaktif />
              <Isian label="Nomor WhatsApp" nilai={noWa} ubah={setNoWa} tipe="tel" />
              <Isian label="Email kontak" nilai={email} ubah={setEmail} tipe="email" />
              <Isian label="Nama pengguna" nilai={profil.username ?? "—"} ubah={() => {}} nonaktif />
              <div className="flex items-end">
                <Tombol type="submit" disabled={simpan.isPending} className="w-full">
                  <Save aria-hidden="true" className="h-5 w-5" /> {simpan.isPending ? "Menyimpan…" : "Simpan profil"}
                </Tombol>
              </div>
            </form>

            <form onSubmit={(e) => { e.preventDefault(); gantiSandi.mutate(); }} className="mt-6 grid gap-4 rounded-xl border border-border-hair bg-card p-5 sm:grid-cols-2">
              <h2 className="flex items-center gap-2 text-xl text-primary sm:col-span-2"><KeyRound aria-hidden="true" className="h-5 w-5" /> Ganti kata sandi</h2>
              <Isian label="Kata sandi saat ini" nilai={sandiLama} ubah={setSandiLama} tipe="password" wajib />
              <Isian label="Kata sandi baru" nilai={sandiBaru} ubah={setSandiBaru} tipe="password" wajib />
              <Tombol type="submit" disabled={gantiSandi.isPending} className="sm:col-span-2">{gantiSandi.isPending ? "Mengganti…" : "Ganti kata sandi"}</Tombol>
            </form>
          </>}

        <Tombol type="button" varian="bahaya" onClick={keluar} className="mt-6 w-full sm:w-auto">Keluar dari akun</Tombol>
      </main>
      <KakiSitus />
    </div>
  );
}

function Isian({ label, nilai, ubah, tipe = "text", wajib, nonaktif }: { label: string; nilai: string; ubah: (nilai: string) => void; tipe?: string; wajib?: boolean; nonaktif?: boolean }) {
  return (
    <label className="block text-base font-semibold">
      {label}
      <input type={tipe} required={wajib} disabled={nonaktif} value={nilai} onChange={(e) => ubah(e.target.value)} className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-4 py-2 text-base font-normal disabled:bg-muted disabled:text-muted-foreground" />
    </label>
  );
}