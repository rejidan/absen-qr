<template>
  <div id="app">
    <nav class="navbar" v-if="isAuthenticated">
      <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div class="navbar-brand">📱 Sistem Absensi QR</div>
          <div class="nav-links">
            <router-link to="/scanner" class="nav-link" :class="{ active: $route.path === '/scanner' }">
              📷 Scan QR
            </router-link>
            <router-link to="/dashboard" class="nav-link" :class="{ active: $route.path === '/dashboard' }">
              📊 Dashboard
            </router-link>
            <router-link to="/students" class="nav-link" :class="{ active: $route.path === '/students' }">
              👥 Manajemen Siswa
            </router-link>
            <router-link to="/settings" class="nav-link" :class="{ active: $route.path === '/settings' }">
              ⚙️ Pengaturan
            </router-link>
            <button @click="logout" class="btn" style="margin-left: 10px;">
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'App',
  setup() {
    const router = useRouter()
    const isAuthenticated = ref(false)
    
    const checkAuth = () => {
      isAuthenticated.value = !!localStorage.getItem('isAuthenticated')
    }
    
    const logout = () => {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('adminName')
      isAuthenticated.value = false
      router.push('/login')
    }
    
    onMounted(() => {
      checkAuth()
      // Listen untuk perubahan route
      router.afterEach(() => {
        checkAuth()
      })
    })
    
    return {
      isAuthenticated,
      logout
    }
  }
}
</script>