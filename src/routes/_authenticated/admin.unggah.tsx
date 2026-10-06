import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { JudulHalaman } from "@/components/tata-letak-pengurus";
import { Tombol } from "@/components/tombol";
import { rapikanNotulensi, type HasilRapi } from "@/lib/ai.functions";
import {
  BATAS_BERKAS,
  BerkasError,
  KETERANGAN_TIPE,
  bacaTeksBerkas,
  tipeDidukung,
} from "@/lib/baca-berkas";
import {
  deteksiTanggal,
  kemiripan,
  labelKeyakinan,
  tebakTema,
  type Keyakinan,
} from "@/lib/deteksi-tanggal";
import { ambilRingkasNotulensi, simpanBerkasSebagaiDraf } from "@/lib/unggah-api";
import { formatTanggal } from "@/lib/notulensi-types";

export const Route = createFileRoute("/_authenticated/admin/unggah")({
  component: HalamanUnggah,
});

type Baris = {
  kunci: string;
  berkas: File;
  teks: string;
  tanggal: string;
  keyakinan: Keyakinan;
  cuplikan: string;
  tema: string;
  hasil: HasilRapi | null;
  galat: string;
  lewati: boolean;
  duplikat: { id: string; tema: string; tanggal: string } | null;
  simpan: "menunggu" | "berhasil" | "gagal";
  pesanSimpan: string;
};

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const warnaKeyakinan: Record<Keyakinan, string> = {
  tinggi: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  sedang: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  rendah: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  tidak: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

function HalamanUnggah() {
  const navigate = useNavigate();
  const jalankanAi = useServerFn(rapikanNotulensi);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"berkas" | "tempel">("berkas");
  const [batasMb, setBatasMb] = useState(25);
  const [pakaiAi, setPakaiAi] = useState(true);
  const [fase, setFase] = useState<"pilih" | "baca" | "tinjau" | "simpan" | "selesai">("pilih");
  const [progres, setProgres] = useState({ selesai: 0, total: 0, nama: "" });
  const [baris, setBaris] = useState<Baris[]>([]);

  /* ------------------------------ mode berkas ------------------------------ */

  async function pilihBerkas(daftar: FileList | null) {
    if (!daftar || daftar.length === 0) return;
    const semua = Array.from(daftar);

    if (semua.length > BATAS_BERKAS) {
      toast.error(`Maksimal ${BATAS_BERKAS} berkas sekali unggah. Bagi menjadi beberapa kali.`);
      return;
    }

    const lama = await ambilRingkasNotulensi().catch(() => []);

    setFase("baca");
    setProgres({ selesai: 0, total: semua.length, nama: "" });
    const kumpulan: Baris[] = [];
    let galatAi = "";


    for (let i = 0; i < semua.length; i++) {
      const berkas = semua[i]!;
      setProgres({ selesai: i, total: semua.length, nama: berkas.name });

      const dasar: Baris = {
        kunci: `${berkas.name}-${i}`,
        berkas,
        teks: "",
        tanggal: "",
        keyakinan: "tidak",
        cuplikan: "",
        tema: "",
        hasil: null,
        galat: "",
        lewati: false,
        duplikat: null,
        simpan: "menunggu",
        pesanSimpan: "",
      };

      if (!tipeDidukung(berkas.name)) {
        kumpulan.push({
          ...dasar,
          galat: `Tipe berkas ini tidak didukung. Terima ${KETERANGAN_TIPE}.`,
          lewati: true,
        });
        setBaris([...kumpulan]);
        continue;
      }
      if (berkas.size > batasMb * 1024 * 1024) {
        kumpulan.push({
          ...dasar,
          galat: `Ukuran berkas ${(berkas.size / 1024 / 1024).toFixed(1)} MB melebihi batas ${batasMb} MB.`,
          lewati: true,
        });
        setBaris([...kumpulan]);
        continue;
      }

      let teks = "";
      try {
        teks = await bacaTeksBerkas(berkas);
      } catch (e) {
        kumpulan.push({
          ...dasar,
          galat: e instanceof BerkasError ? e.message : "Berkas gagal dibaca.",
          lewati: true,
        });
        setBaris([...kumpulan]);
        continue;
      }

      // Lapis 1, 2, dan 4
      let { tanggal, keyakinan, cuplikan } = deteksiTanggal(teks, berkas.name);
      let tema = tebakTema(teks);
      let hasil: HasilRapi | null = null;

      // Lapis 3 — keluaran AI, satu permintaan per berkas
      if (pakaiAi) {
        try {
          const balasan = await jalankanAi({ data: { teks: teks.slice(0, 40000) } });
          if (balasan.ok) {
            hasil = balasan.hasil;
            if (hasil.tema.trim()) tema = hasil.tema.trim();
            if (hasil.tanggal && (keyakinan === "tidak" || keyakinan === "rendah")) {
              tanggal = hasil.tanggal;
              keyakinan = "sedang";
              cuplikan = "Dikuatkan AI dari isi dokumen";
            }
          } else if (!galatAi) {
            galatAi = balasan.pesan;
          }
        } catch (e) {
          // AI gagal untuk berkas ini — berkas tetap diproses tanpa AI
          if (!galatAi) galatAi = e instanceof Error ? e.message : "AI gagal dihubungi.";
        }
      }


      const mirip = lama.find(
        (n) => n.tanggal === tanggal && tanggal !== "" && kemiripan(n.tema, tema) > 0.7,
      );

      kumpulan.push({
        ...dasar,
        teks,
        tanggal,
        keyakinan,
        cuplikan,
        tema: tema || berkas.name.replace(/\.[a-z0-9]+$/i, ""),
        hasil,
        duplikat: mirip ? { id: mirip.id, tema: mirip.tema, tanggal: mirip.tanggal } : null,
        lewati: Boolean(mirip),
      });
      setBaris([...kumpulan]);
    }

    setProgres({ selesai: semua.length, total: semua.length, nama: "" });
    setFase("tinjau");
    if (galatAi) {
      toast.error(`AI tidak dapat merapikan berkas: ${galatAi} Isi berkas tetap dipakai apa adanya.`);
    }
    if (inputRef.current) inputRef.current.value = "";

  }

  function ubahBaris(kunci: string, perubahan: Partial<Baris>) {
    setBaris((s) => s.map((b) => (b.kunci === kunci ? { ...b, ...perubahan } : b)));
  }

  const siapSimpan = baris.filter((b) => !b.lewati && !b.galat && b.tanggal !== "");
  const wajibIsi = baris.filter((b) => !b.lewati && !b.galat && b.tanggal === "");

  async function simpanSemua() {
    if (wajibIsi.length > 0) {
      toast.error("Masih ada berkas tanpa tanggal. Isi tanggalnya dahulu atau lewati berkas itu.");
      return;
    }
    setFase("simpan");
    setProgres({ selesai: 0, total: siapSimpan.length, nama: "" });

    let i = 0;
    for (const b of siapSimpan) {
      setProgres({ selesai: i, total: siapSimpan.length, nama: b.berkas.name });
      try {
        await simpanBerkasSebagaiDraf({
          berkas: b.berkas,
          tanggal: b.tanggal,
          tema: b.tema,
          pembahasan: b.hasil?.pembahasan?.trim() || b.teks,
          hasil: b.hasil,
        });
        ubahBaris(b.kunci, { simpan: "berhasil", pesanSimpan: "Tersimpan sebagai draf" });
      } catch (e) {
        ubahBaris(b.kunci, {
          simpan: "gagal",
          pesanSimpan: e instanceof Error ? e.message : "Gagal disimpan",
        });
      }
      i++;
      setProgres({ selesai: i, total: siapSimpan.length, nama: "" });
    }
    setFase("selesai");
    toast.success("Proses unggah selesai. Periksa hasilnya di daftar notulensi.");
  }

  /* ------------------------------ ringkasan ------------------------------- */

  const ringkasan = useMemo(() => {
    const perTahun = new Map<string, number>();
    let tanpa = 0;
    for (const b of baris) {
      if (b.galat) continue;
      if (!b.tanggal) tanpa++;
      else {
        const th = b.tanggal.slice(0, 4);
        perTahun.set(th, (perTahun.get(th) ?? 0) + 1);
      }
    }
    const bagian = [...perTahun.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([th, n]) => `${th}: ${n}`);
    if (tanpa > 0) bagian.push(`tanpa tanggal: ${tanpa}`);
    return `${baris.length} berkas terbaca — ${bagian.join(" · ") || "belum ada tanggal"}`;
  }, [baris]);

  const kelompok = useMemo(() => {
    const peta = new Map<string, Baris[]>();
    for (const b of baris) {
      const kunci = b.tanggal ? b.tanggal.slice(0, 7) : "zzzz";
      peta.set(kunci, [...(peta.get(kunci) ?? []), b]);
    }
    return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [baris]);

  function judulKelompok(kunci: string): string {
    if (kunci === "zzzz") return "Tanpa tanggal — wajib diisi manual";
    const [th, bl] = kunci.split("-");
    return `${NAMA_BULAN[Number(bl) - 1] ?? ""} ${th}`;
  }

  /* -------------------------------- tempel -------------------------------- */

  const [teksTempel, setTeksTempel] = useState("");
  const [tanggalTempel, setTanggalTempel] = useState("");
  const [cuplikanTempel, setCuplikanTempel] = useState("");
  const [jenisRapat, setJenisRapat] = useState("");
  const [prosesTempel, setProsesTempel] = useState(false);

  function tempelBerubah(nilai: string) {
    setTeksTempel(nilai);
    if (nilai.trim().length > 40) {
      const d = deteksiTanggal(nilai);
      if (d.tanggal && d.tanggal !== tanggalTempel) {
        setTanggalTempel(d.tanggal);
        setCuplikanTempel(d.cuplikan);
      }
    }
  }

  function keEditor(hasil: HasilRapi | null, mentah: string) {
    if (hasil) {
      const disesuaikan: HasilRapi = {
        ...hasil,
        tanggal: tanggalTempel || hasil.tanggal,
        tema: hasil.tema || jenisRapat,
      };
      sessionStorage.setItem("notulensi-ai", JSON.stringify(disesuaikan));
    } else {
      sessionStorage.removeItem("notulensi-ai");
    }
    sessionStorage.setItem("notulensi-tempel", mentah);
    navigate({ to: "/admin/notulensi/$id", params: { id: "baru" } });
  }

  async function prosesTempelAi() {
    const isi = teksTempel.trim();
    if (isi.length < 20) {
      toast.error("Tempelkan catatan rapat lebih dahulu.");
      return;
    }
    setProsesTempel(true);
    try {
      const balasan = await jalankanAi({ data: { teks: isi } });
      if (balasan.ok) keEditor(balasan.hasil, isi);
      else {
        toast.error(`${balasan.pesan} Catatan mentah tetap dipakai sebagai draf.`);
        keEditor(null, isi);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI gagal dihubungi.");
      keEditor(null, isi);
    } finally {
      setProsesTempel(false);
    }
  }

  /* --------------------------------- tampil -------------------------------- */

  const sedangProses = fase === "baca" || fase === "simpan";

  return (
    <>
      <JudulHalaman
        judul="Unggah notulensi"
        keterangan="Unggah banyak berkas PDF dan Word sekaligus, atau tempelkan catatan rapat. Setiap berkas dipilah menurut tanggal yang tertulis di dalam notulensinya, dan selalu Anda tinjau dahulu sebelum disimpan."
      />

      <div className="mb-6 flex flex-wrap gap-3" role="tablist" aria-label="Cara mengunggah">
        <Tombol varian={mode === "berkas" ? "utama" : "sekunder"} onClick={() => setMode("berkas")}>
          Banyak berkas
        </Tombol>
        <Tombol varian={mode === "tempel" ? "utama" : "sekunder"} onClick={() => setMode("tempel")}>
          Tempel teks
        </Tombol>
      </div>

      {mode === "berkas" && (
        <section className="space-y-6">
          {fase === "pilih" && (
            <div className="rounded-lg border-2 border-border-field p-5">
              <label htmlFor="berkas" className="block text-base font-semibold">
                Pilih berkas notulensi
              </label>
              <p className="mt-1 text-base text-muted-foreground">
                Bisa {KETERANGAN_TIPE}. Maksimal {BATAS_BERKAS} berkas sekali unggah.
              </p>
              <input
                ref={inputRef}
                id="berkas"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.rtf"
                onChange={(e) => void pilihBerkas(e.target.files)}
                className="mt-3 block w-full rounded-lg border-2 border-border-field bg-background px-4 py-3 text-base"
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="batas" className="block text-base font-semibold">
                    Batas ukuran satu berkas (MB)
                  </label>
                  <input
                    id="batas"
                    type="number"
                    min={1}
                    max={25}
                    value={batasMb}
                    onChange={(e) => setBatasMb(Number(e.target.value) || 25)}
                    className="mt-2 w-full rounded-lg border-2 border-border-field bg-background px-4 py-3 text-base"
                  />
                </div>
                <div className="flex items-start gap-3 pt-8">
                  <input
                    id="pakai-ai"
                    type="checkbox"
                    checked={pakaiAi}
                    onChange={(e) => setPakaiAi(e.target.checked)}
                    className="mt-1 h-5 w-5"
                  />
                  <label htmlFor="pakai-ai" className="text-base">
                    Rapikan isi tiap berkas dengan AI (lebih lama, hasil tetap ditinjau manusia)
                  </label>
                </div>
              </div>
            </div>
          )}

          {sedangProses && (
            <div className="rounded-lg border-2 border-border-field p-5" aria-live="polite">
              <p className="text-base font-semibold">
                {fase === "baca" ? "Membaca berkas…" : "Menyimpan draf…"} {progres.selesai} dari{" "}
                {progres.total}
              </p>
              {progres.nama && (
                <p className="mt-1 text-base text-muted-foreground">Sedang diproses: {progres.nama}</p>
              )}
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${progres.total ? (progres.selesai / progres.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {baris.length > 0 && (
            <>
              <p className="text-base font-semibold">{ringkasan}</p>

              {kelompok.map(([kunci, isi]) => (
                <div key={kunci} className="space-y-3">
                  <h2 className="text-lg font-semibold">{judulKelompok(kunci)}</h2>
                  {isi.map((b) => (
                    <article
                      key={b.kunci}
                      className={`rounded-lg border-2 border-l-8 p-4 ${
                        b.simpan === "berhasil"
                          ? "border-l-emerald-600 border-border-field"
                          : b.simpan === "gagal" || b.galat
                            ? "border-l-red-600 border-border-field"
                            : b.duplikat
                              ? "border-l-amber-500 border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                              : "border-l-primary border-border-field"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-base font-semibold">{b.berkas.name}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${warnaKeyakinan[b.keyakinan]}`}
                        >
                          Keyakinan: {labelKeyakinan[b.keyakinan]}
                        </span>
                      </div>

                      {b.galat ? (
                        <p className="mt-2 text-base text-red-700 dark:text-red-300">{b.galat}</p>
                      ) : (
                        <>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor={`tgl-${b.kunci}`}
                                className="block text-base font-semibold"
                              >
                                Tanggal rapat
                              </label>
                              <input
                                id={`tgl-${b.kunci}`}
                                type="date"
                                value={b.tanggal}
                                onChange={(e) =>
                                  ubahBaris(b.kunci, {
                                    tanggal: e.target.value,
                                    keyakinan: e.target.value ? "tinggi" : "tidak",
                                    cuplikan: "Diisi manual oleh pengurus",
                                  })
                                }
                                className={`mt-1 w-full rounded-lg border-2 bg-background px-3 py-2 text-base ${
                                  b.tanggal ? "border-border-field" : "border-red-500"
                                }`}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`tema-${b.kunci}`}
                                className="block text-base font-semibold"
                              >
                                Tema rapat
                              </label>
                              <input
                                id={`tema-${b.kunci}`}
                                type="text"
                                value={b.tema}
                                onChange={(e) => ubahBaris(b.kunci, { tema: e.target.value })}
                                className="mt-1 w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
                              />
                            </div>
                          </div>

                          {b.cuplikan && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Tanggal diambil dari: “{b.cuplikan}”
                            </p>
                          )}
                          {!b.tanggal && (
                            <p className="mt-2 text-base text-red-700 dark:text-red-300">
                              Tanggal tidak ditemukan di dalam notulensi. Wajib diisi manual.
                            </p>
                          )}

                          {b.duplikat && (
                            <p className="mt-2 text-base">
                              Kemungkinan sudah ada:{" "}
                              <Link
                                to="/admin/notulensi/$id"
                                params={{ id: b.duplikat.id }}
                                className="underline"
                              >
                                {b.duplikat.tema} ({formatTanggal(b.duplikat.tanggal)})
                              </Link>
                            </p>
                          )}

                          {b.pesanSimpan && (
                            <p className="mt-2 text-base font-semibold">{b.pesanSimpan}</p>
                          )}

                          {fase === "tinjau" && (
                            <div className="mt-3">
                              <Tombol
                                varian="sekunder"
                                onClick={() => ubahBaris(b.kunci, { lewati: !b.lewati })}
                              >
                                {b.lewati ? "Sertakan berkas ini" : "Lewati berkas ini"}
                              </Tombol>
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  ))}
                </div>
              ))}

              {fase === "tinjau" && (
                <div className="sticky bottom-0 flex flex-wrap gap-3 border-t-2 border-border-field bg-background py-4">
                  <Tombol onClick={() => void simpanSemua()} disabled={siapSimpan.length === 0}>
                    Simpan {siapSimpan.length} berkas sebagai draf
                  </Tombol>
                  <Tombol
                    varian="sekunder"
                    onClick={() => {
                      setBaris([]);
                      setFase("pilih");
                    }}
                  >
                    Batalkan dan pilih ulang
                  </Tombol>
                </div>
              )}

              {fase === "selesai" && (
                <div className="flex flex-wrap gap-3 py-4">
                  <Tombol onClick={() => navigate({ to: "/admin" })}>Lihat daftar notulensi</Tombol>
                  <Tombol
                    varian="sekunder"
                    onClick={() => {
                      setBaris([]);
                      setFase("pilih");
                    }}
                  >
                    Unggah berkas lain
                  </Tombol>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {mode === "tempel" && (
        <section className="space-y-4">
          <div>
            <label htmlFor="tempel" className="block text-base font-semibold">
              Catatan mentah rapat
            </label>
            <p className="mt-1 text-base text-muted-foreground">
              AI hanya merapikan susunannya — tidak meringkas dan tidak menambah isi. Hasilnya Anda
              periksa di editor sebelum disimpan.
            </p>
            <textarea
              id="tempel"
              rows={14}
              value={teksTempel}
              onChange={(e) => tempelBerubah(e.target.value)}
              className="mt-2 w-full rounded-lg border-2 border-border-field bg-background px-4 py-3 text-base"
              placeholder="Tempelkan catatan rapat di sini — boleh berantakan, banyak typo, atau tumpang tindih…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tgl-tempel" className="block text-base font-semibold">
                Tanggal rapat
              </label>
              <input
                id="tgl-tempel"
                type="date"
                value={tanggalTempel}
                onChange={(e) => {
                  setTanggalTempel(e.target.value);
                  setCuplikanTempel("Diisi manual oleh pengurus");
                }}
                className="mt-1 w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
              />
              {cuplikanTempel && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Tanggal diambil dari baris: {cuplikanTempel}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="jenis" className="block text-base font-semibold">
                Jenis rapat
              </label>
              <input
                id="jenis"
                type="text"
                value={jenisRapat}
                onChange={(e) => setJenisRapat(e.target.value)}
                placeholder="Rapat Pengurus Harian"
                className="mt-1 w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Tombol
              onClick={() => void prosesTempelAi()}
              disabled={prosesTempel || teksTempel.trim() === ""}
            >
              {prosesTempel ? "Memproses dengan AI…" : "Rapikan dengan AI"}
            </Tombol>
            <Tombol
              varian="sekunder"
              onClick={() => keEditor(null, teksTempel)}
              disabled={prosesTempel || teksTempel.trim() === ""}
            >
              Lanjutkan tanpa AI
            </Tombol>
          </div>
          {prosesTempel && (
            <p aria-live="polite" className="text-base text-muted-foreground">
              Memproses dengan AI… mohon tunggu, jangan menutup halaman ini.
            </p>
          )}
        </section>
      )}
    </>
  );
}
