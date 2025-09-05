import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

async function updateAttendanceDate() {
  let connection
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'absensi_siswa'
    })
    
    console.log('Connected to database successfully!')
    
    const today = new Date().toISOString().split('T')[0]
    console.log(`Updating attendance dates to: ${today}`)
    
    // Update all attendance records to today's date
    const [result] = await connection.execute(
      'UPDATE attendances SET date = ? WHERE date != ?',
      [today, today]
    )
    
    console.log(`✅ Updated ${result.affectedRows} attendance records to today's date`)
    
    // Show updated data
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM attendances WHERE date = ?',
      [today]
    )
    
    console.log(`📊 Total attendance records for today: ${rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Error updating attendance dates:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

// Run the update
updateAttendanceDate()