import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JudulHalaman, useSesiAktif } from "@/components/tata-letak-pengurus";
import { PanelRapikanAi } from "@/components/panel-rapikan-ai";
import { UnggahSatuNotulensi } from "@/components/unggah-satu-notulensi";
import { EditorKaya } from "@/components/editor-kaya";
import type { HasilRapi } from "@/lib/ai.functions";
import { adalahHtml, bersihkanHtml, teksKeHtml } from "@/lib/teks-kaya";
import { LencanaPublikasi } from "@/components/lencana-status";
import { Tombol } from "@/components/tombol";
import { MenuBerbagiWa } from "@/components/menu-berbagi-wa";
import { KolomKomentar } from "@/components/komentar";
import { tandaiNotulensiDibaca } from "@/lib/notifikasi-api";
import {
  ambilDaftarPengurus,
  ambilSatuNotulensi,
  ambilSemuaNotulensi,
  catatLog,
  hapusNotulensi,
  simpanNotulensi,
  type BarisPeserta,
  type BarisTindakLanjut,
  type IsianNotulensi,
} from "@/lib/notulensi-api";
import {
  formatWaktuLengkap,
  lewatTenggat,
  pengurusHarian,
  type KehadiranPeserta,
  type Notulensi,
  type StatusTindakLanjut,
  type TampilHalUrgen,
} from "@/lib/notulensi-types";

