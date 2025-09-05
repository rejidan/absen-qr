# Sistem Absensi Siswa - Fullstack Application

Aplikasi fullstack untuk sistem absensi siswa dengan QR Code menggunakan Vue.js frontend dan Node.js backend.

## 🚀 Fitur Utama

- **Absensi QR Code**: Scan QR code untuk absensi otomatis
- **Dashboard Admin**: Kelola data siswa dan monitoring absensi
- **Real-time Updates**: Data absensi terupdate secara real-time
- **Responsive Design**: Tampilan optimal di desktop dan mobile
- **Database Integration**: Menggunakan Supabase PostgreSQL

## 🛠️ Tech Stack

### Frontend
- Vue.js 3 dengan Composition API
- Vite untuk build tool
- Tailwind CSS untuk styling
- Vue Router untuk routing

### Backend
- Node.js dengan Express.js
- Supabase PostgreSQL database
- JWT untuk authentication
- CORS untuk cross-origin requests

## 📦 Installation

### Prerequisites
- Node.js (v16 atau lebih tinggi)
- npm atau yarn
- Akun Supabase

### Setup Environment

1. Clone repository:
```bash
git clone <repository-url>
cd absensi_siswa
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```

4. Edit file `.env` dengan konfigurasi Anda:
```env
# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_database_url

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

5. Initialize database:
```bash
npm run init-db
```

## 🚀 Development

### Run Development Servers

1. Start backend server:
```bash
npm start
```
Server akan berjalan di `http://localhost:3001`

2. Start frontend development server (terminal baru):
```bash
npm run dev:client
```
Frontend akan berjalan di `http://localhost:3000`

### Available Scripts

- `npm start` - Menjalankan server backend
- `npm run dev:client` - Menjalankan development server frontend
- `npm run build` - Build aplikasi untuk production
- `npm run init-db` - Initialize database schema
- `npm run generate-qr` - Generate QR codes untuk testing

## 🌐 Deployment

### Vercel Deployment

Aplikasi ini dikonfigurasi untuk deployment di Vercel sebagai fullstack application.

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login ke Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

### Environment Variables untuk Production

Pastikan untuk mengatur environment variables berikut di Vercel dashboard:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

## 📁 Struktur Proyek

```
absensi_siswa/
├── src/
│   ├── client/          # Frontend Vue.js application
│   │   ├── components/  # Vue components
│   │   ├── views/       # Vue pages/views
│   │   ├── router/      # Vue Router configuration
│   │   └── config/      # Frontend configuration
│   ├── server/          # Backend Express.js application
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Express middleware
│   │   └── utils/       # Utility functions
│   ├── config/          # Shared configuration
│   └── scripts/         # Utility scripts
├── dist/                # Built frontend files
├── vercel.json          # Vercel deployment configuration
├── server.js            # Main server entry point
└── package.json         # Dependencies and scripts
```

## 🔧 API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Record attendance
- `GET /api/attendance/student/:id` - Get student attendance history

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

Jika Anda mengalami masalah atau memiliki pertanyaan, silakan buat issue di repository ini.
