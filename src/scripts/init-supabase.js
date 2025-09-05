import { db, executeQuery } from '../config/database.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function initSupabase() {
  try {
    console.log('🔄 Initializing Supabase database...')
    
    // Read and execute the Supabase schema
    const schemaPath = path.join(__dirname, '../../database/supabase_schema.sql')
    const schema = await fs.readFile(schemaPath, 'utf8')
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          await executeQuery(statement)
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`)
        } catch (error) {
          // Skip errors for statements that might already exist
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`)
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message)
            console.error('Statement:', statement.substring(0, 100) + '...')
          }
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying database setup...')
    
    const tablesResult = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    console.log('📊 Tables created:')
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    
    // Check data counts
    const studentsResult = await executeQuery('SELECT COUNT(*) as count FROM students')
    const attendancesResult = await executeQuery('SELECT COUNT(*) as count FROM attendances')
    const settingsResult = await executeQuery('SELECT COUNT(*) as count FROM settings')
    
    console.log('\n📈 Data summary:')
    console.log(`   Students: ${studentsResult.rows[0].count}`)
    console.log(`   Attendances: ${attendancesResult.rows[0].count}`)
    console.log(`   Settings: ${settingsResult.rows[0].count}`)
    
    console.log('\n🎉 Supabase database initialization completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Update your .env file with Supabase DATABASE_URL')
    console.log('   2. Install dependencies: npm install')
    console.log('   3. Start the backend server: npm run dev')
    console.log('   4. Deploy to Vercel')
    
  } catch (error) {
    console.error('❌ Error initializing Supabase database:', error.message)
    console.error('Stack trace:', error.stack)
    
    if (error.message.includes('connect')) {
      console.log('\n💡 Connection Tips:')
      console.log('   - Check your DATABASE_URL in .env file')
      console.log('   - Make sure Supabase project is active')
      console.log('   - Verify network connectivity')
    }
    
    process.exit(1)
  } finally {
    // Close database connection
    await db.end()
    console.log('\n🔌 Database connection closed')
  }
}

// Run the initialization
initSupabase()