<template>
  <div class="login-container">
    <div class="card" style="max-width: 400px; margin: 50px auto;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #667eea; margin-bottom: 10px;">🎓 Sistem Absensi</h1>
        <p style="color: #6c757d;">Login Admin/Guru</p>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username" style="display: block; margin-bottom: 5px; font-weight: 600;">Username:</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            class="form-control" 
            placeholder="Masukkan username"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="password" style="display: block; margin-bottom: 5px; font-weight: 600;">Password:</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            class="form-control" 
            placeholder="Masukkan password"
            required
          >
        </div>
        
        <div v-if="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>
        
        <button type="submit" class="btn btn-success" style="width: 100%;" :disabled="isLoading">
          {{ isLoading ? '⏳ Loading...' : '🔐 Login' }}
        </button>
      </form>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">
        <small style="color: #6c757d;">
          <strong>Demo Credentials:</strong><br>
          Username: admin | Password: admin123<br>
          Username: guru1 | Password: guru123
        </small>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const username = ref('')
    const password = ref('')
    const errorMessage = ref('')
    const isLoading = ref(false)
    
    // Demo credentials - dalam implementasi nyata, ini harus divalidasi dengan backend
    const validCredentials = [
      { username: 'admin', password: 'admin123', name: 'Administrator' },
      { username: 'guru1', password: 'guru123', name: 'Guru Kelas 1' },
      { username: 'guru2', password: 'guru123', name: 'Guru Kelas 2' }
    ]
    
    const handleLogin = async () => {
      isLoading.value = true
      errorMessage.value = ''
      
      // Simulasi delay loading
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const user = validCredentials.find(
        cred => cred.username === username.value && cred.password === password.value
      )
      
      if (user) {
        // Set authentication status
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('adminName', user.name)
        
        // Redirect ke scanner
        router.push('/scanner')
      } else {
        errorMessage.value = 'Username atau password salah!'
      }
      
      isLoading.value = false
    }
    
    return {
      username,
      password,
      errorMessage,
      isLoading,
      handleLogin
    }
  }
}
</script>