import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type PeristiwaPasang = Event & { prompt: () => Promise<void> };

/**
 * Tombol "Pasang aplikasi" — muncul di Chrome HP bila aplikasi belum dipasang.
 */
export function TombolPasang({ className = "" }: { className?: string }) {
  const [peristiwa, setPeristiwa] = useState<PeristiwaPasang | null>(null);

  useEffect(() => {
    function tangkap(e: Event) {
      e.preventDefault();
      setPeristiwa(e as PeristiwaPasang);
    }
    window.addEventListener("beforeinstallprompt", tangkap);
    window.addEventListener("appinstalled", () => setPeristiwa(null));
    return () => window.removeEventListener("beforeinstallprompt", tangkap);
  }, []);

  if (!peristiwa) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await peristiwa.prompt();
        setPeristiwa(null);
      }}
      className={`inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border-2 border-gold bg-gold-pale px-4 py-2 text-base font-semibold text-primary hover:bg-muted ${className}`}
    >
      <Download aria-hidden="true" className="h-5 w-5" />
      Pasang aplikasi di HP
    </button>
  );
}
