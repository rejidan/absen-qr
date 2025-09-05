-- =====================================================
-- Update Schema untuk Mendukung Jam Masuk dan Jam Keluar
-- =====================================================

USE `absensi_siswa`;

-- Backup data existing attendance
CREATE TABLE IF NOT EXISTS `attendances_backup` AS SELECT * FROM `attendances`;

-- Drop foreign key constraint temporarily
ALTER TABLE `attendances` DROP FOREIGN KEY `attendances_ibfk_1`;

-- Drop unique constraint temporarily
ALTER TABLE `attendances` DROP INDEX `unique_student_date`;

-- Add new columns for time_in and time_out
ALTER TABLE `attendances` 
ADD COLUMN `time_in` TIME NULL COMMENT 'Waktu masuk' AFTER `date`,
ADD COLUMN `time_out` TIME NULL COMMENT 'Waktu keluar' AFTER `time_in`;

-- Migrate existing data: move time to time_in
UPDATE `attendances` SET `time_in` = `time` WHERE `time` IS NOT NULL;

-- Drop old time column
ALTER TABLE `attendances` DROP COLUMN `time`;

-- Recreate foreign key constraint
ALTER TABLE `attendances` 
ADD CONSTRAINT `attendances_ibfk_1` 
FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE;

-- Update unique constraint to allow multiple records per day (for in/out)
-- But we'll handle this in application logic instead

-- Update the view
DROP VIEW IF EXISTS `v_attendance_report`;
CREATE VIEW `v_attendance_report` AS
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

-- Insert sample data for testing
SET @today = CURDATE();

-- Clear existing data for today
DELETE FROM `attendances` WHERE `date` = @today;

-- Insert sample attendance with time_in and time_out
INSERT INTO `attendances` (`student_id`, `date`, `time_in`, `time_out`, `status`) VALUES
(1, @today, '08:15:00', '16:30:00', 'hadir'),
(2, @today, '08:20:00', '16:25:00', 'hadir'),
(3, @today, '08:25:00', NULL, 'hadir'),
(4, @today, NULL, NULL, 'izin'),
(5, @today, NULL, NULL, 'sakit'),
(6, @today, '08:10:00', '16:35:00', 'hadir'),
(7, @today, '08:45:00', NULL, 'hadir'),
(8, @today, '08:05:00', '16:40:00', 'hadir'),
(9, @today, '08:30:00', '16:15:00', 'hadir'),
(10, @today, '09:00:00', NULL, 'hadir');

SELECT 'Schema update completed successfully!' as message;