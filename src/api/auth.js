import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/database.js'

const router = express.Router()

// Demo admin users - dalam implementasi nyata, ini harus disimpan di database
const demoUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
    name: 'Administrator',
    role: 'admin'
  },
  {
    id: 2,
    username: 'guru1',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: guru123
    name: 'Guru Kelas 1',
    role: 'teacher'
  },
  {
    id: 3,
    username: 'guru2',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: guru123
    name: 'Guru Kelas 2',
    role: 'teacher'
  }
]

// POST /api/auth/login - Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password harus diisi'
      })
    }
    
    // Find user (dalam implementasi nyata, query dari database)
    const user = demoUsers.find(u => u.username === username)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      })
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      })
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    )
    
    res.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      token
    })
    
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login'
    })
  }
})

// POST /api/auth/logout - Logout endpoint
router.post('/logout', (req, res) => {
  // Dalam implementasi nyata, bisa menambahkan token ke blacklist
  res.json({
    success: true,
    message: 'Logout berhasil'
  })
})

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  })
})

// Middleware untuk verifikasi token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token akses diperlukan'
    })
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token tidak valid'
      })
    }
    
    req.user = user
    next()
  })
}

// POST /api/auth/change-password - Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama dan baru harus diisi'
      })
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter'
      })
    }
    
    // Find user
    const user = demoUsers.find(u => u.id === req.user.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      })
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Password lama salah'
      })
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    
    // Update password (dalam implementasi nyata, update ke database)
    user.password = hashedNewPassword
    
    res.json({
      success: true,
      message: 'Password berhasil diubah'
    })
    
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengubah password'
    })
  }
})

// Utility function untuk hash password (untuk setup awal)
router.post('/hash-password', async (req, res) => {
  try {
    const { password } = req.body
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password diperlukan'
      })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    res.json({
      success: true,
      hashedPassword
    })
    
  } catch (error) {
    console.error('Error hashing password:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat hash password'
    })
  }
})

export { authenticateToken }
export default router