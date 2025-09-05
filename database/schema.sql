-- =====================================================
-- Database Schema untuk Sistem Absensi Siswa QR Code
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS `absensi_siswa` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `absensi_siswa`;

-- =====================================================
-- Table: students
-- Menyimpan data siswa dan QR code unik
-- =====================================================
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nis` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Nomor Induk Siswa',
  `name` VARCHAR(100) NOT NULL COMMENT 'Nama lengkap siswa',
  `class` VARCHAR(20) NOT NULL COMMENT 'Kelas siswa (contoh: XII IPA 1)',
  `qr_code` VARCHAR(255) NOT NULL UNIQUE COMMENT 'QR code unik untuk absensi',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes untuk performa
  INDEX `idx_nis` (`nis`),
  INDEX `idx_qr_code` (`qr_code`),
  INDEX `idx_class` (`class`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabel data siswa dengan QR code untuk absensi';

-- =====================================================
-- Table: attendances
-- Menyimpan record absensi siswa
-- =====================================================
CREATE TABLE IF NOT EXISTS `attendances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL COMMENT 'Foreign key ke tabel students',
  `date` DATE NOT NULL COMMENT 'Tanggal absensi',
  `time` TIME NOT NULL COMMENT 'Waktu absensi',
  `status` ENUM('hadir', 'terlambat', 'izin', 'sakit', 'alpha') NOT NULL DEFAULT 'hadir' COMMENT 'Status kehadiran',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  
  -- Unique constraint: satu siswa hanya bisa absen sekali per hari
  UNIQUE KEY `unique_student_date` (`student_id`, `date`),
  
  -- Indexes untuk performa
  INDEX `idx_date` (`date`),
  INDEX `idx_status` (`status`),
  INDEX `idx_student_date` (`student_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabel record absensi siswa';

-- =====================================================
-- Table: settings
-- Menyimpan pengaturan sistem seperti jam datang dan pulang
-- =====================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Kunci pengaturan',
  `setting_value` VARCHAR(255) NOT NULL COMMENT 'Nilai pengaturan',
  `description` TEXT COMMENT 'Deskripsi pengaturan',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Index untuk performa
  INDEX `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabel pengaturan sistem';

-- Insert default settings untuk jam datang dan pulang
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
('arrival_time_start', '06:30:00', 'Jam mulai absensi datang'),
('arrival_time_end', '07:30:00', 'Jam akhir absensi datang (setelah ini dianggap terlambat)'),
('departure_time_start', '15:00:00', 'Jam mulai absensi pulang'),
('departure_time_end', '17:00:00', 'Jam akhir absensi pulang'),
('late_tolerance', '15', 'Toleransi keterlambatan dalam menit'),
('school_name', 'SMA Negeri 1 Jakarta', 'Nama sekolah');

-- =====================================================
-- Sample Data untuk Testing
-- =====================================================

-- Insert sample students
INSERT IGNORE INTO `students` (`nis`, `name`, `class`, `qr_code`) VALUES
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
('2023015', 'Omar Syahputra', 'XII IPA 3', 'QR_2023015_1234567904');

-- Insert sample attendance for today (optional)
-- Uncomment lines below if you want sample attendance data
/*
SET @today = CURDATE();
INSERT IGNORE INTO `attendances` (`student_id`, `date`, `time`, `status`) VALUES
(1, @today, '07:15:30', 'hadir'),
(2, @today, '07:20:15', 'hadir'),
(3, @today, '07:25:45', 'hadir'),
(4, @today, '07:30:20', 'izin'),
(5, @today, '07:35:10', 'sakit'),
(6, @today, '07:40:25', 'hadir'),
(7, @today, '07:45:50', 'hadir'),
(8, @today, '07:50:15', 'alpha');
*/

-- =====================================================
-- Useful Queries untuk Monitoring
-- =====================================================

-- Query untuk melihat statistik absensi hari ini
/*
SELECT 
    a.status,
    COUNT(*) as jumlah,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM attendances WHERE date = CURDATE()), 2) as persentase
FROM attendances a 
WHERE a.date = CURDATE()
GROUP BY a.status
ORDER BY jumlah DESC;
*/

-- Query untuk melihat absensi per kelas hari ini
/*
SELECT 
    s.class,
    COUNT(a.id) as total_absen,
    SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) as hadir,
    SUM(CASE WHEN a.status = 'izin' THEN 1 ELSE 0 END) as izin,
    SUM(CASE WHEN a.status = 'sakit' THEN 1 ELSE 0 END) as sakit,
    SUM(CASE WHEN a.status = 'alpha' THEN 1 ELSE 0 END) as alpha
FROM students s
LEFT JOIN attendances a ON s.id = a.student_id AND a.date = CURDATE()
GROUP BY s.class
ORDER BY s.class;
*/

-- Query untuk melihat siswa yang belum absen hari ini
/*
SELECT 
    s.nis,
    s.name,
    s.class
FROM students s
LEFT JOIN attendances a ON s.id = a.student_id AND a.date = CURDATE()
WHERE a.id IS NULL
ORDER BY s.class, s.name;
*/

-- =====================================================
-- Views untuk Kemudahan Query
-- =====================================================

-- View untuk laporan absensi lengkap
CREATE OR REPLACE VIEW `v_attendance_report` AS
SELECT 
    a.id,
    a.date,
    a.time,
    a.status,
    s.nis,
    s.name as student_name,
    s.class,
    a.created_at as scan_time
FROM attendances a
JOIN students s ON a.student_id = s.id
ORDER BY a.date DESC, a.time DESC;

-- View untuk statistik harian
CREATE OR REPLACE VIEW `v_daily_stats` AS
SELECT 
    a.date,
    COUNT(*) as total_records,
    SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) as hadir,
    SUM(CASE WHEN a.status = 'izin' THEN 1 ELSE 0 END) as izin,
    SUM(CASE WHEN a.status = 'sakit' THEN 1 ELSE 0 END) as sakit,
    SUM(CASE WHEN a.status = 'alpha' THEN 1 ELSE 0 END) as alpha,
    ROUND(SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as persentase_hadir
FROM attendances a
GROUP BY a.date
ORDER BY a.date DESC;

-- =====================================================
-- Stored Procedures (Optional)
-- =====================================================

-- Procedure untuk reset absensi (untuk testing)
DELIMITER //
CREATE PROCEDURE `sp_reset_attendance`(IN target_date DATE)
BEGIN
    DELETE FROM attendances WHERE date = target_date;
    SELECT CONCAT('Attendance data for ', target_date, ' has been reset.') as message;
END //
DELIMITER ;

-- Procedure untuk generate laporan bulanan
DELIMITER //
CREATE PROCEDURE `sp_monthly_report`(IN target_month INT, IN target_year INT)
BEGIN
    SELECT 
        s.nis,
        s.name,
        s.class,
        COUNT(a.id) as total_absen,
        SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN a.status = 'izin' THEN 1 ELSE 0 END) as izin,
        SUM(CASE WHEN a.status = 'sakit' THEN 1 ELSE 0 END) as sakit,
        SUM(CASE WHEN a.status = 'alpha' THEN 1 ELSE 0 END) as alpha,
        ROUND(SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id), 2) as persentase_kehadiran
    FROM students s
    LEFT JOIN attendances a ON s.id = a.student_id 
        AND MONTH(a.date) = target_month 
        AND YEAR(a.date) = target_year
    GROUP BY s.id, s.nis, s.name, s.class
    ORDER BY s.class, s.name;
END //
DELIMITER ;

-- =====================================================
-- Indexes Tambahan untuk Optimasi (jika diperlukan)
-- =====================================================

-- Index komposit untuk query yang sering digunakan
-- ALTER TABLE attendances ADD INDEX idx_date_status (date, status);
-- ALTER TABLE students ADD INDEX idx_class_name (class, name);

-- =====================================================
-- Triggers untuk Audit Trail (Optional)
-- =====================================================

-- Trigger untuk log perubahan status absensi
/*
CREATE TABLE IF NOT EXISTS attendance_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_id INT,
    old_status ENUM('hadir', 'izin', 'sakit', 'alpha'),
    new_status ENUM('hadir', 'izin', 'sakit', 'alpha'),
    changed_by VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELIMITER //
CREATE TRIGGER tr_attendance_update 
AFTER UPDATE ON attendances
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO attendance_audit (attendance_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, USER());
    END IF;
END //
DELIMITER ;
*/

-- =====================================================
-- End of Schema
-- =====================================================