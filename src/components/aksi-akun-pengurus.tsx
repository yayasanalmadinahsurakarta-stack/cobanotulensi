import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tombol } from "@/components/tombol";
import { buatAkunPengurus, gantiSandiPengurus, hapusAkunPengurus } from "@/lib/akun.functions";
import type { Pengurus } from "@/lib/notulensi-types";

/** Tombol kelola akun masuk untuk satu pengurus: buat, ganti sandi, hapus. */
export function AksiAkunPengurus({ p }: { p: Pengurus }) {
  const qc = useQueryClient();
  const buat = useServerFn(buatAkunPengurus);
  const ganti = useServerFn(gantiSandiPengurus);
  const hapus = useServerFn(hapusAkunPengurus);
  const selesai = (pesan: string) => {
    toast.success(pesan);
    qc.invalidateQueries({ queryKey: ["daftar-pengurus"] });
  };
  const m = useMutation({
    mutationFn: async (jenis: "buat" | "ganti" | "hapus") => {
      if (jenis === "hapus") {
        await hapus({ data: { pengurusId: p.id } });
        return "Akun masuk dihapus";
      }
      const sandi = window.prompt(
        jenis === "buat" ? `Kata sandi untuk ${p.nama_lengkap} (min. 6 karakter):` : `Kata sandi baru untuk ${p.nama_lengkap}:`,
      );
      if (!sandi) return null;
      if (jenis === "buat") {
        await buat({ data: { pengurusId: p.id, sandi } });
        return "Akun masuk dibuat";
      }
      await ganti({ data: { pengurusId: p.id, sandi } });
      return "Kata sandi diganti";
    },
    onSuccess: (pesan) => pesan && selesai(pesan),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!p.user_id) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Belum ada akun</span>
        <Tombol varian="sekunder" disabled={m.isPending || !p.username} onClick={() => m.mutate("buat")}>
          Buat akun
        </Tombol>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-status-ok-fg">Punya akun</span>
      <Tombol varian="sekunder" disabled={m.isPending} onClick={() => m.mutate("ganti")}>
        Ganti sandi
      </Tombol>
      <Tombol
        varian="bahaya"
        disabled={m.isPending}
        onClick={() => window.confirm(`Hapus akun masuk ${p.nama_lengkap}? Data pengurus tetap tersimpan.`) && m.mutate("hapus")}
      >
        Hapus akun
      </Tombol>
    </div>
  );
}
