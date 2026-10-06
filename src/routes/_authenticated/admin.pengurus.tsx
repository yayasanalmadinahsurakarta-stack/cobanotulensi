import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { JudulHalaman, useSesiAktif } from "@/components/tata-letak-pengurus";
import { Tombol } from "@/components/tombol";
import {
  ambilDaftarPengurus,
  hapusPengurus,
  simpanPengurus,
  type IsianPengurus,
} from "@/lib/notulensi-api";
import type { Pengurus } from "@/lib/notulensi-types";
import { PanelAkunPengurus } from "@/components/panel-akun-pengurus";
import { AksiAkunPengurus } from "@/components/aksi-akun-pengurus";

export const Route = createFileRoute("/_authenticated/admin/pengurus")({
  component: HalamanPengurus,
});

const kosong: IsianPengurus = {
  nama_lengkap: "",
  jabatan: "",
  no_wa: "",
  email: "",
  username: "",
  peran: "editor",
  aktif: true,
};

function HalamanPengurus() {
  const sesi = useSesiAktif();
  const queryClient = useQueryClient();
  const [isian, setIsian] = useState<IsianPengurus | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["daftar-pengurus"],
    queryFn: ambilDaftarPengurus,
    enabled: sesi.peran === "approver",
  });

  const simpan = useMutation({
    mutationFn: simpanPengurus,
    onSuccess: () => {
      toast.success("Data pengurus tersimpan");
      setIsian(null);
      queryClient.invalidateQueries({ queryKey: ["daftar-pengurus"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hapus = useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) => hapusPengurus(id, nama),
    onSuccess: () => {
      toast.success("Pengurus dihapus");
      queryClient.invalidateQueries({ queryKey: ["daftar-pengurus"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (sesi.peran !== "approver") {
    return (
      <p className="rounded-xl bg-status-danger-bg p-5 text-base text-status-danger-fg">
        Halaman ini hanya untuk approver.
      </p>
    );
  }

  function mulaiUbah(p: Pengurus) {
    setIsian({
      id: p.id,
      nama_lengkap: p.nama_lengkap,
      jabatan: p.jabatan ?? "",
      no_wa: p.no_wa ?? "",
      email: p.email,
      username: p.username ?? "",
      peran: p.peran,
      aktif: p.aktif,
    });
  }

  return (
    <>
      <JudulHalaman
        judul="Pengurus"
        keterangan="Daftar orang yang boleh masuk ke area sekertaris beserta kewenangannya."
        aksi={<Tombol onClick={() => setIsian({ ...kosong })}>Tambah pengurus</Tombol>}
      />

      <PanelAkunPengurus />

      {isian && (
        <form
          className="mb-8 rounded-xl border border-border-hair bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            simpan.mutate(isian);
          }}
        >
          <h2 className="text-xl text-primary">
            {isian.id ? "Ubah data pengurus" : "Pengurus baru"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Isian
              label="Nama lengkap"
              nilai={isian.nama_lengkap}
              ubah={(v) => setIsian({ ...isian, nama_lengkap: v })}
              wajib
            />
            <Isian
              label="Jabatan"
              nilai={isian.jabatan}
              ubah={(v) => setIsian({ ...isian, jabatan: v })}
            />
            <Isian
              label="Nomor WhatsApp"
              nilai={isian.no_wa}
              ubah={(v) => setIsian({ ...isian, no_wa: v })}
            />
            <Isian
              label="Email"
              tipe="email"
              nilai={isian.email}
              ubah={(v) => setIsian({ ...isian, email: v })}
              wajib
            />
            <Isian
              label="Nama pengguna untuk masuk"
              nilai={isian.username}
              ubah={(v) => setIsian({ ...isian, username: v.replace(/[^a-zA-Z0-9._-]/g, "") })}
            />
            <label className="block text-base font-semibold">
              Peran
              <select
                value={isian.peran}
                onChange={(e) =>
                  setIsian({ ...isian, peran: e.target.value as IsianPengurus["peran"] })
                }
                className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-3 py-2 text-base font-normal"
              >
                <option value="editor">Editor — menyusun dan mengajukan notulensi</option>
                <option value="approver">Approver — menyetujui dan menerbitkan</option>
              </select>
            </label>
            <label className="flex min-h-[2.75rem] items-center gap-3 text-base font-semibold">
              <input
                type="checkbox"
                checked={isian.aktif}
                onChange={(e) => setIsian({ ...isian, aktif: e.target.checked })}
                className="h-6 w-6"
              />
              Akun aktif (boleh masuk)
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Tombol type="submit" disabled={simpan.isPending}>
              Simpan
            </Tombol>
            <Tombol type="button" varian="sekunder" onClick={() => setIsian(null)}>
              Batal
            </Tombol>
          </div>
        </form>
      )}

      {isPending ? (
        <p className="text-base text-muted-foreground">Sedang memuat data…</p>
      ) : (
        <div className="tabel-gulir rounded-xl border border-border-hair bg-card">
          <table className="w-full min-w-[60rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border-hair">
                {["Nama", "Jabatan", "No WA", "Email", "Nama pengguna", "Peran", "Status", "Akun masuk", "Tindakan"].map((h) => (
                  <th key={h} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border-hair last:border-b-0">
                  <td className="px-4 py-3 align-top text-base">{p.nama_lengkap}</td>
                  <td className="px-4 py-3 align-top text-base">{p.jabatan ?? "—"}</td>
                  <td className="px-4 py-3 align-top text-base">{p.no_wa ?? "—"}</td>
                  <td className="px-4 py-3 align-top text-base">{p.email}</td>
                  <td className="px-4 py-3 align-top text-base">{p.username ?? "—"}</td>
                  <td className="px-4 py-3 align-top text-base">
                    {p.peran === "approver" ? "Approver" : "Editor"}
                  </td>
                  <td className="px-4 py-3 align-top text-base">
                    <span
                      className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold ${
                        p.aktif
                          ? "bg-status-ok-bg text-status-ok-fg"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-base">
                    <AksiAkunPengurus p={p} />
                  </td>
                  <td className="px-4 py-3 align-top text-base">
                    <div className="flex flex-wrap gap-2">
                      <Tombol varian="sekunder" onClick={() => mulaiUbah(p)}>
                        Ubah
                      </Tombol>
                      <Tombol
                        varian="bahaya"
                        onClick={() => {
                          if (
                            window.confirm(`Hapus ${p.nama_lengkap} dari daftar pengurus?`)
                          ) {
                            hapus.mutate({ id: p.id, nama: p.nama_lengkap });
                          }
                        }}
                      >
                        Hapus
                      </Tombol>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Isian({
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
        required={wajib}
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        className="mt-2 min-h-[2.75rem] w-full rounded-lg border-2 border-border-field bg-background px-4 py-2 text-base font-normal"
      />
    </label>
  );
}
