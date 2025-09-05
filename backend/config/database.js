import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Legacy db export for compatibility
export const db = supabase;

// Test database connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Database connected successfully (Supabase)');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('📝 Make sure Supabase URL and API key are correct');
    return false;
  }
}

// Execute query with error handling (for raw SQL if needed)
export async function executeQuery(text, params = []) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql: text, params });
    if (error) throw error;
    return { rows: data };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Close database connection (Supabase handles this automatically)
export async function closeConnection() {
  console.log('Supabase connection closed (handled automatically)');
}

export default supabase;