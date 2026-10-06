import { useEffect, useId, useRef, useState } from "react";
import { Monitor, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModeWarna = "light" | "dark" | "system";
export type UkuranTeks = "normal" | "besar" | "lebih" | "sangat";

export const KUNCI_MODE = "mode-warna";
export const KUNCI_UKURAN = "ukuran-teks";

const persenUkuran: Record<UkuranTeks, string> = {
  normal: "100%",
  besar: "112.5%",
  lebih: "125%",
  sangat: "140%",
};

const pilihanMode: { nilai: ModeWarna; label: string; Ikon: typeof Sun }[] = [
  { nilai: "light", label: "Terang", Ikon: Sun },
  { nilai: "dark", label: "Gelap", Ikon: Moon },
  { nilai: "system", label: "Ikut sistem", Ikon: Monitor },
];

const pilihanUkuran: { nilai: UkuranTeks; label: string; contoh: string }[] = [
  { nilai: "normal", label: "Normal (100%)", contoh: "1rem" },
  { nilai: "besar", label: "Besar (112%)", contoh: "1.125rem" },
  { nilai: "lebih", label: "Lebih Besar (125%)", contoh: "1.25rem" },
  { nilai: "sangat", label: "Sangat Besar (140%)", contoh: "1.4rem" },
];

function terapkanMode(mode: ModeWarna) {
  const html = document.documentElement;
  if (mode === "system") {
    html.removeAttribute("data-theme");
    html.classList.remove("dark");
    const gelapSistem = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.classList.toggle("dark", gelapSistem);
  } else {
    html.setAttribute("data-theme", mode);
    html.classList.toggle("dark", mode === "dark");
  }
}

function terapkanUkuran(ukuran: UkuranTeks) {
  document.documentElement.style.fontSize = persenUkuran[ukuran];
}

export function TombolTampilan({ className }: { className?: string }) {
  const [buka, setBuka] = useState(false);
  const [mode, setMode] = useState<ModeWarna>("light");
  const [ukuran, setUkuran] = useState<UkuranTeks>("normal");
  const wadah = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  useEffect(() => {
    const m = localStorage.getItem(KUNCI_MODE) as ModeWarna | null;
    const u = localStorage.getItem(KUNCI_UKURAN) as UkuranTeks | null;
    if (m === "light" || m === "dark" || m === "system") setMode(m);
    else terapkanMode("light");
    if (u && u in persenUkuran) setUkuran(u);
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const ubah = () => terapkanMode("system");
    mq.addEventListener("change", ubah);
    return () => mq.removeEventListener("change", ubah);
  }, [mode]);

  useEffect(() => {
    if (!buka) return;
    function klikLuar(e: MouseEvent) {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    }
    function tombolEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setBuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    document.addEventListener("keydown", tombolEsc);
    return () => {
      document.removeEventListener("mousedown", klikLuar);
      document.removeEventListener("keydown", tombolEsc);
    };
  }, [buka]);

  function pilihMode(nilai: ModeWarna) {
    setMode(nilai);
    localStorage.setItem(KUNCI_MODE, nilai);
    terapkanMode(nilai);
  }

  function pilihUkuran(nilai: UkuranTeks) {
    setUkuran(nilai);
    localStorage.setItem(KUNCI_UKURAN, nilai);
    terapkanUkuran(nilai);
  }

  return (
    <div ref={wadah} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={buka}
        aria-controls={idPanel}
        onClick={() => setBuka((v) => !v)}
        className="inline-flex min-h-[2.75rem] shrink-0 items-center gap-2 rounded-lg border-2 border-border-field bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted sm:px-4 sm:text-base"
      >
        <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
        Tampilan
      </button>

      {buka && (
        <div
          id={idPanel}
          role="group"
          aria-label="Pengaturan tampilan"
          className="panel-muncul fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-xl border border-border-hair bg-popover p-4 text-popover-foreground shadow-card sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[20rem] sm:max-w-[calc(100vw-2rem)]"
        >
          <fieldset className="border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-foreground">Mode warna</legend>
            <div className="grid grid-cols-3 gap-2">
              {pilihanMode.map(({ nilai, label, Ikon }) => (
                <button
                  key={nilai}
                  type="button"
                  aria-pressed={mode === nilai}
                  onClick={() => pilihMode(nilai)}
                  className={cn(
                    "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-2 text-xs font-semibold",
                    mode === nilai
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-field bg-card text-foreground hover:bg-muted",
                  )}
                >
                  <Ikon aria-hidden="true" className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-foreground">Ukuran teks</legend>
            <div className="flex flex-col gap-2">
              {pilihanUkuran.map(({ nilai, label, contoh }) => (
                <button
                  key={nilai}
                  type="button"
                  aria-pressed={ukuran === nilai}
                  onClick={() => pilihUkuran(nilai)}
                  className={cn(
                    "flex min-h-[2.75rem] items-center gap-3 rounded-lg border-2 px-3 py-2 text-sm font-semibold",
                    ukuran === nilai
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-field bg-card text-foreground hover:bg-muted",
                  )}
                >
                  <span aria-hidden="true" style={{ fontSize: contoh, lineHeight: 1.2 }}>
                    Aa
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <p className="mt-4 text-xs text-muted-foreground">
            Pengaturan ini tersimpan di perangkat ini dan berlaku untuk semua halaman.
          </p>
        </div>
      )}
    </div>
  );
}
