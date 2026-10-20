# AR-RANIRY TAPAK SUCI CHAMPIONSHIP IV — Papan Skor Digital (Prototype)

HTML + CSS + JavaScript murni (tanpa framework/backend). *"Menjunjung Tinggi Sportivitas, Integritas, dan Prestasi."*

---
## ⚡ PANDUAN CEPAT

### 1) Cara membuka
- Klik dua kali `index.html`, **atau** taruh folder ini di `htdocs` XAMPP lalu buka `http://localhost/tapak-suci-scoring/`.
- Pastikan folder `css/`, `js/`, dan `assets/` berada **di sebelah** file `.html`.

### 2) 🖼️ Cara memasang logo
Taruh file logo di folder **`assets/logos/`** dengan nama **persis** berikut (huruf kecil, `.png`):

| Nama file | Fungsi | Tampil di | Ukuran disarankan |
|---|---|---|---|
| `event-logo.png` | Logo utama event | Tengah halaman utama, pilih arena, login | 512 × 512 px |
| `logo-left.png` | Logo kiri | Halaman utama, bar atas, papan skor (kiri) | 512 × 512 px |
| `logo-right.png` | Logo kanan | Halaman utama, papan skor (kanan) | 512 × 512 px |
| `logo-tps.png` | Logo panitia/TPS | Bar atas halaman Loting | 256 × 256 px |

- Kotak logo **sudah disiapkan** — Anda tinggal memasukkan file. Gambar otomatis pas di tengah kotak (tidak terpotong/gepeng).
- Paling bagus: PNG **latar transparan**, bentuk persegi.
- Belum ada file? Tampil lingkaran putus-putus bertanda **L / M / TPS**; halaman tetap normal.
- Mau kotak logo lebih besar/kecil? Buka `css/theme.css`, ubah angka di bagian **UKURAN LOGO** (paling atas), mis. `--logo-board: 84px;`.
- Maskot latar: `assets/backgrounds/mascot.png` (PNG transparan). Latar papan skor opsional: `assets/backgrounds/arena-background.png`.
- Setelah mengganti file, tekan **Ctrl + F5** agar browser memuat gambar baru.

### 3) 🔑 Cara mengganti sandi
1. Buka file **`js/auth-demo.js`** dengan Notepad / VS Code.
2. Di bagian paling atas ada blok **`SANDI`**:
   ```js
   const SANDI = {
     dewanFight: 'dewan123',   // sandi Dewan Fight (Arena 1 & 2)
     dewanSeni:  'dewan123',   // sandi Dewan Seni
     juriFight:  'juri123',    // sandi semua Juri Fight
     juriSeni:   'juri123',    // sandi semua Juri Seni
     loting:     'loting123'   // sandi panitia Loting
   };
   ```
3. Ganti teks di dalam tanda kutip, mis. `dewanFight: 'SandiBaru2026',`. **Jangan hapus tanda kutip dan koma.**
4. Simpan file, lalu refresh browser (F5). Selesai.

> ⚠️ Ini login **demo**: sandi bisa dibaca siapa pun yang membuka file `auth-demo.js`. Untuk acara sebenarnya, login harus dibuat di backend PHP.

**Username** (tetap): Dewan Fight `a1dewan` / `a2dewan` · Dewan Seni `a1senidewan` / `a2senidewan` · Juri Fight `a1juri1…a1juri4`, `a2juri1…a2juri4` · Juri Seni `a1senijuri1…4`, `a2senijuri1…4` · Loting `loting`.
Akun hanya berlaku untuk arena & mode-nya (akun Arena 1 ditolak di Arena 2; akun Fight ditolak di Seni).

### 4) Ubah warna / tampilan
- Warna utama: variabel `:root` di `css/style.css`. Ukuran logo, animasi, dan ukuran halaman: `css/theme.css`.
- Teks judul: langsung di file `.html` masing-masing.

---
## Alur halaman
`index.html` (**FIGHT** / **SENI**) → `pilih-arena.html?mode=…` (Arena 1 · Arena 2 · **LOTTING** khusus Fight) → `arena.html?arena=N&mode=…` (Dewan · Live Score · Juri).

