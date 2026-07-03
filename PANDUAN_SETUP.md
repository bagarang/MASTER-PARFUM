# Panduan Setup — Master Parfum POS (Web + Google Sheets)

Aplikasi ini terdiri dari 2 bagian:
1. **Frontend** — folder ini (`index.html`, `css/`, `js/`), murni HTML/CSS/JS, bisa dibuka di desktop, tablet, atau HP. Tidak perlu server, tinggal dibuka di browser atau di-hosting di mana saja (GitHub Pages, Netlify, dsb).
2. **Backend** — `apps-script/Code.gs`, berjalan di Google Apps Script, membaca/menulis data ke **Google Spreadsheet** kamu sendiri (jadi "database"-nya adalah spreadsheet, sesuai permintaan).

Ikuti langkah-langkah ini secara berurutan.

---

## 1. Buat Google Spreadsheet baru

1. Buka [sheets.new](https://sheets.new) — ini akan membuat spreadsheet kosong baru.
2. Beri nama, misalnya **"Database Master Parfum"**.

## 2. Pasang kode backend (Apps Script)

1. Di spreadsheet tadi, klik **Extensions > Apps Script**.
2. Hapus semua isi editor kode (`Code.gs`) yang tampil default.
3. Buka file `apps-script/Code.gs` dari paket ini, salin **seluruh isinya**, dan tempel ke editor Apps Script.
4. Klik ikon **Simpan** (atau `Ctrl+S`).

## 3. Jalankan setup awal (hanya sekali)

1. Di editor Apps Script, pada dropdown fungsi di toolbar atas, pilih **`setupSheets`**.
2. Klik **Run** (▶️).
3. Google akan minta izin akses ke spreadsheet kamu — klik **Review permissions**, pilih akun Google kamu, lalu **Allow** (mungkin akan muncul peringatan "Google hasn't verified this app" — klik **Advanced > Buka (nama project) (tidak aman)**, ini wajar karena scriptnya milik kamu sendiri).
4. Setelah selesai jalan, akan muncul pop-up berisi akun login pertama:
   ```
   Username: admin
   Password: admin123
   ```
   **Catat ini** — kamu akan pakai untuk login pertama kali, lalu segera ganti password lewat menu **Pengguna** di aplikasi.
5. Cek kembali ke spreadsheet — sekarang harus sudah ada 8 sheet/tab baru: `Users`, `Kategori`, `Produk`, `MatriksOplosan`, `Transaksi`, `DetailTransaksi`, `KartuStok`, `BukuKas`. Tab `MatriksOplosan` sudah terisi 24 baris takaran racikan (sama seperti aplikasi lama kamu). Tab `Produk` masih kosong — kamu tambahkan produk lewat aplikasi nanti (menu **Stok**).

## 4. Deploy sebagai Web App

1. Masih di editor Apps Script, klik **Deploy > New deployment**.
2. Klik ikon gerigi di samping "Select type", pilih **Web app**.
3. Isi:
   - **Description**: bebas, mis. "POS Master Parfum"
   - **Execute as**: **Me (email kamu)**
   - **Who has access**: **Anyone**
4. Klik **Deploy**.
5. Salin **Web app URL** yang muncul (bentuknya `https://script.google.com/macros/s/xxxxxxxx/exec`).

> Setiap kali kamu **mengedit ulang** `Code.gs` di masa depan, kamu harus **Deploy > Manage deployments > (pilih deployment) > Edit (pensil) > Version: New version > Deploy** agar perubahan kode ikut berlaku di URL yang sama.

## 5. Sambungkan frontend ke Web App

1. Buka file `js/config.js` di paket frontend.
2. Ganti baris berikut dengan URL yang kamu salin di langkah 4:
   ```js
   APPS_SCRIPT_URL: "PASTE_URL_WEB_APP_APPS_SCRIPT_DI_SINI",
   ```
   menjadi misalnya:
   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
3. Simpan.

## 6. Buka aplikasinya

- **Cara cepat (lokal)**: klik dua kali `index.html`, buka di browser.
- **Cara lebih stabil (disarankan, terutama untuk dibuka di HP/tablet lewat internet)**: upload seluruh folder ini ke hosting statis gratis, misalnya:
  - **GitHub Pages** (buat repo baru, upload semua file, aktifkan Pages di Settings)
  - **Netlify Drop** ([app.netlify.com/drop](https://app.netlify.com/drop)) — tinggal drag-drop foldernya
  - **Cloudflare Pages**
  
  Setelah online, kamu akan dapat 1 URL yang bisa dibuka dari desktop, tablet, maupun HP — tinggal dibookmark atau di-"Add to Home Screen" supaya terasa seperti aplikasi asli.

- Login pakai `admin` / `admin123`, lalu segera buat akun kasir baru dan ganti password admin lewat menu **Pengguna**.

---

## Struktur data di Spreadsheet

| Sheet | Isi |
|---|---|
| `Users` | Akun login (password disimpan dalam bentuk hash SHA-256 + salt, bukan teks polos) |
| `Kategori` | Daftar kategori produk (bibit, base, botol, bukhur, pelengkap) |
| `Produk` | Semua barang: bibit, base, botol kosong, bukhur, pelengkap — beserta modal, harga jual, dan sisa stok |
| `MatriksOplosan` | Takaran ml bibit & base untuk tiap kombinasi ukuran + kualitas racikan |
| `Transaksi` | Rekap tiap nota: omset, estimasi untung, metode bayar |
| `DetailTransaksi` | Rincian item per nota (termasuk pecahan bibit/base dari tiap racikan) |
| `KartuStok` | Riwayat keluar-masuk stok tiap produk |
| `BukuKas` | Buku kas: pemasukan penjualan otomatis + pencatatan manual (modal, pembelian barang, biaya) |

Kamu bisa membuka spreadsheet ini kapan saja untuk melihat data mentah, membuat pivot table, atau menghubungkannya ke Google Data Studio/Looker Studio untuk dashboard tambahan — karena datanya memang Google Sheets asli.

## Yang berbeda / lebih baik dari versi PHP lama

- **Perhitungan racikan sekarang selalu memakai tabel Matriks Oplosan** (takaran sesuai ukuran & kualitas yang dipilih). Versi PHP lama sebenarnya punya bug: berapa pun kualitasnya, rasio bibit:base yang dipakai saat checkout selalu dipaksa 50:50 — jadi pilihan "Standard/Super/Premium" di form sebenarnya tidak berpengaruh ke perhitungan stok. Di versi ini sudah diperbaiki.
- Tidak ada lagi celah SQL Injection (Apps Script + Spreadsheet tidak pakai query SQL sama sekali).
- Password akun disimpan ter-hash, bukan teks polos.
- Bisa dibuka dari desktop, tablet, dan HP tanpa instalasi apa pun.

## Keterbatasan yang perlu kamu tahu

- Google Sheets bukan database transaksional sungguhan — cukup untuk toko kecil/menengah dengan traffic tidak terlalu tinggi (idealnya < beberapa ratus transaksi/hari). Kalau dua kasir checkout persis bersamaan, sistem memakai antrian (`LockService`) supaya tidak bentrok, tapi akan sedikit lebih lambat dibanding database sungguhan.
- Selama `js/config.js` masih berisi `PASTE_URL_WEB_APP...`, aplikasi akan menampilkan pesan error di layar pembuka — ini normal, tandanya kamu belum menyelesaikan langkah 5.
- Kalau nanti butuh backup, tinggal **File > Make a copy** atau **Download** spreadsheet-nya dari Google Sheets — jauh lebih mudah dibanding backup file `.sql`.
