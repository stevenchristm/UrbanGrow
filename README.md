# ✨ UrbanGrow (Production Edition)

## 📋 Deskripsi Evolusi

Project ini adalah sistem manajemen pertanian urban tingkat produksi yang komprehensif. **UrbanGrow** menawarkan sinkronisasi data real-time, integrasi kecerdasan buatan (AI) untuk asisten botani, dan desain antarmuka yang sangat premium.

- **Frontend**: React Native (Expo) dengan optimasi tinggi untuk performa mulus di perangkat mobile.
- **Backend**: Golang & Gin Web Framework untuk efisiensi memori dan skalabilitas API yang tangguh.
- **Database**: MySQL Relasional dengan skema operasional lengkap (Users, Spaces, Jadwal, Komunitas).
- **Admin Panel**: Vanilla JavaScript dengan antarmuka dashboard manajemen eksklusif.

---

## 🎨 Premium Design Language: "Eco Modern"

Sistem ini menggunakan bahasa desain eksklusif yang disebut **Eco Modern**, yang menggabungkan:

- **Natural Clean Layouts**: Tata letak yang terinspirasi dari elemen alam dipadukan dengan tipografi modern (Inter & Outfit).
- **High-End Glassmorphism**: Panel transparan dengan efek blur tinggi (`backdrop-filter`) dan border kaca halus pada Admin Panel.
- **Micro-interactions**: Transisi tab yang mulus, feedback visual saat disentuh, dan animasi navigasi yang responsif.
- **Responsive Mastery**: Antarmuka Admin yang tetap elegan baik di layar desktop lebar maupun perangkat lainnya.

---

## 🔑 Akun Akses

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@urban.com` | `admin123` |

---

## 🛠️ Fitur Produksi Terkini (v1.0)

- **AI Botanical Assistant**: Integrasi dengan Groq & Gemini AI (`ai_controller`) untuk memberikan rekomendasi perawatan tanaman secara otomatis dan cerdas.
- **Live Weather Sync**: Menggunakan OpenWeather API untuk mengambil kondisi cuaca real-time dan menyesuaikan parameter penyiraman.
- **Smart Scheduling System**: Pengaturan jadwal pintar untuk aktivitas berkebun seperti penyiraman, pemupukan, dan panen (`jadwal_controller`).
- **Urban Space Management**: Fitur pemetaan dan pengelolaan lahan tanam urban pribadi maupun komunitas (`space_controller`).
- **Comprehensive Dashboard**: Panel analitik grafis bagi admin untuk memantau metrik pertumbuhan, statistik pengguna, dan performa komunitas (`dashboard_controller`).
- **Secure Authentication**: Proteksi akses berlapis menggunakan JWT dan autentikasi terenkripsi (`auth_controller`).

---

## 🚀 Instalasi & Cara Menjalankan

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (v18+)
- [Go](https://go.dev/) (v1.26+)
- [MySQL/MariaDB](https://www.apachefriends.org/) (XAMPP/Laragon direkomendasikan)
- [Expo CLI](https://expo.dev/)

### 2. Setup Database
1. Buka **phpMyAdmin** atau tool database lainnya.
2. Buat database baru bernama `urbangrow`.
3. Jalankan migrasi atau seeder yang tersedia di file backend `seeder.go` (jika ada).

### 3. Konfigurasi Environment
Buat file `.env` di dalam folder `backend/` dan sesuaikan:

```env
APP_NAME=UrbanGrow
APP_PORT=8080

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=urbangrow
DB_USER=root
DB_PASSWORD=

JWT_SECRET=urbangrow-secret-key-change-in-production

# API Keys
GROQ_API_KEY=your_api_key
GEMINI_API_KEY=your_api_key
OPENWEATHER_API_KEY=your_api_key
```

### 4. Jalankan Server Backend

```bash
# Masuk ke folder backend
cd backend
go mod tidy
go run main.go
```
*API berjalan di: http://localhost:8080*

### 5. Jalankan Aplikasi Mobile (Frontend)

```bash
# Buka terminal baru, masuk ke folder frontend
cd frontend
npm install
npx expo start
```

### 6. Jalankan Panel Admin
Jalankan file `start-admin.bat` yang ada di folder `admin-panel/` atau buka file `index.html` langsung menggunakan browser / Live Server.

---

## 📁 Struktur Proyek Terbaru

```text
urbangrow/
├── admin-panel/        # Dashboard Operasional (Admin & Owner)
│   ├── css/            # Aesthetic Glassmorphism Styles
│   ├── js/             # Logic Bisnis Dashboard
│   ├── index.html      # Portal Login Admin
│   └── start-admin.bat # Script Menjalankan Admin Panel
│
├── backend/            # Core API (Golang + Gin + GORM)
│   ├── controllers/    # Logic AI, Jadwal, Space & Auth
│   ├── models/         # Skema Produksi MySQL
│   ├── routes/         # Konfigurasi Endpoint
│   ├── .env            # Konfigurasi Database & API Key
│   └── main.go         # Entry Point Server
│
└── frontend/           # Aplikasi Mobile (React Native + Expo)
    ├── app/            # Struktur Navigasi Expo Router
    ├── assets/         # Logo & Gambar Kustom
    └── package.json    # Manajemen Dependensi Frontend