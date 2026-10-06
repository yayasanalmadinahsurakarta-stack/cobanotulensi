import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ambilIdentitas, ambilKop } from "@/lib/identitas.functions";

/** Nama pengurus penanda tangan, nama yayasan, dan logo yang sedang dipakai. */
export function useIdentitas() {
  const baca = useServerFn(ambilIdentitas);
  const { data } = useQuery({
    queryKey: ["identitas"],
    queryFn: () => baca({}),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? null;
}

/** Gambar kop resmi untuk halaman cetak. */
export function useKop() {
  const baca = useServerFn(ambilKop);
  const { data } = useQuery({
    queryKey: ["identitas-kop"],
    queryFn: () => baca({}),
    staleTime: 5 * 60 * 1000,
  });
  return data?.kop ?? null;
}
