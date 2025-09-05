import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { testConnection } from './src/config/database.js'
import attendanceRoutes from './src/api/attendance.js'
import studentRoutes from './src/api/students.js'
import authRoutes from './src/api/auth.js'
import settingsRoutes from './src/api/settings.js'

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Test database connection
await testConnection()

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/settings', settingsRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Fullstack server is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  })
})

// Serve static files in production
if (NODE_ENV === 'production') {
  // Serve static files from dist directory
  app.use(express.static(path.join(__dirname, 'dist')))
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
} else {
  // Development mode - Vite will handle frontend
  app.get('/', (req, res) => {
    res.json({
      message: 'Fullstack Development Server',
      frontend: 'http://localhost:3000 (Vite)',
      backend: `http://localhost:${PORT}/api`
    })
  })
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Fullstack server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${NODE_ENV}`)
  console.log(`🗄️  Database: Connected (Supabase)`)
})

export default app