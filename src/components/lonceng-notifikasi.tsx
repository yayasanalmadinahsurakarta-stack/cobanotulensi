import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, CircleCheck, ClipboardList, MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tombol } from "@/components/tombol";
import {
  ambilNotifikasi,
  tandaiNotifikasiDibaca,
  tandaiSemuaNotifikasiDibaca,
} from "@/lib/notifikasi-api";

function waktuSingkat(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IkonNotifikasi({ jenis }: { jenis: string }) {
  const kelas = "h-4 w-4";
  if (jenis === "komentar") return <MessageCircle aria-hidden="true" className={kelas} />;
  if (jenis === "tindak_lanjut") return <ClipboardList aria-hidden="true" className={kelas} />;
  if (jenis === "notulensi_baru") return <Sparkles aria-hidden="true" className={kelas} />;
  return <CircleCheck aria-hidden="true" className={kelas} />;
}

/** Lonceng notifikasi di kepala Area Sekertaris. */
export function LoncengNotifikasi({ tujuan = "admin" }: { tujuan?: "admin" | "portal" }) {
  const [buka, setBuka] = useState(false);
  const kotak = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifikasi"],
    queryFn: ambilNotifikasi,
    refetchInterval: 60_000,
  });
  const daftar = data ?? [];
  const belum = daftar.filter((n) => !n.dibaca_pada).length;

  const semua = useMutation({
    mutationFn: tandaiSemuaNotifikasiDibaca,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifikasi"] }),
  });
  const satu = useMutation({
    mutationFn: tandaiNotifikasiDibaca,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifikasi"] }),
  });

  useEffect(() => {
    if (!buka) return;
    function klikLuar(e: MouseEvent) {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, [buka]);

  return (
    <div className="relative" ref={kotak}>
      <Tombol
        varian="sekunder"
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-label={belum > 0 ? `Notifikasi, ${belum} belum dibaca` : "Notifikasi"}
        className="relative h-11 min-h-11 w-11 min-w-11 rounded-xl p-0"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {belum > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground ring-2 ring-card">
            {belum > 99 ? "99+" : belum}
          </span>
        )}
      </Tombol>

      {buka && (
        <div className="panel-muncul fixed inset-x-3 top-20 z-50 max-h-[min(72vh,36rem)] overflow-hidden rounded-2xl border border-border-hair bg-popover shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:mt-2 sm:w-[25rem]">
          <div className="flex items-center justify-between gap-3 border-b border-border-hair px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">Notifikasi</p>
              <p className="text-xs text-muted-foreground">{belum > 0 ? `${belum} belum dibaca` : "Semua sudah dibaca"}</p>
            </div>
            {belum > 0 && (
              <Tombol
                varian="sekunder"
                type="button"
                onClick={() => semua.mutate()}
                className="min-h-9 min-w-9 rounded-lg border-0 px-2.5 py-1.5 text-xs"
              >
                <CheckCheck aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">Baca semua</span>
              </Tombol>
            )}
          </div>

          {daftar.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada notifikasi.
            </p>
          ) : (
            <ul className="flex max-h-[calc(min(72vh,36rem)-4.5rem)] list-none flex-col gap-1 overflow-y-auto p-2">
              {daftar.map((n) => {
                const hashTujuan = n.komentar_id
                  ? `komentar-${n.komentar_id}`
                  : n.jenis === "komentar"
                    ? "komentar"
                    : null;
                const isi = (
                  <span className="flex min-w-0 gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.dibaca_pada ? "bg-muted text-muted-foreground" : "bg-gold-pale text-gold-text"}`}>
                      <IkonNotifikasi jenis={n.jenis} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className={`block flex-1 text-sm leading-snug ${n.dibaca_pada ? "font-medium text-foreground" : "font-semibold text-primary"}`}>{n.judul}</span>
                        {!n.dibaca_pada && <span aria-label="Belum dibaca" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                      </span>
                      {n.pesan && <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{n.pesan}</span>}
                      <span className="mt-1.5 block text-xs font-medium text-faint-foreground">{waktuSingkat(n.dibuat_pada)}</span>
                    </span>
                  </span>
                );
                const kelas = `block rounded-xl px-3 py-3 no-underline transition-colors ${
                  n.dibaca_pada ? "hover:bg-muted" : "bg-accent hover:bg-muted"
                }`;
                return (
                  <li key={n.id}>
                    {n.notulensi_id ? (
                      <Link
                        to={tujuan === "portal" ? "/notulensi/$id" : "/admin/notulensi/$id"}
                        params={{ id: n.notulensi_id }}
                        {...(hashTujuan ? { hash: hashTujuan } : {})}
                        className={kelas}
                        onClick={() => {
                          if (!n.dibaca_pada) satu.mutate(n.id);
                          setBuka(false);
                        }}
                      >
                        {isi}
                      </Link>
                    ) : (
                      <Tombol
                        varian="sekunder"
                        type="button"
                        className={`${kelas} h-auto min-h-0 w-full justify-start border-0 text-left`}
                        onClick={() => !n.dibaca_pada && satu.mutate(n.id)}
                      >
                        {isi}
                      </Tombol>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
