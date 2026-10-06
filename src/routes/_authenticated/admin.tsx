import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PenjagaPengurus } from "@/components/penjaga-pengurus";
import { TataLetakPengurus } from "@/components/tata-letak-pengurus";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Area Sekertaris — Notulensi Yayasan Al Madinah Surakarta" },
      {
        name: "description",
        content:
          "Ruang kerja pengurus untuk menyusun, menyetujui, dan menerbitkan notulensi rapat yayasan.",
      },
      { property: "og:title", content: "Area Sekertaris — Notulensi Yayasan Al Madinah Surakarta" },
      {
        property: "og:description",
        content: "Ruang kerja pengurus untuk menyusun dan menerbitkan notulensi rapat yayasan.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PenjagaPengurus>
      {(sesi) => (
        <TataLetakPengurus sesi={sesi}>
          <Outlet />
        </TataLetakPengurus>
      )}
    </PenjagaPengurus>
  ),
});
