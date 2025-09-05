import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306
}

const dbName = process.env.DB_NAME || 'absensi_siswa'

async function initDatabase() {
  let connection
  
  try {
    console.log('🔄 Connecting to MySQL...')
    
    // Connect to MySQL without specifying database
    connection = await mysql.createConnection(dbConfig)
    
    console.log('✅ Connected to MySQL')
    
    // Create database if not exists
    console.log(`🔄 Creating database '${dbName}' if not exists...`)
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
    console.log(`✅ Database '${dbName}' ready`)
    
    // Use the database
    await connection.execute(`USE \`${dbName}\``)
    
    // Create students table
    console.log('🔄 Creating students table...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nis VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        class VARCHAR(20) NOT NULL,
        qr_code VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nis (nis),
        INDEX idx_qr_code (qr_code),
        INDEX idx_class (class)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✅ Students table created')
    
    // Create attendances table
    console.log('🔄 Creating attendances table...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        status ENUM('hadir', 'izin', 'sakit', 'alpha') NOT NULL DEFAULT 'hadir',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_date (student_id, date),
        INDEX idx_date (date),
        INDEX idx_status (status),
        INDEX idx_student_date (student_id, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✅ Attendances table created')
    
    // Insert sample data
    console.log('🔄 Inserting sample data...')
    
    // Check if students already exist
    const [existingStudents] = await connection.execute('SELECT COUNT(*) as count FROM students')
    
    if (existingStudents[0].count === 0) {
      // Insert sample students
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
        ['2023010', 'Jihan Aulia', 'XII IPA 3', 'QR_2023010_1234567899']
      ]
      
      for (const student of sampleStudents) {
        await connection.execute(
          'INSERT INTO students (nis, name, class, qr_code) VALUES (?, ?, ?, ?)',
          student
        )
      }
      
      console.log('✅ Sample students inserted')
      
      // Insert sample attendance for today
      const today = new Date().toISOString().split('T')[0]
      const sampleAttendances = [
        [1, today, '07:15:30', 'hadir'],
        [2, today, '07:20:15', 'hadir'],
        [3, today, '07:25:45', 'hadir'],
        [4, today, '07:30:20', 'izin'],
        [5, today, '07:35:10', 'sakit']
      ]
      
      for (const attendance of sampleAttendances) {
        try {
          await connection.execute(
            'INSERT INTO attendances (student_id, date, time, status) VALUES (?, ?, ?, ?)',
            attendance
          )
        } catch (error) {
          // Skip if duplicate entry (student already has attendance for today)
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error
          }
        }
      }
      
      console.log('✅ Sample attendance inserted')
    } else {
      console.log('ℹ️  Sample data already exists, skipping insertion')
    }
    
    // Show database info
    console.log('\n📊 Database Summary:')
    
    const [studentCount] = await connection.execute('SELECT COUNT(*) as count FROM students')
    console.log(`   Students: ${studentCount[0].count}`)
    
    const [attendanceCount] = await connection.execute('SELECT COUNT(*) as count FROM attendances')
    console.log(`   Attendance records: ${attendanceCount[0].count}`)
    
    const [classCount] = await connection.execute('SELECT COUNT(DISTINCT class) as count FROM students')
    console.log(`   Classes: ${classCount[0].count}`)
    
    console.log('\n🎉 Database initialization completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Start the backend server: npm run dev')
    console.log('   2. Generate QR codes: npm run generate-qr')
    console.log('   3. Start the frontend: cd ../frontend && npm run dev')
    
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Tips:')
      console.log('   - Check your MySQL username and password in .env file')
      console.log('   - Make sure MySQL server is running')
      console.log('   - Verify database connection settings')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tips:')
      console.log('   - Make sure MySQL server is running')
      console.log('   - Check if MySQL is running on the correct port (default: 3306)')
      console.log('   - Verify host settings in .env file')
    }
    
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Run the initialization
initDatabase()