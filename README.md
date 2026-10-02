# Pemeliharaan Kendaraan — Setup & Deploy

## 1. Jalankan SQL di Supabase

1. Buka project Supabase kamu → **SQL Editor** → New query
2. Copy-paste seluruh isi `sql/schema.sql` → **Run**
3. Selesai — semua tabel, RLS, dan bucket foto otomatis dibuat.

## 2. Aktifkan Auth Email/Password

Supabase Dashboard → **Authentication → Providers** → pastikan **Email** aktif.
Lalu buat 1 user buat diri sendiri: **Authentication → Users → Add user** (isi email + password kamu sendiri — ini yang dipakai login).

## 3. Gabungkan file-file ini ke project Next.js kamu

Struktur foldernya:
```
lib/          → supabase.ts, types.ts, utils.ts, hooks.ts, reminders.ts
components/   → Sidebar.tsx, AuthGate.tsx, ui.tsx
app/          → page.tsx (Dashboard), master/, bbm/, service/, jadwal/, pajak/, laporan/
app/api/cron/reminders/route.ts
vercel.json
```
Kalau project kamu belum punya `@supabase/supabase-js`, install dulu:
```
npm install @supabase/supabase-js
```

## 4. Environment Variables

Copy `.env.local.example` → `.env.local`, isi sesuai instruksi di dalamnya (Supabase URL/key, Resend API key, dst).

Untuk Resend (pengirim email reminder): daftar gratis di https://resend.com → Dashboard → API Keys → Create.
Gratis 100 email/hari, lebih dari cukup untuk reminder harian.

## 5. Push ke GitHub → Deploy ke Vercel

1. `git add . && git commit -m "vehicle maintenance app" && git push`
2. Buka https://vercel.com → New Project → Import repo GitHub kamu
3. Di step **Environment Variables**, isi SEMUA variabel yang ada di `.env.local.example` (yang tanpa `NEXT_PUBLIC_` juga tetap harus diisi — itu cuma aturan Next.js soal mana yang boleh sampai ke browser)
4. Deploy

## 6. Cek Cron Reminder Jalan

Vercel otomatis baca `vercel.json` dan jadwalkan `/api/cron/reminders` tiap jam **08:00 WIB** (```schedule: "0 1 * * *"``` = 01:00 UTC = 08:00 WIB).

Test manual dulu (ganti `CRON_SECRET` & domain kamu):
```
curl -H "Authorization: Bearer ISI_CRON_SECRET_KAMU" https://nama-app-kamu.vercel.app/api/cron/reminders
```
Kalau responnya `{"ok":true,...}` berarti sudah jalan. Kalau belum ada reminder yang due, wajar hasilnya `sent: false`.

## Yang perlu diketahui

- **Foto bukti** disimpan di Supabase Storage (bucket `evidence`, private) — link yang tersimpan di database adalah signed URL 10 tahun, jadi aman dibuka tapi tidak bisa ditebak orang lain.
- **Harga BBM riwayat**: tiap transaksi BBM menyimpan harga per liter saat itu (snapshot), jadi kalau nanti kamu ubah harga di Master, transaksi lama tetap menampilkan harga lama.
- **RLS aktif**: cuma yang login yang bisa baca/tulis data — beda dengan versi Apps Script sebelumnya yang siapa saja dengan link bisa akses.
- Belum termasuk di versi ini (bisa ditambah kalau perlu): Log Aktivitas (audit trail), Biaya Lain (Tol/Parkir/Asuransi), multi-user/multi-driver dengan akun terpisah.
