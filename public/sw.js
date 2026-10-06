// Pekerja layanan sederhana: hanya agar aplikasi bisa dipasang di layar utama.
// Tidak menyimpan halaman ke cache supaya notulensi selalu tampil terbaru.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
