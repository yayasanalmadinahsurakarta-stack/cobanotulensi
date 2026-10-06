import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tombol } from "@/components/tombol";
import { rapikanNotulensi, type HasilRapi } from "@/lib/ai.functions";

type Props = {
  /** Dipanggil setelah AI selesai. Hasil hanya mengisi formulir, tidak disimpan. */
  onHasil: (hasil: HasilRapi, teksMentah: string) => void;
  /** Dipanggil bila pemakai memilih meneruskan catatan mentah tanpa AI. */
  onTanpaAi?: (teksMentah: string) => void;
  labelTanpaAi?: string;
  keterangan?: string;
};

/**
 * Kotak tempel catatan rapat mentah beserta tombol "Rapikan dengan AI".
 * Hasil AI selalu ditinjau manusia sebelum disimpan.
 */
export function PanelRapikanAi({ onHasil, onTanpaAi, labelTanpaAi, keterangan }: Props) {
  const [teks, setTeks] = useState("");
  const [proses, setProses] = useState(false);
  const jalankanAi = useServerFn(rapikanNotulensi);

  async function rapikan() {
    const isi = teks.trim();
    if (isi.length < 20) {
      toast.error("Tempelkan catatan rapat lebih dahulu.");
      return;
    }
    setProses(true);
    try {
      const balasan = await jalankanAi({ data: { teks: isi } });
      if (balasan.ok) {
        onHasil(balasan.hasil, isi);
        toast.success("Catatan sudah dirapikan. Silakan periksa dan koreksi sebelum menyimpan.");
      } else {
        toast.error(`${balasan.pesan} Catatan mentah tetap dipakai sebagai draf.`);
        onTanpaAi?.(isi);
      }
    } catch (e) {
      toast.error(
        `${e instanceof Error ? e.message : "AI gagal dihubungi."} Catatan mentah tetap dipakai sebagai draf.`,
      );
      onTanpaAi?.(isi);
    } finally {
      setProses(false);
    }
  }

  return (
    <div>
      <label htmlFor="tempel-ai" className="block text-base font-semibold">
        Catatan mentah rapat
      </label>
      {keterangan && <p className="mt-1 text-base text-muted-foreground">{keterangan}</p>}
      <textarea
        id="tempel-ai"
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        rows={14}
        className="mt-2 w-full rounded-lg border-2 border-border-field bg-background px-4 py-3 text-base"
        placeholder="Tempelkan catatan rapat di sini — boleh berantakan, banyak typo, atau tumpang tindih…"
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <Tombol onClick={rapikan} disabled={proses || teks.trim() === ""}>
          {proses ? "Memproses dengan AI…" : "Rapikan dengan AI"}
        </Tombol>
        {onTanpaAi && (
          <Tombol
            varian="sekunder"
            onClick={() => onTanpaAi(teks)}
            disabled={proses || teks.trim() === ""}
          >
            {labelTanpaAi ?? "Lanjutkan tanpa AI"}
          </Tombol>
        )}
      </div>
      {proses && (
        <p aria-live="polite" className="mt-3 text-base text-muted-foreground">
          Memproses dengan AI… mohon tunggu, jangan menutup halaman ini.
        </p>
      )}
    </div>
  );
}
