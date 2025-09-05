import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306
};

// Database name
const dbName = process.env.DB_NAME || 'absensi_siswa';

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to MySQL server...');
    
    // Connect to MySQL server (without database)
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL server');
    
    // Create database if not exists
    console.log(`🔄 Creating database '${dbName}' if not exists...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' ready`);
    
    // Close connection and reconnect with database
    await connection.end();
    
    // Reconnect with database selected
    connection = await mysql.createConnection({
      ...dbConfig,
      database: dbName
    });
    
    // Create students table
    console.log('🔄 Creating students table...');
    const createStudentsTable = `
      CREATE TABLE IF NOT EXISTS \`students\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nis\` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Nomor Induk Siswa',
        \`name\` VARCHAR(100) NOT NULL COMMENT 'Nama lengkap siswa',
        \`class\` VARCHAR(20) NOT NULL COMMENT 'Kelas siswa',
        \`qr_code\` VARCHAR(255) NOT NULL UNIQUE COMMENT 'QR code unik untuk absensi',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX \`idx_nis\` (\`nis\`),
        INDEX \`idx_qr_code\` (\`qr_code\`),
        INDEX \`idx_class\` (\`class\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Tabel data siswa dengan QR code untuk absensi'
    `;
    
    await connection.execute(createStudentsTable);
    console.log('✅ Students table created/verified');
    
    // Create attendances table
    console.log('🔄 Creating attendances table...');
    const createAttendancesTable = `
      CREATE TABLE IF NOT EXISTS \`attendances\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`student_id\` INT NOT NULL COMMENT 'Foreign key ke tabel students',
        \`date\` DATE NOT NULL COMMENT 'Tanggal absensi',
        \`time\` TIME NOT NULL COMMENT 'Waktu absensi',
        \`status\` ENUM('hadir', 'terlambat', 'izin', 'sakit', 'alpha') NOT NULL DEFAULT 'hadir' COMMENT 'Status kehadiran',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_student_date\` (\`student_id\`, \`date\`),
        
        INDEX \`idx_date\` (\`date\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_student_date\` (\`student_id\`, \`date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Tabel record absensi siswa'
    `;
    
    await connection.execute(createAttendancesTable);
    console.log('✅ Attendances table created/verified');
    
    // Create settings table
    console.log('🔄 Creating settings table...');
    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS \`settings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`setting_key\` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Kunci pengaturan',
        \`setting_value\` VARCHAR(255) NOT NULL COMMENT 'Nilai pengaturan',
        \`description\` TEXT COMMENT 'Deskripsi pengaturan',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX \`idx_setting_key\` (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Tabel pengaturan sistem'
    `;
    
    await connection.execute(createSettingsTable);
    console.log('✅ Settings table created/verified');
    
    // Insert default settings
    console.log('🔄 Inserting default settings...');
    const defaultSettings = [
      ['arrival_time_start', '06:30:00', 'Jam mulai absensi datang'],
      ['arrival_time_end', '07:30:00', 'Jam akhir absensi datang (setelah ini dianggap terlambat)'],
      ['departure_time_start', '15:00:00', 'Jam mulai absensi pulang'],
      ['departure_time_end', '17:00:00', 'Jam akhir absensi pulang'],
      ['late_tolerance', '15', 'Toleransi keterlambatan dalam menit'],
      ['school_name', 'SMA Negeri 1 Jakarta', 'Nama sekolah']
    ];
    
    for (const setting of defaultSettings) {
      await connection.execute(
        'INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
        setting
      );
    }
    
    console.log('✅ Default settings inserted/verified');
    
    // Check if students table is empty and insert sample data
    const [studentsCount] = await connection.execute('SELECT COUNT(*) as count FROM students');
    
    if (studentsCount[0].count === 0) {
      console.log('🔄 Inserting sample student data...');
      
      const sampleStudents = [
        ['2023001', 'Ahmad Rizki Pratama', 'XII IPA 1', 'QR_2023001_1234567890'],
        ['2023002', 'Siti Nurhaliza', 'XII IPA 1', 'QR_2023002_1234567891'],
        ['2023003', 'Budi Santoso', 'XII IPS 1', 'QR_2023003_1234567892'],
        ['2023004', 'Dewi Lestari', 'XII IPS 1', 'QR_2023004_1234567893'],
        ['2023005', 'Eko Prasetyo', 'XII IPA 2', 'QR_2023005_1234567894'],
        ['2023006', 'Fitri Handayani', 'XII IPA 2', 'QR_2023006_1234567895'],
        ['2023007', 'Galih Permana', 'XII IPS 2', 'QR_2023007_1234567896'],
        ['2023008', 'Hani Safitri', 'XII IPS 2', 'QR_2023008_1234567897'],
        ['2023009', 'Indra Gunawan', 'XII IPA 3', 'QR_2023009_1234567898'],
        ['2023010', 'Jihan Aulia', 'XII IPA 3', 'QR_2023010_1234567899'],
        ['2023011', 'Krisna Wijaya', 'XII IPA 1', 'QR_2023011_1234567900'],
        ['2023012', 'Lina Marlina', 'XII IPS 1', 'QR_2023012_1234567901'],
        ['2023013', 'Muhammad Fadli', 'XII IPA 2', 'QR_2023013_1234567902'],
        ['2023014', 'Nisa Rahmawati', 'XII IPS 2', 'QR_2023014_1234567903'],
        ['2023015', 'Omar Syahputra', 'XII IPA 3', 'QR_2023015_1234567904']
      ];
      
      const insertStudentQuery = 'INSERT INTO students (nis, name, class, qr_code) VALUES (?, ?, ?, ?)';
      
      for (const student of sampleStudents) {
        await connection.execute(insertStudentQuery, student);
      }
      
      console.log(`✅ Inserted ${sampleStudents.length} sample students`);
    } else {
      console.log(`ℹ️  Students table already contains ${studentsCount[0].count} records`);
    }
    
    // Check if attendances table is empty and insert sample data for today
    const [attendancesCount] = await connection.execute('SELECT COUNT(*) as count FROM attendances WHERE date = CURDATE()');
    
    if (attendancesCount[0].count === 0) {
      console.log('🔄 Inserting sample attendance data for today...');
      
      const sampleAttendances = [
        [1, 'CURDATE()', '07:15:30', 'hadir'],
        [2, 'CURDATE()', '07:20:15', 'hadir'],
        [3, 'CURDATE()', '07:25:45', 'hadir'],
        [4, 'CURDATE()', '07:30:20', 'izin'],
        [5, 'CURDATE()', '07:35:10', 'sakit'],
        [6, 'CURDATE()', '07:40:25', 'hadir'],
        [7, 'CURDATE()', '07:45:50', 'hadir'],
        [8, 'CURDATE()', '07:50:15', 'alpha']
      ];
      
      for (const attendance of sampleAttendances) {
        const insertAttendanceQuery = `INSERT INTO attendances (student_id, date, time, status) VALUES (?, ${attendance[1]}, ?, ?)`;
        await connection.execute(insertAttendanceQuery, [attendance[0], attendance[2], attendance[3]]);
      }
      
      console.log(`✅ Inserted ${sampleAttendances.length} sample attendance records for today`);
    } else {
      console.log(`ℹ️  Attendances table already contains ${attendancesCount[0].count} records for today`);
    }
    
    // Create views
    console.log('🔄 Creating database views...');
    
    // View for attendance report
    const createAttendanceReportView = `
      CREATE OR REPLACE VIEW \`v_attendance_report\` AS
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
      ORDER BY a.date DESC, a.time DESC
    `;
    
    await connection.execute(createAttendanceReportView);
    
    // View for daily stats
    const createDailyStatsView = `
      CREATE OR REPLACE VIEW \`v_daily_stats\` AS
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
      ORDER BY a.date DESC
    `;
    
    await connection.execute(createDailyStatsView);
    console.log('✅ Database views created');
    
    // Display summary
    console.log('\n📊 Database Summary:');
    console.log('==================');
    
    const [finalStudentsCount] = await connection.execute('SELECT COUNT(*) as count FROM students');
    const [finalAttendancesCount] = await connection.execute('SELECT COUNT(*) as count FROM attendances');
    const [classesCount] = await connection.execute('SELECT COUNT(DISTINCT class) as count FROM students');
    
    console.log(`👥 Total Students: ${finalStudentsCount[0].count}`);
    console.log(`📚 Total Classes: ${classesCount[0].count}`);
    console.log(`📝 Total Attendance Records: ${finalAttendancesCount[0].count}`);
    
    // Show classes
    const [classes] = await connection.execute('SELECT DISTINCT class FROM students ORDER BY class');
    console.log(`🏫 Available Classes: ${classes.map(c => c.class).join(', ')}`);
    
    // Show today's attendance stats
    const [todayStats] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM attendances 
      WHERE date = CURDATE()
      GROUP BY status
    `);
    
    if (todayStats.length > 0) {
      console.log('\n📅 Today\'s Attendance:');
      todayStats.forEach(stat => {
        console.log(`   ${stat.status}: ${stat.count}`);
      });
    }
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Generate QR codes: node scripts/generate-qr.js');
    console.log('   3. Start the frontend: cd ../frontend && npm run dev');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Please check your database credentials in .env file');
      console.error('   Make sure MySQL is running and credentials are correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Cannot connect to MySQL server');
      console.error('   Make sure MySQL is running on the specified host and port');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the initialization
initDatabase();

export { initDatabase };