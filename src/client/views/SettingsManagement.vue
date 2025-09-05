<template>
  <div class="settings-management">
    <!-- Header -->
    <div class="header">
      <h1>⚙️ Pengaturan Sistem</h1>
      <p class="subtitle">Kelola jam datang, jam pulang, dan pengaturan lainnya</p>
    </div>

    <!-- Settings Form -->
    <div class="settings-container">
      <div class="settings-card">
        <div class="card-header">
          <h2>🕐 Pengaturan Waktu Absensi</h2>
          <p>Atur jam datang dan jam pulang untuk sistem absensi</p>
        </div>
        
        <form @submit.prevent="saveSettings" class="settings-form">
          <!-- Jam Datang -->
          <div class="time-section">
            <h3>📅 Jam Datang</h3>
            <div class="time-inputs">
              <div class="form-group">
                <label for="arrival_time_start">Mulai Jam Datang:</label>
                <input 
                  id="arrival_time_start"
                  v-model="settings.arrival_time_start" 
                  type="time" 
                  required
                  class="time-input"
                >
                <small class="help-text">Waktu paling awal siswa bisa absen datang</small>
              </div>
              
              <div class="form-group">
                <label for="arrival_time_end">Batas Jam Datang:</label>
                <input 
                  id="arrival_time_end"
                  v-model="settings.arrival_time_end" 
                  type="time" 
                  required
                  class="time-input"
                >
                <small class="help-text">Batas waktu absen datang (setelah ini dianggap terlambat)</small>
              </div>
            </div>
          </div>

          <!-- Jam Pulang -->
          <div class="time-section">
            <h3>🏠 Jam Pulang</h3>
            <div class="time-inputs">
              <div class="form-group">
                <label for="departure_time_start">Mulai Jam Pulang:</label>
                <input 
                  id="departure_time_start"
                  v-model="settings.departure_time_start" 
                  type="time" 
                  required
                  class="time-input"
                >
                <small class="help-text">Waktu paling awal siswa bisa absen pulang</small>
              </div>
              
              <div class="form-group">
                <label for="departure_time_end">Batas Jam Pulang:</label>
                <input 
                  id="departure_time_end"
                  v-model="settings.departure_time_end" 
                  type="time" 
                  required
                  class="time-input"
                >
                <small class="help-text">Batas waktu absen pulang</small>
              </div>
            </div>
          </div>

          <!-- Toleransi Keterlambatan -->
          <div class="time-section">
            <h3>⏰ Toleransi Keterlambatan</h3>
            <div class="form-group">
              <label for="late_tolerance">Toleransi Terlambat (menit):</label>
              <input 
                id="late_tolerance"
                v-model.number="settings.late_tolerance" 
                type="number" 
                min="0" 
                max="60" 
                required
                class="number-input"
              >
              <small class="help-text">Berapa menit toleransi sebelum dianggap terlambat</small>
            </div>
          </div>

          <!-- Pengaturan Sekolah -->
          <div class="time-section">
            <h3>🏫 Informasi Sekolah</h3>
            <div class="form-group">
              <label for="school_name">Nama Sekolah:</label>
              <input 
                id="school_name"
                v-model="settings.school_name" 
                type="text" 
                required
                class="text-input"
                placeholder="Masukkan nama sekolah"
              >
              <small class="help-text">Nama sekolah yang akan ditampilkan di sistem</small>
            </div>
          </div>

          <!-- Preview Jadwal -->
          <div class="schedule-preview">
            <h3>📋 Preview Jadwal</h3>
            <div class="preview-content">
              <div class="schedule-item">
                <span class="schedule-label">🌅 Jam Datang:</span>
                <span class="schedule-time">{{ settings.arrival_time_start }} - {{ settings.arrival_time_end }}</span>
              </div>
              <div class="schedule-item">
                <span class="schedule-label">🌇 Jam Pulang:</span>
                <span class="schedule-time">{{ settings.departure_time_start }} - {{ settings.departure_time_end }}</span>
              </div>
              <div class="schedule-item">
                <span class="schedule-label">⏰ Toleransi:</span>
                <span class="schedule-time">{{ settings.late_tolerance }} menit</span>
              </div>
              <div class="schedule-item">
                <span class="schedule-label">🏫 Sekolah:</span>
                <span class="schedule-time">{{ settings.school_name }}</span>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" @click="resetSettings" class="btn-reset" :disabled="loading">
              🔄 Reset ke Default
            </button>
            <button type="submit" class="btn-save" :disabled="loading">
              {{ loading ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Current Settings Info -->
      <div class="info-card">
        <div class="card-header">
          <h3>ℹ️ Informasi Pengaturan Saat Ini</h3>
        </div>
        
        <div class="current-settings">
          <div class="setting-item">
            <span class="setting-icon">🕐</span>
            <div class="setting-details">
              <strong>Jam Masuk Sekolah</strong>
              <p>{{ formatTime(settings.arrival_time_start) }} - {{ formatTime(settings.arrival_time_end) }}</p>
            </div>
          </div>
          
          <div class="setting-item">
            <span class="setting-icon">🏠</span>
            <div class="setting-details">
              <strong>Jam Pulang Sekolah</strong>
              <p>{{ formatTime(settings.departure_time_start) }} - {{ formatTime(settings.departure_time_end) }}</p>
            </div>
          </div>
          
          <div class="setting-item">
            <span class="setting-icon">⏰</span>
            <div class="setting-details">
              <strong>Toleransi Keterlambatan</strong>
              <p>{{ settings.late_tolerance }} menit setelah {{ formatTime(settings.arrival_time_end) }}</p>
            </div>
          </div>
          
          <div class="setting-item">
            <span class="setting-icon">📊</span>
            <div class="setting-details">
              <strong>Status Absensi</strong>
              <p>Hadir, Terlambat, atau Tidak Hadir</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">⏳ Memuat...</div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { API_BASE_URL } from '../config/api.js'

// Reactive data
const loading = ref(false)
const message = ref('')
const messageType = ref('success')

// Settings data
const settings = ref({
  arrival_time_start: '07:00',
  arrival_time_end: '07:30',
  departure_time_start: '15:00',
  departure_time_end: '17:00',
  late_tolerance: 15,
  school_name: 'SMA Negeri 1'
})

// Default settings for reset
const defaultSettings = {
  arrival_time_start: '07:00',
  arrival_time_end: '07:30',
  departure_time_start: '15:00',
  departure_time_end: '17:00',
  late_tolerance: 15,
  school_name: 'SMA Negeri 1'
}

// API Base URL
const API_BASE = API_BASE_URL

// Fetch current settings
const fetchSettings = async () => {
  try {
    loading.value = true
    const response = await fetch(`${API_BASE}/settings`)
    const data = await response.json()
    
    if (data.success) {
      // Convert settings object to the format expected by the form
      const settingsObj = {}
      Object.keys(data.data).forEach(key => {
        settingsObj[key] = data.data[key].value
      })
      
      // Update settings with fetched data
      Object.assign(settings.value, settingsObj)
    } else {
      showMessage('Gagal memuat pengaturan', 'error')
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
    showMessage('Terjadi kesalahan saat memuat pengaturan', 'error')
  } finally {
    loading.value = false
  }
}

// Save settings
const saveSettings = async () => {
  try {
    loading.value = true
    
    // Validate time inputs
    if (!validateTimeSettings()) {
      return
    }
    
    console.log('🔧 [FRONTEND] Starting settings save process')
    console.log('📤 [FRONTEND] Settings to save:', JSON.stringify(settings.value, null, 2))
    
    // Update each setting individually
    const updatePromises = Object.entries(settings.value).map(([key, value]) => {
      const requestBody = { value: value.toString() }
      console.log(`📤 [FRONTEND] Sending ${key}: "${value}" (type: ${typeof value})`)
      console.log(`📤 [FRONTEND] Request URL: ${API_BASE}/settings/${key}`)
      console.log(`📤 [FRONTEND] Request body:`, requestBody)
      return fetch(`${API_BASE}/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
    })
    
    console.log(`⏳ [FRONTEND] Waiting for ${updatePromises.length} requests to complete...`)
    
    const responses = await Promise.all(updatePromises)
    const results = await Promise.all(responses.map(async (r, index) => {
      const result = await r.json()
      const key = Object.keys(settings.value)[index]
      console.log(`📥 [FRONTEND] Response for ${key}:`, result)
      return result
    }))
    
    console.log('📥 [FRONTEND] All responses received:', results)
    
    const hasError = results.some(result => !result.success)
    const failedSettings = results.filter(result => !result.success)
    
    if (hasError) {
      console.log('❌ [FRONTEND] Some settings failed:', failedSettings)
    } else {
      console.log('✅ [FRONTEND] All settings saved successfully')
    }
    
    const response = {
      json: () => Promise.resolve({
        success: !hasError,
        message: hasError ? 'Beberapa pengaturan gagal disimpan' : 'Semua pengaturan berhasil disimpan'
      })
    }
    
    const data = await response.json()
    
    if (data.success) {
      console.log('🎉 [FRONTEND] Settings save completed successfully')
      showMessage('Pengaturan berhasil disimpan!', 'success')
    } else {
      console.log('❌ [FRONTEND] Settings save failed:', data.message)
      showMessage(data.message || 'Gagal menyimpan pengaturan', 'error')
    }
  } catch (error) {
    console.error('💥 [FRONTEND] Error saving settings:', error)
    console.error('📍 [FRONTEND] Error stack:', error.stack)
    showMessage('Terjadi kesalahan saat menyimpan pengaturan', 'error')
  } finally {
    loading.value = false
  }
}

// Validate time settings
const validateTimeSettings = () => {
  const arrivalStart = timeToMinutes(settings.value.arrival_time_start)
  const arrivalEnd = timeToMinutes(settings.value.arrival_time_end)
  const departureStart = timeToMinutes(settings.value.departure_time_start)
  const departureEnd = timeToMinutes(settings.value.departure_time_end)
  
  if (arrivalStart >= arrivalEnd) {
    showMessage('Jam mulai datang harus lebih awal dari batas jam datang', 'error')
    return false
  }
  
  if (departureStart >= departureEnd) {
    showMessage('Jam mulai pulang harus lebih awal dari batas jam pulang', 'error')
    return false
  }
  
  if (arrivalEnd >= departureStart) {
    showMessage('Batas jam datang harus lebih awal dari jam mulai pulang', 'error')
    return false
  }
  
  if (settings.value.late_tolerance < 0 || settings.value.late_tolerance > 60) {
    showMessage('Toleransi keterlambatan harus antara 0-60 menit', 'error')
    return false
  }
  
  if (!settings.value.school_name.trim()) {
    showMessage('Nama sekolah tidak boleh kosong', 'error')
    return false
  }
  
  return true
}

// Convert time string to minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Format time for display
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

// Reset settings to default
const resetSettings = () => {
  if (confirm('Apakah Anda yakin ingin mereset pengaturan ke default?')) {
    Object.assign(settings.value, defaultSettings)
    showMessage('Pengaturan direset ke default', 'success')
  }
}

// Show message
const showMessage = (msg, type = 'success') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 5000)
}

// Initialize
onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.settings-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.header h1 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 2.5rem;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
  margin: 0;
}

.settings-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  align-items: start;
}

.settings-card, .info-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.card-header h2, .card-header h3 {
  margin: 0 0 10px 0;
  font-size: 1.5rem;
}

.card-header p {
  margin: 0;
  opacity: 0.9;
}

.settings-form {
  padding: 30px;
}

.time-section {
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 1px solid #eee;
}

.time-section:last-of-type {
  border-bottom: none;
}

.time-section h3 {
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.time-input, .number-input, .text-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.time-input:focus, .number-input:focus, .text-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.help-text {
  display: block;
  margin-top: 5px;
  color: #6c757d;
  font-size: 12px;
  font-style: italic;
}

.schedule-preview {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin: 30px 0;
}

.schedule-preview h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.preview-content {
  display: grid;
  gap: 10px;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #dee2e6;
}

.schedule-item:last-child {
  border-bottom: none;
}

.schedule-label {
  font-weight: 600;
  color: #495057;
}

.schedule-time {
  color: #007bff;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.btn-save, .btn-reset {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-save {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.btn-save:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-reset {
  background: #6c757d;
  color: white;
}

.btn-reset:hover {
  background: #5a6268;
}

.btn-reset:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.current-settings {
  padding: 20px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.setting-details strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 5px;
}

.setting-details p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-spinner {
  font-size: 24px;
  color: #667eea;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 3000;
  animation: slideIn 0.3s ease;
  max-width: 400px;
}

.message.success {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.message.error {
  background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .settings-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .time-inputs {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-save, .btn-reset {
    width: 100%;
  }
  
  .schedule-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .header h1 {
    font-size: 2rem;
  }
  
  .settings-form {
    padding: 20px;
  }
}
</style>