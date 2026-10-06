import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";

type BarisTugas = {
  id: string;
  tugas: string;
  deadline: string;
  status: string;
  catatan: string | null;
  pj_id: string | null;
  pj_nama: string | null;
  notulensi: { nomor: string | null; tema: string; tanggal: string } | null;
};

type Pengurus = {
  id: string;
  nama_lengkap: string;
  email: string;
  no_wa: string | null;
  aktif: boolean;
};

type Kelompok = {
  nama: string;
  email: string | null;
  no_wa: string | null;
  lewat: BarisTugas[];
  mendekat: BarisTugas[];
};

/** Tanggal hari ini menurut Waktu Indonesia Barat (UTC+7), format YYYY-MM-DD. */
function hariIniWIB(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function selisihHari(deadline: string, acuan: string): number {
  const a = Date.parse(deadline + "T00:00:00Z");
  const b = Date.parse(acuan + "T00:00:00Z");
  return Math.round((a - b) / 86400000);
}

function tanggalPanjang(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function rapikanNomorWa(nomor: string | null | undefined): string | null {
  if (!nomor) return null;
  let bersih = nomor.replace(/[^0-9+]/g, "");
  if (bersih.startsWith("+")) bersih = bersih.slice(1);
  if (bersih.startsWith("0")) bersih = "62" + bersih.slice(1);
  if (bersih.startsWith("8")) bersih = "62" + bersih;
  if (!bersih.startsWith("62") || bersih.length < 10) return null;
  return bersih;
}

function amanHtml(teks: string): string {
  return teks
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function daftarTugasHtml(judul: string, warna: string, tugas: BarisTugas[], acuan: string): string {
  if (tugas.length === 0) return "";
  const item = tugas
    .map((t) => {
      const sisa = selisihHari(t.deadline, acuan);
      const ket =
        sisa < 0
          ? `terlambat ${Math.abs(sisa)} hari`
          : sisa === 0
            ? "jatuh tempo hari ini"
            : `sisa ${sisa} hari`;
      const asal = t.notulensi
        ? `${t.notulensi.nomor ? amanHtml(t.notulensi.nomor) + " &middot; " : ""}${amanHtml(t.notulensi.tema)}`
        : "";
      return `<li style="margin-bottom:10px">
        <strong>${amanHtml(t.tugas)}</strong><br />
        <span style="color:#555">Tenggat ${tanggalPanjang(t.deadline)} (${ket}) &middot; Status: ${amanHtml(t.status)}</span>
        ${asal ? `<br /><span style="color:#777;font-size:13px">Dari notulensi: ${asal}</span>` : ""}
      </li>`;
    })
    .join("");
  return `<h3 style="color:${warna};margin:20px 0 8px">${judul} (${tugas.length})</h3><ul style="padding-left:18px;margin:0">${item}</ul>`;
}

function keTeks(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&middot;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export const Route = createFileRoute("/api/public/hooks/kirim-pengingat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rahasia =
          process.env["PENGINGAT_CRON_SECRET"] ?? process.env["LOVABLE_CRON_SECRET"];
        const kirimanHeader = request.headers.get("authorization") ?? "";
        if (!rahasia || kirimanHeader !== `Bearer ${rahasia}`) {
          return new Response(JSON.stringify({ error: "Tidak berwenang" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: pengaturanRows } = await supabase.from("pengaturan").select("kunci, nilai");
        const setelan = new Map((pengaturanRows ?? []).map((r) => [r.kunci, r.nilai]));

        if ((setelan.get("pengingat_aktif") ?? "ya").toLowerCase() !== "ya") {
          return Response.json({ ok: true, dilewati: "pengingat_aktif=tidak" });
        }

        const hariPengingat = (setelan.get("hari_pengingat") ?? "7,3,1,0")
          .split(",")
          .map((s: string) => Number(s.trim()))
          .filter((n: number) => Number.isFinite(n));
        const pengirim = (setelan.get("email_pengirim") ?? "").trim();
        const emailSekretaris = (setelan.get("email_sekretaris") ?? "").trim();

        const acuan = hariIniWIB();

        const { data: tugasRaw, error: errTugas } = await supabase
          .from("tindak_lanjut")
          .select(
            "id, tugas, deadline, status, catatan, pj_id, pj_nama, notulensi:notulensi_id (nomor, tema, tanggal, dihapus_pada)",
          )
          .neq("status", "Sudah dibahas")
          .not("deadline", "is", null);

        if (errTugas) {
          return Response.json({ error: errTugas.message }, { status: 500 });
        }

        const { data: pengurusRaw } = await supabase
          .from("pengurus")
          .select("id, nama_lengkap, email, no_wa, aktif");
        const pengurus = new Map<string, Pengurus>(
          ((pengurusRaw ?? []) as Pengurus[]).map((p) => [p.id, p]),
        );
        const pengurusPerNama = new Map<string, Pengurus>(
          ((pengurusRaw ?? []) as Pengurus[]).map((p) => [p.nama_lengkap.toLowerCase().trim(), p]),
        );

        // Saring: hanya notulensi yang belum dihapus, dan hanya tugas yang jatuh pada
        // ambang pengingat atau sudah lewat tenggat (dikirim setiap hari sampai ditutup).
        const terpilih = ((tugasRaw ?? []) as unknown as (BarisTugas & {
          notulensi: (BarisTugas["notulensi"] & { dihapus_pada: string | null }) | null;
        })[]).filter((t) => {
          if (t.notulensi?.dihapus_pada) return false;
          const sisa = selisihHari(t.deadline, acuan);
          return sisa < 0 || hariPengingat.includes(sisa);
        });

        const kelompok = new Map<string, Kelompok>();
        const tanpaEmail: BarisTugas[] = [];

        for (const t of terpilih) {
          const p =
            (t.pj_id ? pengurus.get(t.pj_id) : undefined) ??
            (t.pj_nama ? pengurusPerNama.get(t.pj_nama.toLowerCase().trim()) : undefined);
          const nama = p?.nama_lengkap ?? t.pj_nama ?? "Tanpa penanggung jawab";
          const email = p?.aktif ? (p.email || null) : null;
          const kunci = email ?? `tanpa-email:${nama}`;
          if (!kelompok.has(kunci)) {
            kelompok.set(kunci, {
              nama,
              email,
              no_wa: rapikanNomorWa(p?.no_wa ?? null),
              lewat: [],
              mendekat: [],
            });
          }
          const g = kelompok.get(kunci)!;
          if (selisihHari(t.deadline, acuan) < 0) g.lewat.push(t);
          else g.mendekat.push(t);
          if (!email) tanpaEmail.push(t);
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        const hasil: { penerima: string; terkirim: boolean; alasan?: string }[] = [];

        async function kirim(ke: string, subjek: string, html: string) {
          if (!apiKey || !pengirim) {
            hasil.push({ penerima: ke, terkirim: false, alasan: "email_pengirim belum diatur" });
            return;
          }
          try {
            await sendLovableEmail(
              {
                to: ke,
                from: pengirim,
                subject: subjek,
                html,
                text: keTeks(html),
                purpose: "Pengingat tenggat tindak lanjut notulensi",
                label: "pengingat-tindak-lanjut",
                idempotency_key: `pengingat:${acuan}:${ke}`,
              },
              { apiKey },
            );
            hasil.push({ penerima: ke, terkirim: true });
          } catch (e) {
            const alasan =
              e instanceof EmailAPIError ? `${e.code ?? e.status}: ${e.message}` : String(e);
            hasil.push({ penerima: ke, terkirim: false, alasan });
          }
        }

        const kop = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:640px;margin:auto;color:#1f2937">
          <p style="font-size:13px;color:#6b7280;margin:0">Yayasan Al Madinah Surakarta</p>`;
        const tutup = `<p style="font-size:12px;color:#9ca3af;margin-top:28px">Surat ini dikirim otomatis setiap pagi oleh Sistem Manajemen Notulensi.</p></div>`;

        // Satu surat per penanggung jawab
        for (const g of kelompok.values()) {
          if (!g.email) continue;
          const html = `${kop}
            <h2 style="margin:6px 0 2px">Pengingat tindak lanjut</h2>
            <p>Assalamu'alaikum ${amanHtml(g.nama)}, berikut tugas yang perlu ditindaklanjuti per ${tanggalPanjang(acuan)}.</p>
            ${daftarTugasHtml("Sudah lewat tenggat", "#b91c1c", g.lewat, acuan)}
            ${daftarTugasHtml("Mendekati tenggat", "#b45309", g.mendekat, acuan)}
            ${
              g.no_wa
                ? `<p style="margin-top:20px"><a href="https://wa.me/${g.no_wa}" style="color:#1d4ed8">Hubungi ${amanHtml(g.nama)} lewat WhatsApp</a> (untuk sekretaris)</p>`
                : ""
            }
            ${tutup}`;
          await kirim(
            g.email,
            `Pengingat tindak lanjut — ${g.lewat.length} lewat tenggat, ${g.mendekat.length} mendekati`,
            html,
          );
        }

        // Surat rekap untuk sekretaris
        if (emailSekretaris && terpilih.length > 0) {
          const semuaLewat = terpilih.filter((t) => selisihHari(t.deadline, acuan) < 0);
          const semuaDekat = terpilih.filter((t) => selisihHari(t.deadline, acuan) >= 0);
          const daftarWa = [...kelompok.values()]
            .filter((g) => g.no_wa)
            .map(
              (g) =>
                `<li>${amanHtml(g.nama)} — <a href="https://wa.me/${g.no_wa}" style="color:#1d4ed8">wa.me/${g.no_wa}</a> (${g.lewat.length + g.mendekat.length} tugas)</li>`,
            )
            .join("");
          const daftarTanpaEmail = tanpaEmail
            .map(
              (t) =>
                `<li><strong>${amanHtml(t.pj_nama ?? "Tanpa PJ")}</strong> — ${amanHtml(t.tugas)} (tenggat ${tanggalPanjang(t.deadline)})</li>`,
            )
            .join("");
          const html = `${kop}
            <h2 style="margin:6px 0 2px">Rekap pengingat tindak lanjut</h2>
            <p>Ringkasan per ${tanggalPanjang(acuan)}: ${semuaLewat.length} tugas lewat tenggat, ${semuaDekat.length} mendekati tenggat.</p>
            ${daftarTugasHtml("Sudah lewat tenggat", "#b91c1c", semuaLewat, acuan)}
            ${daftarTugasHtml("Mendekati tenggat", "#b45309", semuaDekat, acuan)}
            ${
              daftarTanpaEmail
                ? `<h3 style="color:#b91c1c;margin:24px 0 8px">Perlu dilengkapi: penanggung jawab tanpa alamat email (${tanpaEmail.length})</h3>
                   <p style="color:#555;margin:0 0 8px">Tugas berikut tidak dapat dikirimkan pengingat karena PJ-nya belum punya alamat email di data pengurus.</p>
                   <ul style="padding-left:18px;margin:0">${daftarTanpaEmail}</ul>`
                : ""
            }
            ${daftarWa ? `<h3 style="margin:24px 0 8px">Tautan WhatsApp siap klik</h3><ul style="padding-left:18px;margin:0">${daftarWa}</ul>` : ""}
            ${tutup}`;
          await kirim(emailSekretaris, `Rekap tindak lanjut — ${tanggalPanjang(acuan)}`, html);
        }

        return Response.json({
          ok: true,
          tanggal: acuan,
          total_tugas: terpilih.length,
          penerima: kelompok.size,
          tugas_tanpa_email: tanpaEmail.length,
          hasil,
        });
      },
    },
  },
});
