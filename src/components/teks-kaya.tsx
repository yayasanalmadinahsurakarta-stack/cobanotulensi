import type { ReactNode } from "react";
import { adalahHtml, bersihkanHtml } from "@/lib/teks-kaya";
import { cn } from "@/lib/utils";

type Props = {
  nilai: string;
  className?: string;
  /** Bila true, isi ditampilkan di dalam panel baca berlatar lembut. */
  panel?: boolean;
};

/** Menampilkan isi yang bisa berupa teks biasa atau teks berformat. */
export function TeksKaya({ nilai, className, panel }: Props) {
  const dasar = cn("prosa isi-kaya text-base", panel && "panel-baca", className);
  if (!adalahHtml(nilai)) {
    return <div className={dasar}>{susunTeksBiasa(nilai)}</div>;
  }
  return <div className={dasar} dangerouslySetInnerHTML={{ __html: bersihkanHtml(nilai) }} />;
}

const polaJudul = /^(\d+)\.\s+(.{2,90})$/;
const polaButirAngka = /^(\d+)\)\s+(.+)$/;
const polaButirTitik = /^[-•*]\s+(.+)$/;

/**
 * Teks lama tanpa format tetap dirapikan: baris "1. Judul" menjadi subjudul,
 * baris "1) isi" atau "- isi" menjadi daftar bernomor / butir.
 */
function susunTeksBiasa(nilai: string): ReactNode {
  const baris = nilai.split("\n").map((b) => b.trim());
  const hasil: ReactNode[] = [];
  let daftar: { jenis: "ol" | "ul"; isi: string[] } | null = null;
  let paragraf: string[] = [];
  let kunci = 0;

  const tutupParagraf = () => {
    if (paragraf.length === 0) return;
    hasil.push(
      <p key={`p${kunci++}`} className="whitespace-pre-line">
        {paragraf.join("\n")}
      </p>,
    );
    paragraf = [];
  };
  const tutupDaftar = () => {
    if (!daftar) return;
    const butir = daftar.isi.map((t, i) => <li key={i}>{t}</li>);
    hasil.push(
      daftar.jenis === "ol" ? <ol key={`l${kunci++}`}>{butir}</ol> : <ul key={`l${kunci++}`}>{butir}</ul>,
    );
    daftar = null;
  };

  for (const b of baris) {
    if (b === "") {
      tutupParagraf();
      tutupDaftar();
      continue;
    }
    const angka = polaButirAngka.exec(b);
    const titik = polaButirTitik.exec(b);
    const judul = polaJudul.exec(b);

    if (angka) {
      tutupParagraf();
      if (daftar?.jenis !== "ol") tutupDaftar();
      daftar ??= { jenis: "ol", isi: [] };
      daftar.isi.push(angka[2] ?? "");
      continue;
    }
    if (titik) {
      tutupParagraf();
      if (daftar?.jenis !== "ul") tutupDaftar();
      daftar ??= { jenis: "ul", isi: [] };
      daftar.isi.push(titik[1] ?? "");
      continue;
    }
    if (judul) {
      tutupParagraf();
      tutupDaftar();
      hasil.push(
        <h3 key={`h${kunci++}`}>
          {judul[1]}. {judul[2]}
        </h3>,
      );
      continue;
    }
    tutupDaftar();
    paragraf.push(b);
  }
  tutupParagraf();
  tutupDaftar();
  return hasil;
}
