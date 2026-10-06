import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Tombol } from "@/components/tombol";
import { siapkanAkunPengurus, type HasilAkun } from "@/lib/akun.functions";

const KETERANGAN: Record<HasilAkun["status"], string> = {
  baru: "Akun baru dibuat",
  "sandi-diperbarui": "Kata sandi disetel ulang",
  "sudah-ada": "Akun sudah ada",
  "tanpa-username": "Belum punya nama pengguna",
  gagal: "Gagal",
};

/** Membuat akun masuk untuk seluruh pengurus aktif sekaligus (approver saja). */
export function PanelAkunPengurus() {
  const siapkan = useServerFn(siapkanAkunPengurus);
  const [hasil, setHasil] = useState<HasilAkun[]>([]);
  const [sandiAwal, setSandiAwal] = useState<string | null>(null);

  const jalan = useMutation({
    mutationFn: (setelUlangSandi: boolean) => siapkan({ data: { setelUlangSandi } }),
    onSuccess: (d) => {
      setHasil(d.hasil);
      setSandiAwal(d.sandiAwal);
      toast.success("Daftar akun pengurus diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mb-8 rounded-xl border border-border-hair bg-card p-5">
      <h2 className="flex items-center gap-2 text-xl text-primary">
        <KeyRound aria-hidden="true" className="h-5 w-5" />
        Akun masuk pengurus
      </h2>
      <p className="mt-2 text-base text-muted-foreground">
        Setiap pengurus aktif yang punya nama pengguna akan mendapat akun masuk. Mereka masuk lewat
        halaman portal dengan nama pengguna dan kata sandi awal yang sama, lalu bisa diganti kemudian.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Tombol disabled={jalan.isPending} onClick={() => jalan.mutate(false)}>
          <UserPlus aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
          {jalan.isPending ? "Sedang menyiapkan…" : "Siapkan akun pengurus"}
        </Tombol>
        <Tombol
          varian="sekunder"
          disabled={jalan.isPending}
          onClick={() => {
            if (window.confirm("Setel ulang kata sandi semua pengurus ke sandi awal?")) {
              jalan.mutate(true);
            }
          }}
        >
          Setel ulang kata sandi semua
        </Tombol>
      </div>

      {sandiAwal && (
        <p className="mt-4 rounded-lg bg-gold-pale p-4 text-base text-primary">
          Kata sandi awal untuk semua akun: <strong>{sandiAwal}</strong>
        </p>
      )}

      {hasil.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {hasil.map((h) => (
            <li
              key={`${h.nama}-${h.username}`}
              className="rounded-lg border border-border-hair px-4 py-3 text-base"
            >
              <strong>{h.nama}</strong>
              {h.username && <> — nama pengguna: <code>{h.username}</code></>}
              <span className="ml-2 text-muted-foreground">
                ({KETERANGAN[h.status]}
                {h.pesan ? `: ${h.pesan}` : ""})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
