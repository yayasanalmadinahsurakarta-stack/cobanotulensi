import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Tombol } from "@/components/tombol";
import { rapikanNotulensi, type HasilRapi } from "@/lib/ai.functions";
import {
  BerkasError,
  KETERANGAN_TIPE,
  bacaTeksBerkas,
  tipeDidukung,
} from "@/lib/baca-berkas";

const BATAS_UKURAN = 25 * 1024 * 1024;

type Props = {
  onHasil: (hasil: HasilRapi, teksMentah: string) => void;
  onTanpaAi: (teksMentah: string) => void;
};

export function UnggahSatuNotulensi({ onHasil, onTanpaAi }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const jalankanAi = useServerFn(rapikanNotulensi);
  const [proses, setProses] = useState(false);
  const [namaBerkas, setNamaBerkas] = useState("");
  const [tahap, setTahap] = useState("");

  async function pilihBerkas(daftar: FileList | null) {
    if (!daftar || daftar.length === 0) return;
    if (daftar.length > 1) {
      toast.error("Di halaman ini hanya boleh satu berkas. Gunakan menu Unggah untuk banyak berkas.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const berkas = daftar.item(0);
    if (!berkas) return;
    setNamaBerkas(berkas.name);

    if (!tipeDidukung(berkas.name)) {
      toast.error(`Tipe berkas tidak didukung. Pilih ${KETERANGAN_TIPE}.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (berkas.size > BATAS_UKURAN) {
      toast.error("Ukuran berkas melebihi batas 25 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setProses(true);
    setTahap("Membaca isi dokumen…");
    try {
      const teks = await bacaTeksBerkas(berkas);
      setTahap("Merapikan dan mengisi kolom dengan AI…");
      const balasan = await jalankanAi({ data: { teks: teks.slice(0, 40000) } });
      if (balasan.ok) {
        onHasil(balasan.hasil, teks);
        toast.success("Dokumen sudah dirapikan. Periksa kembali semua kolom sebelum menyimpan.");
      } else {
        onTanpaAi(teks);
        toast.error(`${balasan.pesan} Isi dokumen dimasukkan apa adanya ke Pembahasan.`);
      }
    } catch (error) {
      const pesan =
        error instanceof BerkasError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Dokumen gagal diproses.";
      toast.error(pesan);
    } finally {
      setProses(false);
      setTahap("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-border-hair bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">Unggah satu dokumen notulensi</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            AI akan membaca dan mengisi kolom yang tersedia. Hasilnya belum tersimpan sampai Anda
            memeriksa lalu menekan tombol simpan.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {KETERANGAN_TIPE} · maksimal 25 MB
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        id="unggah-satu-notulensi"
        type="file"
        accept=".pdf,.docx,.txt,.md,.rtf"
        className="sr-only"
        disabled={proses}
        onChange={(event) => void pilihBerkas(event.target.files)}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Tombol
          type="button"
          varian="sekunder"
          disabled={proses}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          {proses ? "Sedang diproses…" : "Pilih satu dokumen"}
        </Tombol>
        <Link
          to="/admin/unggah"
          className="text-sm font-semibold text-primary underline underline-offset-2"
        >
          Punya banyak berkas? Buka menu Unggah
        </Link>
      </div>

      {(proses || namaBerkas) && (
        <p aria-live="polite" className="mt-3 break-words text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{namaBerkas}</span>
          {tahap ? ` — ${tahap}` : ""}
        </p>
      )}
    </div>
  );
}