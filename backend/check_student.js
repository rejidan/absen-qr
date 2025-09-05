import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkStudent() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'absensi_siswa',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 Checking for student with NIS 202412001...');
    
    // Check for exact NIS
    const [exactMatch] = await connection.execute(
      'SELECT * FROM students WHERE nis = ?',
      ['202412001']
    );
    
    if (exactMatch.length > 0) {
      console.log('✅ Found student with NIS 202412001:');
      console.log(exactMatch[0]);
    } else {
      console.log('❌ No student found with NIS 202412001');
    }
    
    // Check for similar NIS patterns
    console.log('\n🔍 Checking for students with similar NIS patterns...');
    const [similarNIS] = await connection.execute(
      'SELECT * FROM students WHERE nis LIKE ? OR nis LIKE ?',
      ['%2024%', '%202412%']
    );
    
    if (similarNIS.length > 0) {
      console.log('📋 Found students with similar NIS:');
      similarNIS.forEach(student => {
        console.log(`- ${student.nis}: ${student.name} (${student.class})`);
      });
    } else {
      console.log('❌ No students found with similar NIS patterns');
    }
    
    // Show all students
    console.log('\n📋 All students in database:');
    const [allStudents] = await connection.execute('SELECT nis, name, class FROM students ORDER BY nis');
    allStudents.forEach(student => {
      console.log(`- ${student.nis}: ${student.name} (${student.class})`);
    });
    
    // Check attendance for today
    console.log('\n📅 Attendance records for today:');
    const [todayAttendance] = await connection.execute(`
      SELECT s.nis, s.name, s.class, a.time_in, a.time_out, a.status, a.created_at
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      WHERE a.date = CURDATE()
      ORDER BY a.created_at DESC
    `);
    
    if (todayAttendance.length > 0) {
      console.log('✅ Today\'s attendance records:');
      todayAttendance.forEach(record => {
        console.log(`- ${record.nis}: ${record.name} - ${record.status} at ${record.created_at}`);
      });
    } else {
      console.log('❌ No attendance records found for today');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkStudent();