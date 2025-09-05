// API Configuration
const getApiBaseUrl = () => {
  // Check if we're in production (Vercel)
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL_PROD || 'https://absensi-siswa-backend.vercel.app/api'
  }
  
  // Development environment
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
}

export const API_BASE_URL = getApiBaseUrl()

// Log the current API URL for debugging
console.log('🌐 API Base URL:', API_BASE_URL)
console.log('🔧 Environment:', import.meta.env.MODE)
console.log('🏗️ Production build:', import.meta.env.PROD)

export default {
  API_BASE_URL
}