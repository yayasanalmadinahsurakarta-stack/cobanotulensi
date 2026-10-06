// Utilitas untuk teks berformat (rich text) pada kolom pembahasan.
// Konten disimpan sebagai HTML sederhana; teks lama tetap didukung.

const TAG_DIIZINKAN = new Set([
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "mark",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
]);

const GAYA_DIIZINKAN = new Set([
  "text-align",
  "line-height",
  "background-color",
  "text-transform",
  "font-weight",
  "font-style",
  "text-decoration",
  "margin-left",
  "padding-left",
]);

/** Apakah nilai tersimpan berupa HTML berformat atau teks biasa. */
export function adalahHtml(nilai: string): boolean {
  return /<(p|div|br|ul|ol|li|h[1-4]|strong|b|em|i|u|s|mark|span|blockquote)\b[^>]*>/i.test(nilai);
}

function bersihkanGaya(nilaiGaya: string): string {
  const hasil: string[] = [];
  for (const bagian of nilaiGaya.split(";")) {
    const [propMentah, ...sisa] = bagian.split(":");
    if (!propMentah || sisa.length === 0) continue;
    const prop = propMentah.trim().toLowerCase();
    const isi = sisa.join(":").trim();
    if (!GAYA_DIIZINKAN.has(prop)) continue;
    if (/url\s*\(|expression|javascript:/i.test(isi)) continue;
    hasil.push(`${prop}: ${isi}`);
  }
  return hasil.join("; ");
}

/** Menyaring HTML agar hanya berisi tag dan gaya yang aman. */
export function bersihkanHtml(html: string): string {
  let keluaran = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");

  keluaran = keluaran.replace(
    /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g,
    (_cocok, garis: string, tagMentah: string, atribut: string) => {
      const tag = tagMentah.toLowerCase();
      if (!TAG_DIIZINKAN.has(tag)) return "";
      if (garis === "/") return `</${tag}>`;
      const gaya = /style\s*=\s*"([^"]*)"|style\s*=\s*'([^']*)'/i.exec(atribut);
      const isiGaya = gaya ? bersihkanGaya(gaya[1] ?? gaya[2] ?? "") : "";
      const tutup = tag === "br" ? " /" : "";
      return isiGaya ? `<${tag} style="${isiGaya}"${tutup}>` : `<${tag}${tutup}>`;
    },
  );

  return keluaran;
}

/** Mengubah HTML berformat menjadi teks biasa (untuk WhatsApp, pencarian, dsb). */
export function htmlKeTeks(nilai: string): string {
  if (!adalahHtml(nilai)) return nilai;
  return nilai
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|h[1-4]|li|blockquote)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Mengubah teks biasa menjadi HTML paragraf sederhana. */
export function teksKeHtml(nilai: string): string {
  const aman = nilai
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraf = aman.split(/\n{2,}/).filter((p) => p.trim() !== "");
  if (paragraf.length === 0) return "";
  return paragraf.map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`).join("");
}

/**
 * Mengubah HTML berformat menjadi teks WhatsApp: tebal (*), miring (_),
 * coret (~), daftar bernomor, dan daftar butir tetap rapi.
 */
export function htmlKeWa(nilai: string): string {
  if (!adalahHtml(nilai)) return nilai.trim();

  let t = nilai
    .replace(/<\s*(strong|b)\s*>/gi, "*")
    .replace(/<\s*\/\s*(strong|b)\s*>/gi, "*")
    .replace(/<\s*(em|i)\s*>/gi, "_")
    .replace(/<\s*\/\s*(em|i)\s*>/gi, "_")
    .replace(/<\s*(s|strike)\s*>/gi, "~")
    .replace(/<\s*\/\s*(s|strike)\s*>/gi, "~");

  // Daftar bernomor: beri nomor urut per daftar.
  t = t.replace(/<\s*ol[^>]*>([\s\S]*?)<\s*\/\s*ol\s*>/gi, (_c, isi: string) => {
    let n = 0;
    const butir = isi.replace(/<\s*li[^>]*>/gi, () => `\n${++n}. `);
    return `\n${butir}\n`;
  });
  t = t.replace(/<\s*ul[^>]*>([\s\S]*?)<\s*\/\s*ul\s*>/gi, (_c, isi: string) => {
    return `\n${isi.replace(/<\s*li[^>]*>/gi, "\n• ")}\n`;
  });

  // Judul menjadi baris tebal.
  t = t.replace(/<\s*h[1-4][^>]*>([\s\S]*?)<\s*\/\s*h[1-4]\s*>/gi, (_c, isi: string) => `\n*${isi.trim()}*\n`);

  return t
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