| | Fight | Seni |
|---|---|---|
| Live Score (publik, tanpa login) | `live-score.html?arena=N` | `live-score-seni.html?arena=N` |
| Juri | `judge.html` | `judge-seni.html` |
| Dewan | `dewan.html` | `dewan-seni.html` |
| Loting | `loting.html` | — |
| Data | `js/arena-data.js`, `js/fight-list.js` | `js/seni-data.js` |

Arena 1 dan Arena 2 memiliki data, timer, skor, dan hasil sendiri-sendiri; jeda di satu arena tidak memengaruhi arena lain. Timer berbasis timestamp.

## Fight
- **Juri**: remot T+S(10) · S.T(20) · S.K(30) · S.J(40) + T1 T2 P1 P2. Setiap ketukan langsung tersimpan; poin dan T/P **sah di Live Score bila ≥ 2 juri menekan yang sama**.
- **Dewan** (menu Monitor · Data Fighter · Data Riwayat · Bagan Fighter): mulai/jeda/lanjut/akhiri, ganti babak, tetapkan/koreksi pemenang (alasan wajib), reset. Pemenang **tidak** ditentukan otomatis dari skor.
- **Data Fighter**: input partai manual atau otomatis dari bagan; satu partai hanya bisa tampil di satu arena. Pilih partai berikutnya lewat kartu "Pilih Partai Berikutnya" di Monitor.
- **Loting**: pilih Kelas + Putra/Putri/Usia Dini → **MULAI LOOTING** → acak ulang → **simpan hasil**. **Jumlah peserta tidak dibatasi** (diuji sampai 1000). Peserta bisa ditambah satu per satu atau **ditempel langsung dari Excel** (kolom: nama, kontingen, kategori, kelas) di "Tambah / Impor Peserta". Jumlah non-pangkat-dua → ada *bye*. Bagan besar bisa diperbesar/diperkecil dengan tombol zoom "Muat layar".
- Pemenang tiap partai otomatis maju di bagan; partai babak berikutnya otomatis dibuat. Koreksi/reset ditolak bila partai berikutnya sudah berjalan.

## Seni
- **Juri**: keypad angka per komponen (Wirasa, Wirama, Wiraga) + KIRIM per komponen; nilai langsung tampil di Live Score.
- **Dewan** (Monitor · Data Peserta · Riwayat Data · Pengaturan): timer **menghitung maju**; tombol **KIRIM** menetapkan **Total Keseluruhan** (baru tampil di Live Score setelah KIRIM); **Pengaturan** = pengurangan nilai per waktu ("jika waktu ≥ mm:ss, kurangi X").
- Aturan nilai (min/max, jumlah juri, tampil total) ada di `SENI.RULES` pada `js/seni-data.js`.

## Aturan penilaian (PLACEHOLDER)
Nilai tombol, kuorum juri, dan rumus berada di `ATSC.RULES` (`js/arena-data.js`) dan `SENI.RULES` (`js/seni-data.js`). **Ini bukan aturan resmi** — sesuaikan dengan reglemen.

## Batasan prototype
- Data di `localStorage` browser: **tidak tersinkron antar perangkat/browser** (hanya antar tab pada browser yang sama).
- Login demo tidak aman. Perlu **PHP + MySQL** untuk: login/hak akses sungguhan, penyimpanan data, sinkronisasi antar perangkat (polling/SSE/WebSocket), waktu timer dari server.
- Ganti isi `load/save/update` pada `arena-data.js` & `seni-data.js` dengan `fetch()` ke API.

## Cara uji cepat
1. Buka Live Score Arena 1 dan 2 di dua tab.
2. Login Dewan Arena 1 → Mulai Pertandingan. Arena 2 tetap belum mulai.
3. Login Juri (tab baru per juri; sesi per tab) → ketuk nilai. Poin masuk setelah 2 juri menekan yang sama.
4. Akhiri → tetapkan pemenang → Live Score menampilkan pemenang.
5. Loting: login `loting` → simpan bagan → buka Dewan → Bagan Fighter / Data Fighter.
