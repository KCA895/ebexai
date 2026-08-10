# EbexAI — Rencana Fitur (belum diimplementasi)

Status: **PLAN ONLY**. Dibuat 2026-08-10 atas permintaan Kelvin. Implementasi
menyusul saat diminta. Prinsip: semua gratis, tanpa dependency berat, tanpa bug,
kompatibel semua device, konsisten dengan tema neumorphism "Warm Soft-UI".

Konteks penting: filter toxic hanya memeriksa INPUT user, TIDAK memfilter output
AI — persona EBEX (roasting/kasar) tetap utuh.

Urutan rekomendasi: **#4 → #6 → #7 → #3 → #5** (value tertinggi & risiko terendah dulu).

---

## #4 — Tombol Stop / Copy / Regenerate  (effort: sedang)
**Tujuan:** kontrol premium di tiap balasan.
- **Stop:** pasang `AbortController` di `getGroqStreamingResponse` (`app.js`), teruskan
  `signal` ke `fetch`. Tombol Send berubah jadi Stop saat streaming; klik → `abort()`.
- **Copy:** tombol kecil muncul saat hover di `.message-content` bot →
  `navigator.clipboard.writeText(textContent)` + feedback "tersalin".
- **Regenerate:** simpan pesan user terakhir; hapus balasan bot terakhir, panggil ulang
  streaming. Perlu variabel `lastUserMessage`.
- **File:** `app.js` (refactor streaming + action buttons), `styles.css` (styling neumorph),
  `index.html` (opsional).
- **Hati-hati:** abort harus bersih (jangan simpan pesan kosong ke Firestore saat di-stop).

## #6 — Dark mode  (effort: rendah–sedang)
**Tujuan:** varian gelap neumorphism.
- Tambah blok variabel `:root[data-theme="dark"]` di `styles.css` (base charcoal hangat
  `#2a2723`, tune `--nm-light`/`--nm-dark`, teks jadi krem, accent tetap terracotta).
- Toggle di header (`index.html`) → set `data-theme` di `<html>`, simpan ke `localStorage`.
- Script kecil di `<head>` untuk apply tema sebelum render (anti "flash" putih).
- Hormati `prefers-color-scheme` sebagai default.
- **File:** `styles.css`, `index.html`, sedikit JS.

## #7 — Pet interaktif  (effort: rendah, fun)
**Tujuan:** mascot "EBEX bobok" bisa diajak main.
- Klik/tap `.ebex-pet` → bangun (mata melek / bounce) + kalimat acak
  ("apaan sih ganggu bobok", "iya iya gw bangun"). Diam beberapa detik → tidur lagi.
- Opsional: state "mood" (ngantuk/melek/senang) disimpan di `localStorage`, terhubung ke
  `deviceTracking`. Makin sering dipakai → mood beda.
- **File:** `app.js` (handler + state), `styles.css` (animasi awake), `index.html` (opsional).

## #3 — PWA / installable + offline shell  (effort: rendah–sedang)
**Tujuan:** bisa di-"install" ke home screen + shell offline.
- Tambah `manifest.json` (name, short_name, `display:standalone`, `theme_color:#e8e3d7`,
  `background_color`, icons 192/512).
- `index.html`: `<link rel="manifest">`, `<meta name="theme-color">`, `apple-touch-icon`.
- `service-worker.js`: cache-first untuk shell (`index.html`, `styles.css`, `app.js`,
  `chat-manager.js`, gambar, font). **Network-only** untuk `/api/chat` & Firestore.
  Registrasi di `app.js`.
- Perlu ikon PNG 192 & 512 (resize dari `ebexgramlogo.png` yang 4.7MB — sekalian
  dikecilkan buat perf).
- **Hati-hati:** jangan cache Firebase SDK/Groq; offline = shell tampil tapi AI butuh internet.

## #5 — Vision (kirim gambar)  (effort: sedang–tinggi)
**Tujuan:** EBEX bisa "lihat" foto.
- **Model:** pakai model vision Groq di free tier (mis. `llama-3.2-11b-vision-preview`
  atau model multimodal terbaru — **cek dulu ID-nya di Groq console**, bisa berubah).
- **Client:** tombol upload gambar → baca `base64 data URL` → kirim sebagai konten format
  vision OpenAI (`content: [{type:text}, {type:image_url,image_url:{url}}]`).
- **Server:** `server.js` sekarang hardcode `llama-3.1-8b-instant`. Ubah agar deteksi ada
  konten gambar → pakai model vision. (Tetap lewat proxy, key aman.)
- **Penyimpanan:** JANGAN simpan base64 gambar di Firestore (limit 1MB/dok). Pilihan:
  Firebase Storage, atau simpan teks saja (gambar hanya dikirim ke AI, tidak dipersist).
- **Hati-hati:** verifikasi model ID aktif; batasi ukuran gambar sebelum kirim.

---

### Yang sudah selesai (referensi)
Key via proxy + `.env`, tracking A1/A2/A3, memori chat, tema neumorphism, mascot bobok,
rate-limit + CORS allowlist + toxic guard server-side, App Check scaffolding (tinggal isi
reCAPTCHA site key di `APP_CHECK_SITE_KEY`).

### Ditunda (belum dibuat, atas permintaan)
Consent banner — teks draft ada di riwayat chat; belum diimplement.
