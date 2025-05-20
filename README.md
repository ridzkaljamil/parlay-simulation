# 🎰 Parlay Slot Game Simulasi

**(For Educational Purpose Only)**

## 📋 Deskripsi

Aplikasi web yang mensimulasikan mesin slot dengan tujuan edukatif. Aplikasi ini memungkinkan pengguna untuk memahami mekanisme di balik mesin slot, termasuk sistem RTP (Return to Player), pola kemenangan/kekalahan, serta fitur bonus seperti free spin dan multiplier.

---

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Komunikasi Real-time**: Socket.IO
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (atau platform hosting Node.js lainnya)

---

## 💻 Persyaratan Sistem

- Node.js (versi 14.x atau lebih baru)
- NPM (versi 6.x atau lebih baru)
- Browser modern (Chrome, Firefox, Safari, Edge)

---

## 🚀 Cara Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/username/slot-game-simulasi.git
cd slot-game-simulasi
```

### 2. Instal Dependensi

```bash
npm install
```

### 3. Konfigurasi Environment Variable

Buat file `.env` di root proyek dengan isi:

```
PORT=3000
```

> Anda dapat mengubah port sesuai kebutuhan.

### 4. Jalankan Aplikasi

```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000` (atau port yang Anda tentukan).

---

## 📱 Cara Penggunaan

### 🎮 Antarmuka Pemain

1. Buka browser dan akses `http://localhost:3000`
2. Anda akan melihat antarmuka mesin slot
3. Klik tombol **"SPIN"** untuk memulai putaran (biaya Rp 10.000 per putaran)
4. Klik tombol **"AUTO"** untuk mengaktifkan/menonaktifkan mode auto-spin
5. Klik tombol **"INFO"** untuk melihat tabel pembayaran dan aturan permainan

### 🛠️ Panel Admin

1. Buka browser dan akses `http://localhost:3000/admin`
2. Panel admin memungkinkan Anda untuk:
   - Memantau saldo dan aktivitas pemain
   - Mengubah saldo pemain
   - Mengatur manipulasi hasil
   - Mengontrol pola menang/kalah
   - Memberikan free spin
   - Mereset permainan

---

## 📁 Struktur Proyek

```
slot-game-simulasi/
├── public/                  # File statis
│   ├── client.html          # Antarmuka pemain
│   ├── admin.html           # Panel admin
│   └── assets/              # Gambar dan aset lainnya
├── components/              # Komponen React (versi Next.js)
│   ├── slot-machine.tsx     # Komponen mesin slot
│   └── admin-panel.tsx      # Komponen panel admin
├── server.js                # Server Express dan logika permainan
├── package.json             # Dependensi dan skrip
└── README.md                # Dokumentasi proyek
```

---

## ⚠️ Catatan Penting

- Aplikasi ini dibuat **hanya untuk tujuan edukasi dan demonstrasi**
- **Tidak menggunakan uang sungguhan**
- **Tidak dimaksudkan untuk mendorong perjudian**
- Hasil simulasi mungkin tidak mencerminkan peluang sebenarnya dari mesin slot komersial
- **Jadilah developer yang bijak!**

---

> © 2025