export const Route = createFileRoute("/_authenticated/admin/notulensi/$id")({
  head: () => ({
    meta: [
      { title: "Kelola Notulensi — Yayasan Al Madinah Surakarta" },
      { name: "description", content: "Membuat dan memperbarui notulensi rapat Yayasan Al Madinah Surakarta." },
      { property: "og:title", content: "Kelola Notulensi — Yayasan Al Madinah Surakarta" },
      { property: "og:description", content: "Membuat dan memperbarui notulensi rapat Yayasan Al Madinah Surakarta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditorNotulensi,
});

const isianKosong: IsianNotulensi = {
  tanggal: new Date().toISOString().slice(0, 10),
  waktu_mulai: "",
  waktu_selesai: "",
  tempat: "",
  pemimpin: "",
  notulis: "",
  tema: "",
  pembahasan: "",
  keputusan: "",
  hal_urgen: "",
  hal_urgen_tampil: "tidak",
  anggaran: "",
  link_lampiran: "",
  induk_id: "",
  tindak_lanjut: [],
  peserta: [],
};

function dariNotulensi(n: Notulensi): IsianNotulensi {
  return {
    id: n.id,
    tanggal: n.tanggal,
    waktu_mulai: n.waktu_mulai?.slice(0, 5) ?? "",
    waktu_selesai: n.waktu_selesai?.slice(0, 5) ?? "",
    tempat: n.tempat ?? "",
    pemimpin: n.pemimpin ?? "",
    notulis: n.notulis ?? "",
    tema: n.tema,
    pembahasan: n.pembahasan,
    keputusan: n.keputusan ?? "",
    hal_urgen: n.hal_urgen ?? "",
    hal_urgen_tampil: n.hal_urgen_tampil,
    anggaran: n.anggaran === null ? "" : String(n.anggaran),
    link_lampiran: n.link_lampiran ?? "",
    induk_id: n.induk_id ?? "",
    tindak_lanjut: n.tindak_lanjut.map((t) => ({
      tugas: t.tugas,
      pj_nama: t.pj_nama ?? "",
      deadline: t.deadline ?? "",
      status: t.status,
    })),
    peserta: n.peserta.map((p) => ({
      nama: p.nama,
      jabatan: p.jabatan ?? "",
      kehadiran: p.kehadiran,
    })),
  };
}

/** Menuangkan hasil AI ke formulir tanpa menghapus isian yang sudah diisi manual. */
function terapkanHasilAi(sebelum: IsianNotulensi, h: HasilRapi): IsianNotulensi {
  const pilih = (lama: string, baru: string) => (baru !== "" ? baru : lama);
  return {
    ...sebelum,
    tema: pilih(sebelum.tema, h.tema),
    tanggal: h.tanggal !== "" ? h.tanggal : sebelum.tanggal,
    waktu_mulai: pilih(sebelum.waktu_mulai, h.waktuMulai),
    waktu_selesai: pilih(sebelum.waktu_selesai, h.waktuSelesai),
    tempat: pilih(sebelum.tempat, h.tempat),
    pemimpin: pilih(sebelum.pemimpin, h.pemimpin),
    notulis: pilih(sebelum.notulis, h.notulis),
    pembahasan: h.pembahasan !== "" ? h.pembahasan : sebelum.pembahasan,
    keputusan: pilih(sebelum.keputusan, h.keputusan),
    hal_urgen: pilih(sebelum.hal_urgen, h.halUrgen),
    hal_urgen_tampil:
      h.halUrgen !== "" && sebelum.hal_urgen_tampil === "tidak" ? "disorot" : sebelum.hal_urgen_tampil,
    anggaran: h.anggaran !== null ? String(h.anggaran) : sebelum.anggaran,
    tindak_lanjut: [
      ...sebelum.tindak_lanjut,
      ...h.tindakLanjut.map((t) => ({
        tugas: t.tugas,
        pj_nama: t.pjNama,
        pj_id: t.pjId,
        deadline: t.deadline,
        status: "Belum dibahas" as StatusTindakLanjut,
      })),
    ],
    peserta: [
      ...sebelum.peserta,
      ...h.peserta.map((p) => ({
        nama: p.nama,
        jabatan: p.jabatan,
        kehadiran: p.kehadiran as KehadiranPeserta,
      })),
    ],
  };
}

function EditorNotulensi() {
  const { id } = Route.useParams();
  const baru = id === "baru";
  const sesi = useSesiAktif();
  const approver = sesi.peran === "approver";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: asli, isPending } = useQuery({
    queryKey: ["notulensi", id],
    queryFn: () => ambilSatuNotulensi(id),
    enabled: !baru,
  });
  const { data: semua } = useQuery({ queryKey: ["notulensi-semua"], queryFn: ambilSemuaNotulensi });
  const { data: pengurus } = useQuery({
    queryKey: ["daftar-pengurus"],
    queryFn: ambilDaftarPengurus,
  });

  const [isian, setIsian] = useState<IsianNotulensi>(isianKosong);
  const [sibuk, setSibuk] = useState(false);

  // Menandai notulensi ini sudah dibaca oleh pengurus yang sedang membuka.
  useEffect(() => {
    if (baru) return;
    void tandaiNotulensiDibaca(id).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["bacaan-notulensi"] });
    });
  }, [baru, id, queryClient]);


  useEffect(() => {
    if (baru) {
      if (typeof window === "undefined") return;
      const tempel = sessionStorage.getItem("notulensi-tempel");
      const hasilAi = sessionStorage.getItem("notulensi-ai");
      sessionStorage.removeItem("notulensi-tempel");
      sessionStorage.removeItem("notulensi-ai");
      if (hasilAi) {
        try {
          setIsian(terapkanHasilAi(isianKosong, JSON.parse(hasilAi) as HasilRapi));
          return;
        } catch {
          /* abaikan, pakai teks mentah */
        }
      }
      if (tempel) setIsian({ ...isianKosong, pembahasan: tempel });
    } else if (asli) {
      setIsian(dariNotulensi(asli));
    }
  }, [baru, asli]);

  const status = asli?.status_publikasi ?? "draft";
  const rapatLain = useMemo(
    () => (semua ?? []).filter((n) => n.id !== asli?.id),
    [semua, asli?.id],
  );
  const rapatLanjutan = useMemo(
    () => (semua ?? []).filter((n) => asli && n.induk_id === asli.id),
    [semua, asli],
  );

  function ubah<K extends keyof IsianNotulensi>(kunci: K, nilai: IsianNotulensi[K]) {
    setIsian((s) => ({ ...s, [kunci]: nilai }));
  }

  async function jalankan(
    label: string,
    perubahan: Parameters<typeof simpanNotulensi>[1],
    aksiLog: string,
    ringkasan: string,
  ) {
    if (isian.tema.trim() === "") {
      toast.error("Tema rapat wajib diisi");
      return;
    }
    setSibuk(true);
    try {
      const idBaru = await simpanNotulensi(isian, perubahan);
      await catatLog(aksiLog, "notulensi", idBaru, ringkasan);
      await queryClient.invalidateQueries();
      toast.success(label);
      if (baru) navigate({ to: "/admin/notulensi/$id", params: { id: idBaru }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSibuk(false);
    }
  }

  function tarikTugasInduk() {
    const induk = (semua ?? []).find((n) => n.id === isian.induk_id);
    if (!induk) {
      toast.error("Pilih rapat induk terlebih dahulu");
      return;
    }
    const belum = induk.tindak_lanjut
      .filter((t) => t.status !== "Sudah dibahas")
      .map((t) => ({
        tugas: t.tugas,
        pj_nama: t.pj_nama ?? "",
        deadline: t.deadline ?? "",
        status: t.status as StatusTindakLanjut,
      }));
    if (belum.length === 0) {
      toast.info("Tidak ada tugas yang belum selesai di rapat induk");
      return;
    }
    setIsian((s) => ({ ...s, tindak_lanjut: [...s.tindak_lanjut, ...belum] }));
    toast.success(`${belum.length} tugas disalin dari rapat induk`);
  }

  async function hapus() {
    if (!asli) return;
    if (!window.confirm("Pindahkan notulensi ini ke tempat sampah?")) return;
    await hapusNotulensi(asli.id);
    await queryClient.invalidateQueries();
    toast.success("Notulensi dipindahkan ke tempat sampah");
    navigate({ to: "/admin" });
  }

  if (!baru && isPending) {
    return <p className="text-base text-muted-foreground">Sedang memuat notulensi…</p>;
  }

  return (
    <div className="pb-40">
      <JudulHalaman
        judul={baru ? "Notulensi baru" : "Ubah notulensi"}
        keterangan={asli?.nomor ? `Nomor notulen ${asli.nomor}` : "Nomor terbit otomatis saat notulensi diterbitkan."}
        aksi={<LencanaPublikasi status={status} />}
      />

      {asli?.catatan_penolakan && (
        <p className="mb-6 rounded-xl bg-status-danger-bg p-4 text-base text-status-danger-fg">
          Catatan penolakan: {asli.catatan_penolakan}
        </p>
      )}

      <Bagian judul="0. Masukkan catatan notulensi">
        {baru && approver && (
          <div className="mb-6">
            <UnggahSatuNotulensi
              onHasil={(hasil) => setIsian((s) => terapkanHasilAi(s, hasil))}
              onTanpaAi={(mentah) =>
                setIsian((s) => {
                  const tambahan = adalahHtml(mentah) ? bersihkanHtml(mentah) : teksKeHtml(mentah);
                  const lama = s.pembahasan.trim();
                  const lamaHtml = lama === "" ? "" : adalahHtml(lama) ? bersihkanHtml(lama) : teksKeHtml(lama);
                  return { ...s, pembahasan: lamaHtml === "" ? tambahan : `${lamaHtml}${tambahan}` };
                })
              }
            />
            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border-hair" />
              <span className="text-sm font-semibold text-muted-foreground">atau tempel catatan</span>
              <span className="h-px flex-1 bg-border-hair" />
            </div>
          </div>
        )}
        <PanelRapikanAi
          keterangan="Tempelkan catatan kasar rapat ini. Hasil AI langsung mengisi formulir di bawah agar Anda periksa dan koreksi lebih dulu — tidak ada yang tersimpan sebelum Anda menekan Simpan."
          onHasil={(hasil) => setIsian((s) => terapkanHasilAi(s, hasil))}
          onTanpaAi={(mentah) =>
            setIsian((s) => {
              const tambahan = adalahHtml(mentah) ? bersihkanHtml(mentah) : teksKeHtml(mentah);
              const lama = s.pembahasan.trim();
              const lamaHtml = lama === "" ? "" : adalahHtml(lama) ? bersihkanHtml(lama) : teksKeHtml(lama);
              return { ...s, pembahasan: lamaHtml === "" ? tambahan : `${lamaHtml}${tambahan}` };
            })
          }
          labelTanpaAi="Masukkan apa adanya ke pembahasan"
        />
      </Bagian>

      <Bagian judul="1. Identitas rapat">
        <div className="grid gap-4 sm:grid-cols-2">
          <Teks label="Tanggal" tipe="date" nilai={isian.tanggal} ubah={(v) => ubah("tanggal", v)} />
          <Teks
            label="Waktu mulai"
            tipe="time"
            nilai={isian.waktu_mulai}
            ubah={(v) => ubah("waktu_mulai", v)}
          />
          <Teks
            label="Waktu selesai"
            tipe="time"
            nilai={isian.waktu_selesai}
            ubah={(v) => ubah("waktu_selesai", v)}
          />
          <Teks label="Tempat" nilai={isian.tempat} ubah={(v) => ubah("tempat", v)} />
          <Teks label="Pemimpin rapat" nilai={isian.pemimpin} ubah={(v) => ubah("pemimpin", v)} />
          <Teks label="Notulis" nilai={isian.notulis} ubah={(v) => ubah("notulis", v)} />
          <Teks label="Tema rapat" wajib nilai={isian.tema} ubah={(v) => ubah("tema", v)} />
          <Teks
            label="Anggaran (rupiah)"
            tipe="number"
            nilai={isian.anggaran}
            ubah={(v) => ubah("anggaran", v)}
          />
          <Teks
            label="Link lampiran"
            nilai={isian.link_lampiran}
            ubah={(v) => ubah("link_lampiran", v)}
          />
        </div>
      </Bagian>

      <Bagian judul="2. Rantai rapat">
        <label className="block text-base font-semibold">
          Kelanjutan dari rapat
          <select
            value={isian.induk_id}
            onChange={(e) => ubah("induk_id", e.target.value)}
            className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base font-normal"
          >
            <option value="">Bukan kelanjutan rapat mana pun</option>
            {rapatLain.map((n) => (
              <option key={n.id} value={n.id}>
                {n.tanggal} — {n.tema}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          <Tombol varian="sekunder" type="button" onClick={tarikTugasInduk}>
            Tarik tugas yang belum selesai dari rapat induk
          </Tombol>
        </div>
        {rapatLanjutan.length > 0 && (
          <div className="mt-5">
            <p className="text-base font-semibold">Rapat lanjutan dari notulensi ini:</p>
            <ul className="mt-2 flex list-none flex-col gap-1 p-0">
              {rapatLanjutan.map((n) => (
                <li key={n.id}>
                  <Link
                    to="/admin/notulensi/$id"
                    params={{ id: n.id }}
                    className="text-base font-semibold text-primary"
                  >
                    {n.tanggal} — {n.tema}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Bagian>

      <Bagian judul="3. Pembahasan">
        <EditorKaya
          key={`pembahasan-${id}`}
          nilai={isian.pembahasan}
          onChange={(html) => ubah("pembahasan", html)}
          label="Isi pembahasan rapat"
        />
      </Bagian>

      <Bagian judul="3b. Hasil / Keputusan Rapat">
        <textarea
          value={isian.keputusan}
          onChange={(e) => ubah("keputusan", e.target.value)}
          rows={7}
          className="w-full rounded-lg border-2 border-border-field bg-background px-4 py-3 text-base"
          aria-label="Hasil atau keputusan rapat"
        />
      </Bagian>

      <Bagian judul="4. Hal mendesak">
        <textarea
          value={isian.hal_urgen}
          onChange={(e) => ubah("hal_urgen", e.target.value)}
          rows={3}
          className="w-full rounded-lg border-2 border-border-field bg-background px-4 py-3 text-base"
          aria-label="Hal mendesak"
        />
        <label className="mt-4 block text-base font-semibold">
          Tampilkan di portal tamu
          <select
            value={isian.hal_urgen_tampil}
            onChange={(e) => ubah("hal_urgen_tampil", e.target.value as TampilHalUrgen)}
            className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base font-normal sm:w-80"
          >
            <option value="tidak">Tidak</option>
            <option value="disorot">Disorot</option>
            <option value="teks_berjalan">Teks berjalan</option>
          </select>
        </label>
      </Bagian>

      <Bagian judul="5. Tindak lanjut">
        <div className="tabel-gulir">
          <table className="w-full min-w-[56rem] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-border-hair">
                {["Tugas", "Penanggung jawab", "Batas waktu", "Status", ""].map((h, i) => (
                  <th key={i} className={`${i === 0 ? "w-[36%]" : i === 1 ? "w-[20%]" : i === 4 ? "w-24" : "w-[16%]"} px-3 py-2 text-sm font-semibold text-muted-foreground`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isian.tindak_lanjut.map((t, i) => {
                const merah = lewatTenggat({
                  id: "",
                  urutan: i,
                  tugas: t.tugas,
                  pj_nama: t.pj_nama,
                  deadline: t.deadline || null,
                  status: t.status,
                  catatan: null,
                });
                function ubahBaris(patch: Partial<BarisTindakLanjut>) {
                  setIsian((s) => ({
                    ...s,
                    tindak_lanjut: s.tindak_lanjut.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                  }));
                }
                return (
                  <tr key={i} className={merah ? "bg-status-danger-bg" : ""}>
                    <td className="px-3 py-2">
                      <textarea
                        aria-label={`Tugas baris ${i + 1}`}
                        value={t.tugas}
                        onChange={(e) => ubahBaris({ tugas: e.target.value })}
                        rows={3}
                        placeholder="Tuliskan tugas secara jelas dan lengkap"
                        className="min-h-24 w-full resize-y rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base leading-6"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Penanggung jawab baris ${i + 1}`}
                        list="daftar-pj"
                        value={t.pj_nama}
                        onChange={(e) => ubahBaris({ pj_nama: e.target.value })}
                        className="min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Batas waktu baris ${i + 1}`}
                        type="date"
                        value={t.deadline}
                        onChange={(e) => ubahBaris({ deadline: e.target.value })}
                        className="min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Status baris ${i + 1}`}
                        value={t.status}
                        onChange={(e) =>
                          ubahBaris({ status: e.target.value as StatusTindakLanjut })
                        }
                        className="min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
                      >
                        <option>Belum dibahas</option>
                        <option>Butuh Tindak Lanjut</option>
                        <option>Sudah dibahas</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Tombol
                        varian="bahaya"
                        type="button"
                        onClick={() =>
                          setIsian((s) => ({
                            ...s,
                            tindak_lanjut: s.tindak_lanjut.filter((_, j) => j !== i),
                          }))
                        }
                      >
                        Hapus
                      </Tombol>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id="daftar-pj">
          {(pengurus ?? []).map((p) => (
            <option key={p.id} value={p.nama_lengkap} />
          ))}
        </datalist>
        <div className="mt-4">
          <Tombol
            varian="sekunder"
            type="button"
            onClick={() =>
              setIsian((s) => ({
                ...s,
                tindak_lanjut: [
                  ...s.tindak_lanjut,
                  { tugas: "", pj_nama: "", deadline: "", status: "Belum dibahas" },
                ],
              }))
            }
          >
            Tambah baris tindak lanjut
          </Tombol>
        </div>
      </Bagian>

      <Bagian judul="6. Daftar hadir">
        <fieldset className="mb-6 rounded-xl border border-border-hair bg-surface-2 p-4">
          <legend className="px-1 text-base font-semibold">
            Pengurus Harian Yayasan — centang yang hadir
          </legend>
          <p className="mt-1 text-sm text-muted-foreground">
            Mencentang nama akan menambahkannya ke tabel di bawah. Kehadiran (Hadir/Izin/Tidak
            Hadir) bisa diubah pada tabel tersebut.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pengurusHarian.map((o) => {
              const terpilih = isian.peserta.some((p) => p.nama.trim() === o.nama);
              return (
                <label
                  key={o.nama}
                  className="flex min-h-[2.75rem] items-center gap-3 rounded-lg bg-card px-3 py-2 text-base"
                >
                  <input
                    type="checkbox"
                    className="h-6 w-6"
                    checked={terpilih}
                    onChange={(e) =>
                      setIsian((s) =>
                        e.target.checked
                          ? {
                              ...s,
                              peserta: [
                                ...s.peserta,
                                { nama: o.nama, jabatan: o.jabatan, kehadiran: "Hadir" },
                              ],
                            }
                          : {
                              ...s,
                              peserta: s.peserta.filter((p) => p.nama.trim() !== o.nama),
                            },
                      )
                    }
                  />
                  <span>
                    {o.nama}
                    <span className="block text-sm text-muted-foreground">{o.jabatan}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Tombol
              varian="sekunder"
              type="button"
              onClick={() =>
                setIsian((s) => ({
                  ...s,
                  peserta: [
                    ...s.peserta,
                    ...pengurusHarian
                      .filter((o) => !s.peserta.some((p) => p.nama.trim() === o.nama))
                      .map((o) => ({
                        nama: o.nama,
                        jabatan: o.jabatan,
                        kehadiran: "Hadir" as KehadiranPeserta,
                      })),
                  ],
                }))
              }
            >
              Centang semua
            </Tombol>
            <Tombol
              varian="sekunder"
              type="button"
              onClick={() =>
                setIsian((s) => ({
                  ...s,
                  peserta: s.peserta.filter(
                    (p) => !pengurusHarian.some((o) => o.nama === p.nama.trim()),
                  ),
                }))
              }
            >
              Kosongkan centang
            </Tombol>
          </div>
        </fieldset>

        <h3 className="mb-3 text-lg">Tabel kehadiran</h3>
        <div className="tabel-gulir">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border-hair">
                {["Nama", "Jabatan", "Kehadiran", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isian.peserta.map((p, i) => {
                function ubahBaris(patch: Partial<BarisPeserta>) {
                  setIsian((s) => ({
                    ...s,
                    peserta: s.peserta.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                  }));
                }
                return (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Nama peserta ${i + 1}`}
                        value={p.nama}
                        onChange={(e) => ubahBaris({ nama: e.target.value })}
                        className="min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Jabatan peserta ${i + 1}`}
                        value={p.jabatan}
                        onChange={(e) => ubahBaris({ jabatan: e.target.value })}
                        className="min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Kehadiran peserta ${i + 1}`}
                        value={p.kehadiran}
                        onChange={(e) =>
                          ubahBaris({ kehadiran: e.target.value as KehadiranPeserta })
                        }
                        className="min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base"
                      >
                        <option>Hadir</option>
                        <option>Izin</option>
                        <option>Tidak Hadir</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Tombol
                        varian="bahaya"
                        type="button"
                        onClick={() =>
                          setIsian((s) => ({
                            ...s,
                            peserta: s.peserta.filter((_, j) => j !== i),
                          }))
                        }
                      >
                        Hapus
                      </Tombol>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Tombol
            varian="sekunder"
            type="button"
            onClick={() =>
              setIsian((s) => ({
                ...s,
                peserta: [...s.peserta, { nama: "", jabatan: "", kehadiran: "Hadir" }],
              }))
            }
          >
            Tambah peserta lain (bidang di bawah yayasan)
          </Tombol>
        </div>
      </Bagian>

      {!baru && asli && (
        <div className="mb-8 rounded-xl border border-border-hair bg-card p-5">
          <KolomKomentar notulensiId={asli.id} />

        </div>
      )}

      <Bagian judul="7. Jejak">
        <p className="text-sm text-muted-foreground">
          Dibuat {formatWaktuLengkap(asli?.dibuat_pada ?? null)} oleh {asli?.dibuat_oleh ?? sesi.email} ·
          Terakhir diubah {formatWaktuLengkap(asli?.diubah_pada ?? null)}
          {asli?.diubah_oleh ? ` oleh ${asli.diubah_oleh}` : ""} · Disetujui oleh{" "}
          {asli?.disetujui_oleh ?? "belum disetujui"}
        </p>
      </Bagian>

      <div className="kaca fixed inset-x-0 bottom-0 z-30 max-h-[45vh] overflow-y-auto border-t-2 border-border-field bg-card px-4 py-3 print:hidden">
        <div className="mx-auto grid w-full max-w-[80rem] grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">

          <Tombol
            disabled={sibuk}
            onClick={() =>
              jalankan(
                "Notulensi tersimpan dan terbit",
                { status_publikasi: "terbit", visibilitas: "publik", catatan_penolakan: null },
                baru ? "buat" : "ubah",
                `Notulensi "${isian.tema}" disimpan dan terbit`,
              )
            }
          >
            Simpan &amp; terbitkan
          </Tombol>

          <Tombol
            varian="sekunder"
            disabled={sibuk}
            onClick={() =>
              jalankan(
                "Notulensi tersimpan",
                {},
                baru ? "buat" : "ubah",
                `Notulensi "${isian.tema}" disimpan`,
              )
            }
          >
            Simpan tanpa terbit
          </Tombol>


          {!baru && asli && (
            <>
              <MenuBerbagiWa
                dapatkan={() => ambilSatuNotulensi(asli.id)}
                kontak={(pengurus ?? []).map((p) => ({ nama: p.nama_lengkap, no_wa: p.no_wa }))}
              />
              <Link
                to="/cetak/$id"
                params={{ id: asli.id }}
                target="_blank"
                className="inline-flex min-h-[2.75rem] items-center rounded-lg border-2 border-border-field bg-card px-5 py-2.5 text-base font-semibold text-primary no-underline hover:bg-muted"
              >
                Cetak / PDF
              </Link>
            </>
          )}

          {approver && !baru && (
            <Tombol varian="bahaya" type="button" onClick={hapus}>
              Hapus
            </Tombol>
          )}
        </div>
      </div>

    </div>
  );
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-xl border border-border-hair bg-card p-5">
      <h2 className="mb-4 border-b border-border-hair pb-3 text-xl text-primary">
        {judul}
      </h2>
      {children}
    </section>
  );
}

function Teks({
  label,
  nilai,
  ubah,
  tipe = "text",
  wajib,
}: {
  label: string;
  nilai: string;
  ubah: (v: string) => void;
  tipe?: string;
  wajib?: boolean;
}) {
  return (
    <label className="block text-base font-semibold">
      {label}
      {wajib && <span className="text-destructive"> (wajib)</span>}
      <input
        type={tipe}
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-4 py-2 text-base font-normal"
      />
    </label>
  );
}
