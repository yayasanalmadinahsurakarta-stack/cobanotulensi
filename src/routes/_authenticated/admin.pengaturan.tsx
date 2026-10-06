import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JudulHalaman, useSesiAktif } from "@/components/tata-letak-pengurus";
import { Tombol } from "@/components/tombol";
import {
  ambilModelAi,
  simpanModelAi,
  simpanKunciGoogle,
  statusKunciGoogle,
} from "@/lib/ai.functions";
import { gantiPin, statusPin } from "@/lib/gate.functions";

export const Route = createFileRoute("/_authenticated/admin/pengaturan")({
  component: HalamanPengaturan,
});

/** Pengaturan layanan AI: kunci Google milik yayasan dan nama modelnya. */
function HalamanPengaturan() {
  const sesi = useSesiAktif();
  const approver = sesi.peran === "approver";

  const bacaModel = useServerFn(ambilModelAi);
  const tulisModel = useServerFn(simpanModelAi);
  const bacaStatusKunci = useServerFn(statusKunciGoogle);
  const bacaStatusPin = useServerFn(statusPin);
  const tulisPin = useServerFn(gantiPin);
  const tulisKunci = useServerFn(simpanKunciGoogle);

  const { data, refetch } = useQuery({ queryKey: ["model-ai"], queryFn: () => bacaModel({}) });
  const { data: kunciInfo, refetch: refetchKunci } = useQuery({
    queryKey: ["kunci-google"],
    queryFn: () => bacaStatusKunci({}),
  });

  const { data: pinInfo, refetch: refetchPin } = useQuery({
    queryKey: ["status-pin"],
    queryFn: () => bacaStatusPin({}),
  });

  const [pinBaru, setPinBaru] = useState("");
  const [sibukPin, setSibukPin] = useState(false);
  const [model, setModel] = useState("");
  const [kunci, setKunci] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [sibukKunci, setSibukKunci] = useState(false);

  useEffect(() => {
    if (data) setModel(data);
  }, [data]);

  async function simpan() {
    setSibuk(true);
    try {
      await tulisModel({ data: { model } });
      await refetch();
      toast.success("Nama model AI disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan");
    } finally {
      setSibuk(false);
    }
  }

  async function simpanPin() {
    setSibukPin(true);
    try {
      await tulisPin({ data: { pin: pinBaru } });
      setPinBaru("");
      await refetchPin();
      toast.success("PIN portal berhasil diganti");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengganti PIN");
    } finally {
      setSibukPin(false);
    }
  }

  async function simpanKunci() {
    setSibukKunci(true);
    try {
      await tulisKunci({ data: { kunci } });
      setKunci("");
      await refetchKunci();
      toast.success("Kunci API Google disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan kunci API");
    } finally {
      setSibukKunci(false);
    }
  }

  return (
    <>
      <JudulHalaman
        judul="Pengaturan AI"
        keterangan="Notulensi dirapikan memakai layanan Gemini milik yayasan. Kunci API disimpan di sisi server dan tidak pernah dikirim kembali ke peramban."
      />

      <section className="max-w-xl rounded-xl border border-border-hair bg-card p-6">
        <h2 className="text-xl text-primary">Kunci API Google</h2>
        <p className="mt-2 text-base text-muted-foreground">
          {kunciInfo?.terisi
            ? `Kunci sudah tersimpan (berakhiran …${kunciInfo.akhiran}). Isi kolom di bawah hanya bila ingin menggantinya.`
            : "Belum ada kunci tersimpan. Tempelkan kunci dari Google AI Studio di bawah ini."}
        </p>

        <label htmlFor="kunci" className="mt-5 block text-base font-semibold">
          Tempelkan kunci API baru
        </label>
        <input
          id="kunci"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={kunci}
          onChange={(e) => setKunci(e.target.value)}
          disabled={!approver}
          placeholder="Contoh: AQ.Ab8RN…"
          className="mt-2 w-full rounded-lg border border-border-field bg-background px-4 py-3 text-base disabled:opacity-70"
        />

        {approver ? (
          <div className="mt-4">
            <Tombol onClick={simpanKunci} disabled={sibukKunci || kunci.trim().length < 20}>
              {sibukKunci ? "Menyimpan…" : "Simpan kunci API"}
            </Tombol>
          </div>
        ) : (
          <p className="mt-4 text-base text-muted-foreground">
            Hanya approver yang dapat mengubah kunci API.
          </p>
        )}
      </section>

      <section className="mt-6 max-w-xl rounded-xl border border-border-hair bg-card p-6">
        <h2 className="text-xl text-primary">PIN portal umum</h2>
        <p className="mt-2 text-base text-muted-foreground">
          {pinInfo?.terisi
            ? `PIN aktif terdiri dari ${pinInfo.panjang} angka. Isi kolom di bawah bila ingin menggantinya.`
            : "Belum ada PIN tersimpan."}
        </p>

        <label htmlFor="pin-baru" className="mt-5 block text-base font-semibold">
          PIN baru (4–12 angka)
        </label>
        <input
          id="pin-baru"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          value={pinBaru}
          onChange={(e) => setPinBaru(e.target.value.replace(/[^0-9]/g, ""))}
          disabled={!approver}
          className="mt-2 w-full rounded-lg border border-border-field bg-background px-4 py-3 text-base tracking-[0.3em] disabled:opacity-70"
        />

        {approver ? (
          <div className="mt-4">
            <Tombol onClick={simpanPin} disabled={sibukPin || pinBaru.length < 4}>
              {sibukPin ? "Menyimpan…" : "Simpan PIN baru"}
            </Tombol>
          </div>
        ) : (
          <p className="mt-4 text-base text-muted-foreground">
            Hanya approver yang dapat mengganti PIN.
          </p>
        )}
      </section>

      <section className="mt-6 max-w-xl rounded-xl border border-border-hair bg-card p-6">
        <h2 className="text-xl text-primary">Model AI</h2>
        <label htmlFor="model" className="mt-3 block text-base font-semibold">
          Nama model
        </label>
        <input
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!approver}
          className="mt-2 w-full rounded-lg border border-border-field bg-background px-4 py-3 text-base disabled:opacity-70"
        />
        <p className="mt-2 text-base text-muted-foreground">
          Sedang dipakai: <code>gemini-3.1-pro-preview</code> (Gemini 3.1 Pro, paling teliti).
          Pilihan lain yang lebih cepat: <code>gemini-3.1-flash-lite</code> atau{" "}
          <code>gemini-2.5-flash</code>.
        </p>

        {approver && (
          <div className="mt-4">
            <Tombol onClick={simpan} disabled={sibuk || model.trim() === ""}>
              {sibuk ? "Menyimpan…" : "Simpan model"}
            </Tombol>
          </div>
        )}
      </section>
    </>
  );
}

