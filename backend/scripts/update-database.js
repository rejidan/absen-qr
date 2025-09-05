import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

async function updateDatabase() {
  let connection
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'absensi_siswa',
      multipleStatements: true
    })
    
    console.log('Connected to database successfully!')
    
    // Execute update queries step by step
    console.log('Starting database schema update...')
    
    // 1. Backup existing data
    console.log('1. Creating backup table...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendances_backup AS 
      SELECT * FROM attendances
    `)
    
    // 2. Check if columns already exist
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM attendances LIKE 'time_in'
    `)
    
    if (columns.length === 0) {
      console.log('2. Adding time_in and time_out columns...')
      
      // Add new columns
      await connection.execute(`
        ALTER TABLE attendances 
        ADD COLUMN time_in TIME NULL COMMENT 'Waktu masuk' AFTER date,
        ADD COLUMN time_out TIME NULL COMMENT 'Waktu keluar' AFTER time_in
      `)
      
      // 3. Migrate existing data
      console.log('3. Migrating existing data...')
      await connection.execute(`
        UPDATE attendances SET time_in = time WHERE time IS NOT NULL
      `)
      
      // 4. Drop old time column
      console.log('4. Dropping old time column...')
      await connection.execute(`
        ALTER TABLE attendances DROP COLUMN time
      `)
    } else {
      console.log('2. Columns already exist, skipping schema update...')
    }
    
    // 5. Update view
    console.log('5. Updating view...')
    await connection.execute(`
      DROP VIEW IF EXISTS v_attendance_report
    `)
    
    await connection.execute(`
      CREATE VIEW v_attendance_report AS
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
      ORDER BY a.date DESC, a.time_in DESC
    `)
    
    // 6. Insert sample data
    console.log('6. Inserting sample data...')
    const today = new Date().toISOString().split('T')[0]
    
    // Clear existing data for today
    await connection.execute(`
      DELETE FROM attendances WHERE date = ?
    `, [today])
    
    // Insert sample attendance data
    await connection.execute(`
      INSERT INTO attendances (student_id, date, time_in, time_out, status) VALUES
      (1, ?, '08:15:00', '16:30:00', 'hadir'),
      (2, ?, '08:20:00', '16:25:00', 'hadir'),
      (3, ?, '08:25:00', NULL, 'hadir'),
      (4, ?, NULL, NULL, 'izin'),
      (5, ?, NULL, NULL, 'sakit'),
      (6, ?, '08:10:00', '16:35:00', 'hadir'),
      (7, ?, '08:45:00', NULL, 'hadir'),
      (8, ?, '08:05:00', '16:40:00', 'hadir'),
      (9, ?, '08:30:00', '16:15:00', 'hadir'),
      (10, ?, '09:00:00', NULL, 'hadir')
    `, [today, today, today, today, today, today, today, today, today, today])
    
    console.log('✅ Database schema update completed successfully!')
    console.log(`✅ Sample data inserted for date: ${today}`)
    
  } catch (error) {
    console.error('❌ Error updating database:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

// Run the update
updateDatabase()