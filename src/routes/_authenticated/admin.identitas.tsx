import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Image as IkonGambar, FileText, PenLine } from "lucide-react";
import { JudulHalaman, useSesiAktif } from "@/components/tata-letak-pengurus";
import { Tombol } from "@/components/tombol";
import { ambilIdentitas, ambilKop, simpanIdentitas } from "@/lib/identitas.functions";

export const Route = createFileRoute("/_authenticated/admin/identitas")({
  component: HalamanIdentitas,
});

const BATAS_BYTE = 1_000_000;

function bacaSebagaiDataUrl(berkas: File): Promise<string> {
  return new Promise((selesai, gagal) => {
    const pembaca = new FileReader();
    pembaca.onload = () => selesai(String(pembaca.result));
    pembaca.onerror = () => gagal(new Error("Berkas tidak bisa dibaca"));
    pembaca.readAsDataURL(berkas);
  });
}

function HalamanIdentitas() {
  const sesi = useSesiAktif();
  const approver = sesi.peran === "approver";

  const baca = useServerFn(ambilIdentitas);
  const bacaKop = useServerFn(ambilKop);
  const tulis = useServerFn(simpanIdentitas);

  const { data, refetch } = useQuery({ queryKey: ["identitas"], queryFn: () => baca({}) });
  const { data: dataKop, refetch: refetchKop } = useQuery({
    queryKey: ["identitas-kop"],
    queryFn: () => bacaKop({}),
  });

  const [namaYayasan, setNamaYayasan] = useState("");
  const [namaKetua, setNamaKetua] = useState("");
  const [jabatanKetua, setJabatanKetua] = useState("");
  const [namaSekretaris, setNamaSekretaris] = useState("");
  const [jabatanSekretaris, setJabatanSekretaris] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [kop, setKop] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (!data) return;
    setNamaYayasan(data.namaYayasan);
    setNamaKetua(data.namaKetua);
    setJabatanKetua(data.jabatanKetua);
    setNamaSekretaris(data.namaSekretaris);
    setJabatanSekretaris(data.jabatanSekretaris);
    setLogo(data.logo);
  }, [data]);

  useEffect(() => {
    if (dataKop) setKop(dataKop.kop);
  }, [dataKop]);

  async function pilihGambar(berkas: File | undefined, pasang: (v: string) => void) {
    if (!berkas) return;
    if (!berkas.type.startsWith("image/")) {
      toast.error("Pilih berkas gambar (PNG, JPG, WEBP, atau SVG).");
      return;
    }
    if (berkas.size > BATAS_BYTE) {
      toast.error("Ukuran gambar maksimal 1 MB. Perkecil dulu gambarnya.");
      return;
    }
    try {
      pasang(await bacaSebagaiDataUrl(berkas));
      toast.success("Gambar siap disimpan. Tekan Simpan perubahan.");
    } catch {
      toast.error("Gambar tidak bisa dibaca.");
    }
  }

  async function simpan() {
    setSibuk(true);
    try {
      await tulis({
        data: {
          namaYayasan,
          namaKetua,
          jabatanKetua,
          namaSekretaris,
          jabatanSekretaris,
          logo,
          kop,
        },
      });
      await Promise.all([refetch(), refetchKop()]);
      toast.success("Identitas yayasan tersimpan.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan identitas.");
    } finally {
      setSibuk(false);
    }
  }

  const kelasInput =
    "mt-2 w-full rounded-lg border border-border-field bg-background px-4 py-3 text-base disabled:opacity-70";

  return (
    <>
      <JudulHalaman
        judul="Identitas Yayasan"
        keterangan="Ganti logo, kop surat resmi, serta nama penanda tangan tanpa perlu mengubah program. Perubahan langsung dipakai di halaman umum dan dokumen cetak."
      />

      <section className="max-w-2xl rounded-xl border border-border-hair bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl text-primary">
          <IkonGambar aria-hidden="true" className="h-5 w-5" /> Logo yayasan
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Tampil di kepala halaman. Sebaiknya gambar persegi berlatar transparan, maksimal 1 MB.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary p-2 ring-1 ring-gold/40">
            <img
              src={logo ?? "/logo-almadinah.png"}
              alt="Pratinjau logo yayasan"
              className="h-full w-full object-contain"
            />
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={!approver}
            onChange={(e) => pilihGambar(e.target.files?.[0], setLogo)}
            className="text-base"
            aria-label="Pilih berkas logo"
          />
          {logo && approver && (
            <button
              type="button"
              onClick={() => setLogo(null)}
              className="min-h-[2.75rem] rounded-lg border-2 border-border-field px-4 text-base font-semibold text-primary hover:bg-muted"
            >
              Kembalikan logo bawaan
            </button>
          )}
        </div>
      </section>

      <section className="mt-6 max-w-2xl rounded-xl border border-border-hair bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl text-primary">
          <FileText aria-hidden="true" className="h-5 w-5" /> Kop surat resmi
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Dipakai di bagian atas dokumen cetak dan PDF. Gambar melebar, maksimal 1 MB.
        </p>
        <div className="mt-4 space-y-4">
          {kop && (
            <img
              src={kop}
              alt="Pratinjau kop surat"
              className="w-full max-w-xl rounded-lg border border-border-hair bg-white object-contain"
            />
          )}
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="file"
              accept="image/*"
              disabled={!approver}
              onChange={(e) => pilihGambar(e.target.files?.[0], setKop)}
              className="text-base"
              aria-label="Pilih berkas kop surat"
            />
            {kop && approver && (
              <button
                type="button"
                onClick={() => setKop(null)}
                className="min-h-[2.75rem] rounded-lg border-2 border-border-field px-4 text-base font-semibold text-primary hover:bg-muted"
              >
                Kembalikan kop bawaan
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 max-w-2xl rounded-xl border border-border-hair bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl text-primary">
          <PenLine aria-hidden="true" className="h-5 w-5" /> Nama dan penanda tangan
        </h2>

        <label htmlFor="nama-yayasan" className="mt-5 block text-base font-semibold">
          Nama yayasan
        </label>
        <input
          id="nama-yayasan"
          value={namaYayasan}
          onChange={(e) => setNamaYayasan(e.target.value)}
          disabled={!approver}
          className={kelasInput}
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="jabatan-ketua" className="block text-base font-semibold">
              Jabatan penanda tangan kanan
            </label>
            <input
              id="jabatan-ketua"
              value={jabatanKetua}
              onChange={(e) => setJabatanKetua(e.target.value)}
              disabled={!approver}
              className={kelasInput}
            />
          </div>
          <div>
            <label htmlFor="nama-ketua" className="block text-base font-semibold">
              Nama ketua
            </label>
            <input
              id="nama-ketua"
              value={namaKetua}
              onChange={(e) => setNamaKetua(e.target.value)}
              disabled={!approver}
              className={kelasInput}
            />
          </div>
          <div>
            <label htmlFor="jabatan-sekretaris" className="block text-base font-semibold">
              Jabatan penanda tangan kiri
            </label>
            <input
              id="jabatan-sekretaris"
              value={jabatanSekretaris}
              onChange={(e) => setJabatanSekretaris(e.target.value)}
              disabled={!approver}
              className={kelasInput}
            />
          </div>
          <div>
            <label htmlFor="nama-sekretaris" className="block text-base font-semibold">
              Nama sekretaris
            </label>
            <input
              id="nama-sekretaris"
              value={namaSekretaris}
              onChange={(e) => setNamaSekretaris(e.target.value)}
              disabled={!approver}
              className={kelasInput}
            />
          </div>
        </div>

        {approver ? (
          <div className="mt-6">
            <Tombol onClick={simpan} disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan perubahan"}
            </Tombol>
          </div>
        ) : (
          <p className="mt-6 text-base text-muted-foreground">
            Hanya approver yang dapat mengubah identitas yayasan.
          </p>
        )}
      </section>
    </>
  );
}
