import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, MessageSquare, Send, SmilePlus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tombol } from "@/components/tombol";
import {
  ambilIdentitasKomentator,
  ambilKomentar,
  daftarEmoji,
  hapusKomentar,
  kirimKomentar,
  ubahReaksi,
  type Komentar,
} from "@/lib/komentar-api";

function waktuSingkat(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inisial(nama: string): string {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k.charAt(0).toUpperCase())
    .join("");
}

/**
 * Kolom masukan pada satu notulensi bergaya percakapan: setiap pengurus aktif
 * dapat menulis, membalas, dan memberi reaksi emoji. Approver boleh menghapus
 * seluruh komentar beserta tanggapannya.
 */
export function KolomKomentar({ notulensiId }: { notulensiId: string }) {
  const queryClient = useQueryClient();
  const [isi, setIsi] = useState("");

  const { data: saya } = useQuery({
    queryKey: ["identitas-komentator"],
    queryFn: ambilIdentitasKomentator,
  });

  const { data, isPending } = useQuery({
    queryKey: ["komentar", notulensiId],
    queryFn: () => ambilKomentar(notulensiId),
  });

  const segarkan = () => queryClient.invalidateQueries({ queryKey: ["komentar", notulensiId] });

  const kirim = useMutation({
    mutationFn: () => kirimKomentar(notulensiId, isi),
    onSuccess: () => {
      setIsi("");
      toast.success("Masukan terkirim");
      segarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const daftar = data ?? [];
  const jumlah = daftar.reduce((t, k) => t + 1 + k.balasan.length, 0);
  const bolehTulis = Boolean(saya);

  useEffect(() => {
    if (isPending || typeof window === "undefined" || !window.location.hash.startsWith("#komentar")) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [isPending, daftar.length]);

  return (
    <section id="komentar" className="mt-10 scroll-mt-28">
      <h2 className="flex items-center gap-2 border-b-2 border-b-gold pb-2 text-xl text-primary">
        <MessageSquare aria-hidden="true" className="h-5 w-5" />
        Komentar dan Masukan
        {jumlah > 0 && (
          <span className="rounded-full bg-gold-pale px-2 py-0.5 text-sm font-semibold text-primary">
            {jumlah}
          </span>
        )}
      </h2>

      {isPending ? (
        <p className="mt-4 text-base text-muted-foreground">Sedang memuat masukan…</p>
      ) : daftar.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border-hair bg-card p-4 text-base text-muted-foreground">
          Belum ada masukan pada notulensi ini.
        </p>
      ) : (
        <ul className="mt-4 flex list-none flex-col gap-4 p-0">
          {daftar.map((k) => (
            <li key={k.id} className="min-w-0 animate-fade-in">
              <Gelembung
                komentar={k}
                notulensiId={notulensiId}
                saya={saya ?? null}
                onSegarkan={segarkan}
              />
            </li>
          ))}
        </ul>
      )}

      {bolehTulis ? (
        <form
          className="mt-5 rounded-2xl border border-border-hair bg-card p-4 shadow-sm transition-shadow focus-within:shadow-md"
          onSubmit={(e) => {
            e.preventDefault();
            kirim.mutate();
          }}
        >
          <label htmlFor="komentar-baru" className="block text-base font-semibold">
            Tulis masukan Anda
          </label>
          <textarea
            id="komentar-baru"
            rows={3}
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Contoh: mohon tindak lanjut poin anggaran dipercepat."
            className="mt-2 w-full rounded-xl border-2 border-border-field bg-background px-4 py-3 text-base"
          />
          <div className="mt-3">
            <Tombol type="submit" disabled={kirim.isPending || isi.trim().length < 2}>
              <Send aria-hidden="true" className="mr-2 inline h-5 w-5 align-[-0.2em]" />
              {kirim.isPending ? "Mengirim…" : "Kirim masukan"}
            </Tombol>
          </div>
        </form>
      ) : (
        <p className="mt-5 rounded-xl border border-border-hair bg-muted p-4 text-base text-muted-foreground">
          Masuk sebagai pengurus untuk ikut memberi masukan.
        </p>
      )}
    </section>
  );
}

type Saya = { pengurusId: string; nama: string; jabatan: string | null; approver: boolean } | null;

function Gelembung({
  komentar,
  notulensiId,
  saya,
  onSegarkan,
  balasan = false,
}: {
  komentar: Komentar;
  notulensiId: string;
  saya: Saya;
  onSegarkan: () => void;
  balasan?: boolean;
}) {
  const [bukaBalas, setBukaBalas] = useState(false);
  const [bukaEmoji, setBukaEmoji] = useState(false);
  const [teksBalas, setTeksBalas] = useState("");

  const punyaSaya = Boolean(saya && komentar.pengurus_id === saya.pengurusId);
  const bolehHapus = Boolean(saya && (saya.approver || punyaSaya));

  const balas = useMutation({
    mutationFn: () => kirimKomentar(notulensiId, teksBalas, komentar.id),
    onSuccess: () => {
      setTeksBalas("");
      setBukaBalas(false);
      toast.success("Tanggapan terkirim");
      onSegarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hapus = useMutation({
    mutationFn: () => hapusKomentar(komentar.id),
    onSuccess: () => {
      toast.success("Masukan dihapus");
      onSegarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reaksi = useMutation({
    mutationFn: ({ emoji, sudahAda }: { emoji: string; sudahAda: boolean }) => {
      if (!saya) throw new Error("Silakan masuk sebagai pengurus aktif lebih dulu.");
      return ubahReaksi(komentar.id, emoji, saya.pengurusId, sudahAda);
    },
    onSuccess: () => {
      setBukaEmoji(false);
      onSegarkan();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ringkasReaksi = daftarEmoji
    .map((emoji) => {
      const isi = komentar.reaksi.filter((r) => r.emoji === emoji);
      return {
        emoji,
        jumlah: isi.length,
        milikSaya: Boolean(saya && isi.some((r) => r.pengurus_id === saya.pengurusId)),
      };
    })
    .filter((r) => r.jumlah > 0);

  return (
    <div id={`komentar-${komentar.id}`} className={`komentar-tujuan flex min-w-0 scroll-mt-28 gap-2 sm:gap-3 ${balasan ? "mt-3" : ""}`}>
      <span
        aria-hidden="true"
        className={`mt-1 flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ${
          balasan ? "h-7 w-7 text-[10px] sm:h-8 sm:w-8 sm:text-xs" : "h-8 w-8 text-xs sm:h-10 sm:w-10 sm:text-sm"
        }`}
      >
        {inisial(komentar.penulis_nama)}
      </span>

      <div className="min-w-0 flex-1">
        <div
          className={`min-w-0 break-words rounded-2xl border border-border-hair px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md sm:px-4 sm:py-3 ${
            punyaSaya ? "bg-gold-pale" : "bg-card"
          } ${balasan ? "rounded-tl-md" : "rounded-tl-md"}`}
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-semibold text-primary">{komentar.penulis_nama}</span>
            {komentar.penulis_jabatan && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                {komentar.penulis_jabatan}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {waktuSingkat(komentar.dibuat_pada)}
            </span>
          </div>
          <p className="prosa mt-2 whitespace-pre-line text-base">{komentar.isi}</p>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-2 sm:gap-2">
          {ringkasReaksi.map((r) => (
            <button
              key={r.emoji}
              type="button"
              disabled={!saya || reaksi.isPending}
              onClick={() => reaksi.mutate({ emoji: r.emoji, sudahAda: r.milikSaya })}
              className={`reaksi-pil ${r.milikSaya ? "reaksi-pil-aktif" : ""}`}
              aria-label={`Reaksi ${r.emoji}, ${r.jumlah} orang`}
            >
              <span className="reaksi-emoji">{r.emoji}</span>
              <span className="text-xs font-semibold">{r.jumlah}</span>
            </button>
          ))}

          {saya && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setBukaEmoji((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                <SmilePlus aria-hidden="true" className="h-4 w-4" />
                Reaksi
              </button>
              {bukaEmoji && (
                <div className="fixed inset-x-3 bottom-4 z-50 flex animate-scale-in flex-wrap justify-center gap-1 rounded-2xl border border-border-hair bg-card p-2 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:mb-2 sm:flex-nowrap sm:justify-start sm:rounded-full sm:p-1.5 sm:shadow-lg">
                  {daftarEmoji.map((emoji) => {
                    const sudahAda = komentar.reaksi.some(
                      (r) => r.emoji === emoji && r.pengurus_id === saya.pengurusId,
                    );
                    return (
                      <button
                        key={emoji}
                        type="button"
                        aria-label={`Beri reaksi ${emoji}`}
                        onClick={() => reaksi.mutate({ emoji, sudahAda })}
                        className="rounded-full px-1.5 py-1 text-xl transition-transform duration-150 hover:scale-125"
                      >
                        {emoji}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-label="Tutup pilihan reaksi"
                    onClick={() => setBukaEmoji(false)}
                    className="rounded-full px-1.5 text-muted-foreground hover:text-primary"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {saya && !balasan && (
            <button
              type="button"
              onClick={() => setBukaBalas((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              <CornerDownRight aria-hidden="true" className="h-4 w-4" />
              Balas
            </button>
          )}

          {bolehHapus && (
            <button
              type="button"
              onClick={() => hapus.mutate()}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-destructive transition-colors hover:bg-muted"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Hapus
            </button>
          )}
        </div>

        {bukaBalas && (
          <form
            className="mt-2 animate-fade-in rounded-xl border border-border-hair bg-card p-3"
            onSubmit={(e) => {
              e.preventDefault();
              balas.mutate();
            }}
          >
            <label htmlFor={`balas-${komentar.id}`} className="sr-only">
              Tulis tanggapan
            </label>
            <textarea
              id={`balas-${komentar.id}`}
              rows={2}
              value={teksBalas}
              onChange={(e) => setTeksBalas(e.target.value)}
              placeholder={`Tanggapi ${komentar.penulis_nama}…`}
              className="w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
            />
            <div className="mt-2 flex gap-2">
              <Tombol type="submit" disabled={balas.isPending || teksBalas.trim().length < 2}>
                {balas.isPending ? "Mengirim…" : "Kirim tanggapan"}
              </Tombol>
              <Tombol type="button" varian="sekunder" onClick={() => setBukaBalas(false)}>
                Batal
              </Tombol>
            </div>
          </form>
        )}

        {komentar.balasan.length > 0 && (
          <ul className="mt-1 flex list-none flex-col border-l-2 border-border-hair pl-2 p-0 sm:pl-3">
            {komentar.balasan.map((b) => (
              <li key={b.id} className="min-w-0 animate-fade-in">
                <Gelembung
                  komentar={b}
                  notulensiId={notulensiId}
                  saya={saya}
                  onSegarkan={onSegarkan}
                  balasan
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Tampilan masukan untuk halaman notulensi umum. */
export function KolomKomentarPublik({ notulensiId }: { notulensiId: string }) {
  return <KolomKomentar notulensiId={notulensiId} />;
}
