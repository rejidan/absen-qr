-- =====================================================
-- Supabase PostgreSQL Schema untuk Sistem Absensi Siswa QR Code
-- =====================================================

-- Enable UUID extension for better primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: students
-- Menyimpan data siswa dan QR code unik
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  nis VARCHAR(20) NOT NULL UNIQUE, -- Nomor Induk Siswa
  name VARCHAR(100) NOT NULL, -- Nama lengkap siswa
  class VARCHAR(20) NOT NULL, -- Kelas siswa (contoh: XII IPA 1)
  qr_code VARCHAR(255) NOT NULL UNIQUE, -- QR code unik untuk absensi
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_nis ON students(nis);
CREATE INDEX IF NOT EXISTS idx_students_qr_code ON students(qr_code);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);

-- =====================================================
-- Table: attendances
-- Menyimpan record absensi siswa
-- =====================================================
CREATE TABLE IF NOT EXISTS attendances (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- Tanggal absensi
  time_in TIME, -- Waktu masuk
  time_out TIME, -- Waktu keluar
  status VARCHAR(20) NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpha')), -- Status kehadiran
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status);
CREATE INDEX IF NOT EXISTS idx_attendances_student_date ON attendances(student_id, date);

-- =====================================================
-- Table: settings
-- Menyimpan pengaturan sistem seperti jam datang dan pulang
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(50) NOT NULL UNIQUE, -- Kunci pengaturan
  setting_value VARCHAR(255) NOT NULL, -- Nilai pengaturan
  description TEXT, -- Deskripsi pengaturan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- View: v_attendance_report
-- View untuk laporan absensi
-- =====================================================
CREATE OR REPLACE VIEW v_attendance_report AS
SELECT 
    a.id,
    a.date,
    a.time_in,
    a.time_out,
    a.status,
    s.nis,
    s.name as student_name,
    s.class,
    a.created_at as scan_time
FROM attendances a
JOIN students s ON a.student_id = s.id
ORDER BY a.date DESC, a.time_in DESC;

-- =====================================================
-- Insert default settings
-- =====================================================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('arrival_time_start', '06:30:00', 'Jam mulai absensi datang'),
('arrival_time_end', '07:30:00', 'Jam akhir absensi datang (setelah ini dianggap terlambat)'),
('departure_time_start', '15:00:00', 'Jam mulai absensi pulang'),
('departure_time_end', '17:00:00', 'Jam akhir absensi pulang'),
('late_tolerance', '15', 'Toleransi keterlambatan dalam menit'),
('school_name', 'SMA Negeri 1 Jakarta', 'Nama sekolah')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- Sample Data untuk Testing
-- =====================================================
INSERT INTO students (nis, name, class, qr_code) VALUES
('2023001', 'Ahmad Rizki Pratama', 'XII IPA 1', 'QR_2023001_1234567890'),
('2023002', 'Siti Nurhaliza', 'XII IPA 1', 'QR_2023002_1234567891'),
('2023003', 'Budi Santoso', 'XII IPS 1', 'QR_2023003_1234567892'),
('2023004', 'Dewi Lestari', 'XII IPS 1', 'QR_2023004_1234567893'),
('2023005', 'Eko Prasetyo', 'XII IPA 2', 'QR_2023005_1234567894'),
('2023006', 'Fitri Handayani', 'XII IPA 2', 'QR_2023006_1234567895'),
('2023007', 'Galih Permana', 'XII IPS 2', 'QR_2023007_1234567896'),
('2023008', 'Hani Safitri', 'XII IPS 2', 'QR_2023008_1234567897'),
('2023009', 'Indra Gunawan', 'XII IPA 3', 'QR_2023009_1234567898'),
('2023010', 'Jihan Aulia', 'XII IPA 3', 'QR_2023010_1234567899'),
('2023011', 'Krisna Wijaya', 'XII IPA 1', 'QR_2023011_1234567900'),
('2023012', 'Lina Marlina', 'XII IPS 1', 'QR_2023012_1234567901'),
('2023013', 'Muhammad Fadli', 'XII IPA 2', 'QR_2023013_1234567902'),
('2023014', 'Nisa Rahmawati', 'XII IPS 2', 'QR_2023014_1234567903'),
('2023015', 'Omar Syahputra', 'XII IPA 3', 'QR_2023015_1234567904')
ON CONFLICT (nis) DO NOTHING;

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON students FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON students FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON students FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON attendances FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON attendances FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON attendances FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON attendances FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON settings FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON settings FOR DELETE USING (true);