import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading2,
  Heading3,
  Pilcrow,
  CaseUpper,
  CaseLower,
  Indent,
  Outdent,
  Eraser,
} from "lucide-react";
import { adalahHtml, bersihkanHtml, teksKeHtml } from "@/lib/teks-kaya";

type Props = {
  nilai: string;
  onChange: (html: string) => void;
  label: string;
  minTinggi?: number;
};

function jalankan(perintah: string, nilai?: string) {
  document.execCommand(perintah, false, nilai);
}

function TombolAlat({
  judul,
  onClick,
  children,
}: {
  judul: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={judul}
      aria-label={judul}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border-2 border-border-field bg-background px-2 text-base font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </button>
  );
}

/** Editor teks berformat sederhana ala Word untuk isi pembahasan. */
export function EditorKaya({ nilai, onChange, label, minTinggi = 320 }: Props) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const terakhirRef = useRef<string | null>(null);
  const [jarakBaris, setJarakBaris] = useState("1.6");

  // Menyelaraskan isi editor bila nilai diubah dari luar (mis. hasil AI / tempel mentah).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    if (terakhirRef.current !== null && nilai === terakhirRef.current) return;
    const html = adalahHtml(nilai) ? bersihkanHtml(nilai) : teksKeHtml(nilai);
    if (el.innerHTML !== html) el.innerHTML = html;
    terakhirRef.current = nilai;
  }, [nilai]);

  function simpan() {
    const el = areaRef.current;
    if (!el) return;
    const html = bersihkanHtml(el.innerHTML);
    terakhirRef.current = html;
    onChange(html);
  }


  function terapkan(perintah: string, nilaiPerintah?: string) {
    areaRef.current?.focus();
    jalankan(perintah, nilaiPerintah);
    simpan();
  }

  function ubahKapital(mode: "atas" | "bawah") {
    const seleksi = window.getSelection();
    const teks = seleksi?.toString() ?? "";
    if (!teks) return;
    areaRef.current?.focus();
    jalankan("insertText", mode === "atas" ? teks.toUpperCase() : teks.toLowerCase());
    simpan();
  }

  function ubahJarak(nilaiJarak: string) {
    setJarakBaris(nilaiJarak);
    const el = areaRef.current;
    if (!el) return;
    el.style.lineHeight = nilaiJarak;
    el.querySelectorAll<HTMLElement>("p, li, div, h1, h2, h3, h4").forEach((n) => {
      n.style.lineHeight = nilaiJarak;
    });
    simpan();
  }

  return (
    <div className="rounded-lg border-2 border-border-field bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-border-field p-2">
        <TombolAlat judul="Tebal" onClick={() => terapkan("bold")}>
          <Bold className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Miring" onClick={() => terapkan("italic")}>
          <Italic className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Garis bawah" onClick={() => terapkan("underline")}>
          <Underline className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Coret" onClick={() => terapkan("strikeThrough")}>
          <Strikethrough className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Stabilo" onClick={() => terapkan("hiliteColor", "#fde68a")}>
          <Highlighter className="h-5 w-5" />
        </TombolAlat>

        <span className="mx-1 h-8 w-px bg-border" aria-hidden="true" />

        <TombolAlat judul="Daftar titik" onClick={() => terapkan("insertUnorderedList")}>
          <List className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Daftar bernomor" onClick={() => terapkan("insertOrderedList")}>
          <ListOrdered className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Tambah indentasi" onClick={() => terapkan("indent")}>
          <Indent className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Kurangi indentasi" onClick={() => terapkan("outdent")}>
          <Outdent className="h-5 w-5" />
        </TombolAlat>

        <span className="mx-1 h-8 w-px bg-border" aria-hidden="true" />

        <TombolAlat judul="Paragraf biasa" onClick={() => terapkan("formatBlock", "<p>")}>
          <Pilcrow className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Judul besar" onClick={() => terapkan("formatBlock", "<h2>")}>
          <Heading2 className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Judul kecil" onClick={() => terapkan("formatBlock", "<h3>")}>
          <Heading3 className="h-5 w-5" />
        </TombolAlat>

        <span className="mx-1 h-8 w-px bg-border" aria-hidden="true" />

        <TombolAlat judul="Rata kiri" onClick={() => terapkan("justifyLeft")}>
          <AlignLeft className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Rata tengah" onClick={() => terapkan("justifyCenter")}>
          <AlignCenter className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Rata kanan" onClick={() => terapkan("justifyRight")}>
          <AlignRight className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Rata kiri-kanan" onClick={() => terapkan("justifyFull")}>
          <AlignJustify className="h-5 w-5" />
        </TombolAlat>

        <span className="mx-1 h-8 w-px bg-border" aria-hidden="true" />

        <TombolAlat judul="HURUF BESAR" onClick={() => ubahKapital("atas")}>
          <CaseUpper className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="huruf kecil" onClick={() => ubahKapital("bawah")}>
          <CaseLower className="h-5 w-5" />
        </TombolAlat>
        <TombolAlat judul="Hapus format" onClick={() => terapkan("removeFormat")}>
          <Eraser className="h-5 w-5" />
        </TombolAlat>

        <label className="ml-2 inline-flex items-center gap-2 text-base font-semibold">
          Jarak baris
          <select
            value={jarakBaris}
            onChange={(e) => ubahJarak(e.target.value)}
            className="h-10 rounded-md border-2 border-border-field bg-background px-2 text-base"
          >
            <option value="1.2">1,0</option>
            <option value="1.6">1,5</option>
            <option value="2">2,0</option>
            <option value="2.4">2,5</option>
          </select>
        </label>
      </div>

      <div
        ref={areaRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        onInput={simpan}
        onBlur={simpan}
        onPaste={(e) => {
          e.preventDefault();
          const teks = e.clipboardData.getData("text/plain");
          jalankan("insertText", teks);
          simpan();
        }}
        style={{ minHeight: minTinggi, lineHeight: jarakBaris }}
        className="isi-kaya w-full px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
