// API Configuration for Fullstack App
const getApiBaseUrl = () => {
  // In fullstack architecture, API is served from the same origin
  if (import.meta.env.PROD) {
    // Production: API served from same domain
    return '/api'
  }
  
  // Development: Use Vite proxy to backend server
  return '/api'
}

export const API_BASE_URL = getApiBaseUrl()

// Log the current API URL for debugging
console.log('🌐 API Base URL:', API_BASE_URL)
console.log('🔧 Environment:', import.meta.env.MODE)
console.log('🏗️ Production build:', import.meta.env.PROD)

export default {
  API_BASE_URL
}