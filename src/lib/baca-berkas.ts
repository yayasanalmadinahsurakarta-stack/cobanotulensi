/**
 * Membaca teks dari berkas notulensi yang diunggah pengurus.
 * Semua pembacaan berjalan di peramban; berkas hanya dikirim ke penyimpanan
 * setelah pengguna menyetujui hasil tinjauan.
 */

export const TIPE_DIDUKUNG = [".pdf", ".docx", ".txt", ".md", ".rtf"] as const;

export const KETERANGAN_TIPE = "PDF, Word (.docx), teks (.txt), Markdown (.md), atau RTF";

export const BATAS_BERKAS = 30;

export class BerkasError extends Error {}

export function ekstensi(nama: string): string {
  const titik = nama.lastIndexOf(".");
  return titik === -1 ? "" : nama.slice(titik).toLowerCase();
}

export function tipeDidukung(nama: string): boolean {
  return (TIPE_DIDUKUNG as readonly string[]).includes(ekstensi(nama));
}

function bersihkanRtf(isi: string): string {
  return isi
    .replace(/\\'[0-9a-f]{2}/gi, " ")
    .replace(/\\[a-z]+-?\d* ?/gi, " ")
    .replace(/[{}]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function bacaPdf(berkas: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");

  // Worker dimuat dari berkas bawaan pustaka. Bila gagal (misalnya diblokir),
  // pembacaan tetap dilanjutkan pada thread utama agar isi PDF tetap terbaca.
  try {
    const worker = new Worker(new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url), {
      type: "module",
    });
    (pdfjs.GlobalWorkerOptions as unknown as { workerPort: Worker | null }).workerPort = worker;
  } catch {
    (pdfjs.GlobalWorkerOptions as unknown as { workerSrc: string }).workerSrc = "";
  }

  const dokumen = await pdfjs.getDocument({
    data: new Uint8Array(await berkas.arrayBuffer()),
    useSystemFonts: true,
  }).promise;

  const halaman: string[] = [];
  for (let i = 1; i <= dokumen.numPages; i++) {
    const hal = await dokumen.getPage(i);
    const isi = await hal.getTextContent();
    let baris = "";
    let akhirSebelumnya: number | null = null;
    for (const it of isi.items) {
      if (!("str" in it)) continue;
      const y = Array.isArray(it.transform) ? (it.transform[5] as number) : null;
      if (akhirSebelumnya !== null && y !== null && Math.abs(y - akhirSebelumnya) > 2) {
        baris += "\n";
      } else if (baris !== "" && !baris.endsWith(" ") && !baris.endsWith("\n")) {
        baris += " ";
      }
      baris += it.str;
      if (y !== null) akhirSebelumnya = y;
    }
    halaman.push(baris.replace(/[ \t]+\n/g, "\n"));
    hal.cleanup();
  }
  dokumen.cleanup();
  return halaman.join("\n\n");
}


async function bacaDocx(berkas: File): Promise<string> {
  const mammoth = await import("mammoth");
  const hasil = await mammoth.extractRawText({ arrayBuffer: await berkas.arrayBuffer() });
  return hasil.value;
}

/** Mengambil teks dari satu berkas. Melempar BerkasError bila tidak terbaca. */
export async function bacaTeksBerkas(berkas: File): Promise<string> {
  const ext = ekstensi(berkas.name);
  if (!tipeDidukung(berkas.name)) {
    throw new BerkasError(`Tipe berkas ${ext || "tanpa ekstensi"} tidak didukung. Terima ${KETERANGAN_TIPE}.`);
  }

  if (ext === ".pdf") {
    const teks = await bacaPdf(berkas);
    if (teks.replace(/\s/g, "").length < 30) {
      throw new BerkasError(
        "PDF hasil pindaian, tidak ada teks yang bisa dibaca. Silakan tempelkan isinya secara manual lewat mode Tempel teks.",
      );
    }
    return teks;
  }

  if (ext === ".docx") {
    const teks = await bacaDocx(berkas);
    if (teks.trim().length < 10) throw new BerkasError("Dokumen Word ini tidak memuat teks.");
    return teks;
  }

  const mentah = await berkas.text();
  const teks = ext === ".rtf" ? bersihkanRtf(mentah) : mentah;
  if (teks.trim().length < 10) throw new BerkasError("Berkas ini kosong atau tidak memuat teks.");
  return teks;
}
