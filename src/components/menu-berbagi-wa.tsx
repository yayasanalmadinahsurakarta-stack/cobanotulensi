import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  rapikanNomorWa,
  salinTeks,
  susunPesanTugas,
  susunPesanWa,
  tautanWa,
} from "@/lib/pesan-wa";
import type { Notulensi } from "@/lib/notulensi-types";

export type KontakPj = { nama: string; no_wa: string | null };

type Props = {
  /** Diambil saat menu dibuka, sehingga isi penuh tidak perlu dimuat lebih awal. */
  dapatkan: () => Promise<Notulensi | null> | Notulensi | null;
  /** Daftar penanggung jawab beserta nomor WA-nya (hanya tersedia untuk pengurus). */
  kontak?: KontakPj[];
  className?: string;
};

const kelasItem =
  "flex w-full min-h-[2.75rem] items-center rounded-lg px-4 py-2.5 text-left text-base text-foreground no-underline hover:bg-muted";

export function MenuBerbagiWa({ dapatkan, kontak = [], className }: Props) {
  const [buka, setBuka] = useState(false);
  const [data, setData] = useState<Notulensi | null>(null);
  const [memuat, setMemuat] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    function klikLuar(e: MouseEvent) {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    }
    function tekanEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setBuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    document.addEventListener("keydown", tekanEsc);
    return () => {
      document.removeEventListener("mousedown", klikLuar);
      document.removeEventListener("keydown", tekanEsc);
    };
  }, [buka]);

  async function bukaMenu() {
    if (buka) {
      setBuka(false);
      return;
    }
    setBuka(true);
    if (data) return;
    setMemuat(true);
    try {
      const hasil = await dapatkan();
      setData(hasil);
      if (!hasil) toast.error("Isi notulensi tidak bisa dimuat");
    } catch {
      toast.error("Isi notulensi tidak bisa dimuat");
    } finally {
      setMemuat(false);
    }
  }

  const asal = typeof window === "undefined" ? "" : window.location.origin;
  const pesan = data ? susunPesanWa(data, asal) : "";

  const penerima = data
    ? [...new Set(data.tindak_lanjut.map((t) => t.pj_nama ?? "").filter(Boolean))]
        .map((nama) => {
          const cocok = kontak.find((k) => k.nama.toLowerCase() === nama.toLowerCase());
          return { nama, nomor: rapikanNomorWa(cocok?.no_wa) };
        })
        .filter((p) => p.nomor)
    : [];

  return (
    <div ref={wadah} className={cn("relative", className)}>
      <button
        type="button"
        onClick={bukaMenu}
        aria-expanded={buka}
        aria-haspopup="menu"
        className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-lg border-2 border-border-field bg-card px-5 py-2.5 text-base font-semibold text-primary hover:bg-muted sm:w-auto"
      >
        Bagikan ke WhatsApp
      </button>

      {buka && (
        <div
          aria-hidden="true"
          onClick={() => setBuka(false)}
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
        />
      )}

      {buka && (
        <div
          role="menu"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] w-full overflow-y-auto rounded-t-2xl border border-border-field bg-card p-2 pb-6 shadow-card sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:z-30 sm:mt-2 sm:w-80 sm:max-w-[90vw] sm:rounded-xl sm:pb-2"
        >
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border-field sm:hidden" />
          {memuat && (
            <p className="px-4 py-3 text-base text-muted-foreground">Sedang menyiapkan pesan…</p>
          )}


          {!memuat && data && (
            <>
              <button
                type="button"
                role="menuitem"
                className={kelasItem}
                onClick={async () => {
                  const berhasil = await salinTeks(pesan);
                  setBuka(false);
                  if (berhasil) toast.success("Teks notulensi tersalin. Silakan tempel di grup.");
                  else toast.error("Peramban menolak penyalinan. Salin manual dari halaman cetak.");
                }}
              >
                Salin teks notulensi
              </button>

              <a
                role="menuitem"
                href={tautanWa(pesan)}
                target="_blank"
                rel="noopener noreferrer"
                className={kelasItem}
                onClick={() => setBuka(false)}
              >
                Buka WhatsApp
              </a>

              {penerima.length > 0 && (
                <div className="mt-1 border-t border-border-hair pt-1">
                  <p className="px-4 py-2 text-sm font-semibold text-muted-foreground">
                    Kirim ke penanggung jawab
                  </p>
                  {penerima.map((p) => (
                    <a
                      key={p.nama}
                      role="menuitem"
                      href={tautanWa(susunPesanTugas(data, p.nama, asal), p.nomor)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={kelasItem}
                      onClick={() => setBuka(false)}
                    >
                      {p.nama}
                    </a>
                  ))}
                </div>
              )}

              {kontak.length > 0 && penerima.length === 0 && (
                <p className="px-4 py-2 text-sm text-muted-foreground">
                  Belum ada penanggung jawab dengan nomor WhatsApp tersimpan.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
