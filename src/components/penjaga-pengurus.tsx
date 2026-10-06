import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { KakiSitus, KopSitus } from "@/components/kop-situs";
import { Tombol } from "@/components/tombol";
import { supabase } from "@/integrations/supabase/client";
import { ambilSesiPengurus, type SesiPengurus } from "@/lib/pengurus.functions";

export function useSesiPengurus() {
  const ambil = useServerFn(ambilSesiPengurus);
  return useQuery({
    queryKey: ["sesi-pengurus"],
    queryFn: () => ambil({}),
    staleTime: 60_000,
  });
}



/**
 * Menampilkan isi halaman hanya bila akun terdaftar sebagai pengurus aktif.
 */
export function PenjagaPengurus({
  children,
}: {
  children: (sesi: SesiPengurus) => React.ReactNode;
}) {
  const { data, isPending, isError } = useSesiPengurus();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function keluar() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col">
        <KopSitus />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
          <p className="text-base text-muted-foreground">Sedang memeriksa akun Anda…</p>
        </main>
        <KakiSitus />
      </div>
    );
  }

  if (isError || !data?.terdaftar) {
    return (
      <div className="flex min-h-screen flex-col">
        <KopSitus />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
          <h1 className="text-2xl text-primary">Akun ini belum terdaftar sebagai pengurus</h1>
          <p className="prosa mt-4 text-base">
            Akun ini belum terdaftar sebagai pengurus. Hubungi Sekretaris Yayasan.
          </p>
          {data?.email && (
            <p className="prosa mt-3 text-base text-muted-foreground">
              Alamat email yang Anda pakai masuk: <strong>{data.email}</strong>
            </p>
          )}
          <div className="mt-8">
            <Tombol varian="sekunder" onClick={keluar}>
              Keluar dari akun
            </Tombol>
          </div>
        </main>
        <KakiSitus />
      </div>
    );
  }

  return <>{children(data)}</>;
}
