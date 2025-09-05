<template>
  <div class="scanner-page">
    <div class="card">
      <h2 style="text-align: center; color: #667eea; margin-bottom: 30px;">
        📷 Scan QR Code Siswa
      </h2>
      
      <div class="scanner-container">
        <div style="text-align: center;">
          <button @click="openCameraModal" class="btn btn-success" style="font-size: 18px; padding: 15px 30px; margin-right: 10px;">
            🎥 Mulai Kamera
          </button>
          <button @click="testCameraAccess" class="btn" style="font-size: 16px; padding: 12px 20px; background: #17a2b8; color: white;">
            🔍 Test Kamera
          </button>
          <p style="margin-top: 15px; color: #6c757d;">
            Klik "Mulai Kamera" untuk scan QR code, atau "Test Kamera" untuk mengecek akses kamera
          </p>
          <div style="margin-top: 10px; padding: 10px; background: #e7f3ff; border-left: 4px solid #007bff; border-radius: 5px; font-size: 14px;">
            💡 <strong>Tips:</strong> Pastikan QR code terlihat jelas di kamera dan tidak terlalu jauh atau dekat
          </div>
          <div v-if="cameraInfo" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 14px;">
            <strong>Info Kamera:</strong><br>
            {{ cameraInfo }}
          </div>
        </div>
        
        <!-- Video dan Canvas selalu ada di DOM untuk memastikan refs tersedia -->
        <video 
          ref="videoElement" 
          id="video" 
          autoplay 
          playsinline
          style="display: none;"
        ></video>
        
        <canvas 
          ref="canvasElement" 
          style="display: none;"
        ></canvas>
        
        <div v-if="scanResult" class="alert alert-success" style="margin-top: 20px;">
          <h4>✅ Scan Berhasil!</h4>
          <p><strong>Nama:</strong> {{ scanResult.studentName }}</p>
          <p><strong>NIS:</strong> {{ scanResult.nis }}</p>
          <p><strong>Kelas:</strong> {{ scanResult.class }}</p>
          <p><strong>Waktu:</strong> {{ scanResult.time }}</p>
        </div>
        
        <div v-if="errorMessage" class="alert alert-danger" style="margin-top: 20px; white-space: pre-line;">
          {{ errorMessage }}
        </div>
        
        <div v-if="isProcessing" style="text-align: center; margin-top: 20px;">
          <p>⏳ Memproses QR Code...</p>
        </div>
      </div>
    </div>
    
    <!-- Riwayat Scan Hari Ini -->
    <div class="card" style="margin-top: 30px;">
      <h3 style="color: #667eea; margin-bottom: 20px;">📋 Riwayat Scan Hari Ini</h3>
      
      <div v-if="todayAttendance.length === 0" style="text-align: center; color: #6c757d; padding: 20px;">
        Belum ada data absensi hari ini
      </div>
      
      <table v-else class="table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>NIS</th>
            <th>Nama</th>
            <th>Kelas</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="attendance in todayAttendance" :key="attendance.id">
            <td>{{ new Date(attendance.updated_at).toLocaleString('id-ID', {
              day: 'numeric',
              month: 'numeric', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).replace(',', ' |') }}</td>
            <td>{{ attendance.nis }}</td>
            <td>{{ attendance.studentName }}</td>
            <td>{{ attendance.class }}</td>
            <td>
              <span class="status-badge status-hadir">{{ attendance.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Camera Modal -->
    <div v-if="showCameraModal" class="modal-overlay" @click="closeCameraModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📷 Scanner QR Code</h3>
          <button @click="closeCameraModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="camera-container">
            <!-- Video untuk kamera -->
            <video 
              ref="modalVideoElement" 
              autoplay 
              playsinline
              :style="{ 
                display: cameraStarted ? 'block' : 'none',
                width: '100%', 
                maxWidth: '100%', 
                height: 'auto', 
                borderRadius: '10px'
              }"
            ></video>
            
            <!-- Loading state -->
            <div v-if="!cameraStarted && !errorMessage" class="loading-camera">
              <div class="loading-spinner">📷</div>
              <p>Memulai kamera...</p>
            </div>
            
            <!-- Overlay container yang muncul di atas video -->
            <div v-if="cameraStarted" class="video-overlay">
              <!-- Overlay untuk menunjukkan area scan -->
              <div class="scan-overlay">
                <div class="scan-label">
                  Arahkan QR Code ke sini
                </div>
              </div>
              
              <!-- Status scanning -->
              <div class="scan-status">
                <span v-if="isProcessing">🔍 Memproses...</span>
                <span v-else-if="scanResult">✅ QR Terdeteksi!</span>
                <span v-else>📷 Siap Scan</span>
              </div>
              
              <!-- Flash effect saat QR terdeteksi -->
              <div v-if="scanResult && !isProcessing" class="flash-effect"></div>
            </div>
            
            <!-- Error message -->
            <div v-if="errorMessage" class="alert alert-danger" style="margin: 20px 0;">
              {{ errorMessage }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeCameraModal" class="btn btn-secondary">
            ❌ Tutup
          </button>
          <button v-if="cameraStarted" @click="stopCamera" class="btn btn-danger">
            ⏹️ Stop Kamera
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import jsQR from 'jsqr'
import axios from 'axios'
import { API_BASE_URL } from '../config/api.js'

export default {
  name: 'Scanner',
  setup() {
    const videoElement = ref(null)
    const canvasElement = ref(null)
    const modalVideoElement = ref(null)
    const cameraStarted = ref(false)
    const scanResult = ref(null)
    const errorMessage = ref('')
    const isProcessing = ref(false)
    const todayAttendance = ref([])
    const cameraInfo = ref('')
    const showCameraModal = ref(false)
    
    let stream = null
    let scanInterval = null
    
    const waitForElement = async (elementRef, elementName, maxRetries = 10) => {
      for (let i = 0; i < maxRetries; i++) {
        if (elementRef.value) {
          console.log(`✅ ${elementName} found after ${i} retries`)
          return true
        }
        console.log(`⏳ Waiting for ${elementName}, retry ${i + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      console.error(`❌ ${elementName} not found after ${maxRetries} retries`)
      return false
    }
    
    const startCamera = async () => {
      try {
        console.log('🎥 Starting camera...')
        errorMessage.value = ''
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported')
        }
        
        console.log('📱 getUserMedia is supported')
        
        // Wait for elements to be available
        const videoReady = await waitForElement(videoElement, 'Video element')
        const canvasReady = await waitForElement(canvasElement, 'Canvas element')
        
        if (!videoReady || !canvasReady) {
          errorMessage.value = 'Elemen kamera tidak dapat dimuat. Silakan refresh halaman dan coba lagi.'
          return
        }
        
        // Try environment camera first (back camera), then any camera
        const constraints = [
          { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } }, // Back camera
          { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },        // Front camera
          { video: { width: { ideal: 640 }, height: { ideal: 480 } } }                           // Any camera
        ]
        
        let success = false
        
        for (let i = 0; i < constraints.length && !success; i++) {
          try {
            console.log(`🔄 Trying constraint ${i + 1}:`, constraints[i])
            stream = await navigator.mediaDevices.getUserMedia(constraints[i])
            console.log('✅ Camera stream obtained:', stream)
            success = true
          } catch (constraintError) {
            console.log(`❌ Constraint ${i + 1} failed:`, constraintError.message)
            if (i === constraints.length - 1) {
              throw constraintError // Throw the last error if all constraints fail
            }
          }
        }
        
        console.log('📺 Video element:', videoElement.value)
        console.log('🎨 Canvas element:', canvasElement.value)
        
        const currentVideoElement = modalVideoElement.value || videoElement.value
        
        console.log('🔗 Setting srcObject to video element')
        currentVideoElement.srcObject = stream
        
        // Wait for video to be ready
        currentVideoElement.onloadedmetadata = () => {
          console.log('📊 Video metadata loaded, dimensions:', currentVideoElement.videoWidth, 'x', currentVideoElement.videoHeight)
          
          currentVideoElement.play().then(() => {
            console.log('▶️ Video playing successfully')
            cameraStarted.value = true
            console.log('✅ Camera started, beginning scan')
            startScanning()
          }).catch(playError => {
            console.error('❌ Error playing video:', playError)
            errorMessage.value = 'Tidak dapat memutar video kamera. Coba refresh halaman.'
          })
        }
        
        // Add error handler for video element
        currentVideoElement.onerror = (e) => {
          console.error('❌ Video element error:', e)
        }
        
      } catch (error) {
        console.error('❌ Error accessing camera:', error)
        
        let errorMsg = 'Tidak dapat mengakses kamera. '
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMsg += 'Izin kamera ditolak. Silakan:\n1. Klik ikon kamera di address bar\n2. Pilih "Allow" untuk mengizinkan akses kamera\n3. Refresh halaman ini'
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMsg += 'Kamera tidak ditemukan. Pastikan kamera terhubung dan tidak digunakan aplikasi lain.'
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMsg += 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain yang menggunakan kamera.'
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMsg += 'Kamera tidak mendukung pengaturan yang diminta. Coba dengan browser lain.'
        } else if (error.message === 'getUserMedia not supported') {
          errorMsg += 'Browser tidak mendukung akses kamera. Gunakan Chrome, Firefox, atau Safari terbaru.'
        } else {
          errorMsg += 'Error: ' + (error.message || 'Unknown error')
        }
        
        errorMessage.value = errorMsg
      }
    }
    
    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        stream = null
      }
      
      if (scanInterval) {
        clearInterval(scanInterval)
        scanInterval = null
      }
      
      cameraStarted.value = false
      scanResult.value = null
      errorMessage.value = ''
    }
    
    const openCameraModal = async () => {
      showCameraModal.value = true
      errorMessage.value = ''
      scanResult.value = null
      
      // Wait for modal to be rendered
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Start camera
      await startCamera()
    }
    
    const closeCameraModal = () => {
      stopCamera()
      showCameraModal.value = false
    }
    
    const startScanning = () => {
      console.log('🔍 Starting QR scanning process...')
      
      const currentVideoElement = modalVideoElement.value || videoElement.value
      
      if (!cameraStarted.value || !currentVideoElement || !canvasElement.value) {
        console.error('❌ Cannot start scanning - missing elements:', {
          cameraStarted: cameraStarted.value,
          videoElement: !!currentVideoElement,
          canvasElement: !!canvasElement.value
        })
        return
      }
      
      console.log('📹 Video element ready:', {
        videoWidth: currentVideoElement.videoWidth,
        videoHeight: currentVideoElement.videoHeight,
        readyState: currentVideoElement.readyState
      })
      
      console.log('🎨 Canvas element ready:', {
        width: canvasElement.value.width,
        height: canvasElement.value.height
      })
      
      console.log('✅ All elements ready, starting scan interval')
      
      scanInterval = setInterval(() => {
        if (isProcessing.value) {
          console.log('⏳ Skipping scan - already processing')
          return
        }
        
        const canvas = canvasElement.value
        const video = currentVideoElement
        const context = canvas.getContext('2d')
        
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          console.log('⚠️ Video not ready, readyState:', video.readyState)
          return
        }
        
        if (!video.videoWidth || !video.videoHeight) {
          console.log('⚠️ Video dimensions not ready:', video.videoWidth, 'x', video.videoHeight)
          return
        }
        
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        
        if (code) {
          console.log('🎯 QR Code detected:', code.data)
          processQRCode(code.data)
        } else {
          // Log setiap 10 detik untuk debugging
          if (Date.now() % 10000 < 500) {
            console.log('🔍 Scanning... (no QR code found)')
          }
        }
      }, 500) // Scan setiap 500ms
    }
    
    const processQRCode = async (qrData) => {
      if (isProcessing.value) {
        console.log('⏳ Already processing, skipping QR:', qrData)
        return
      }
      
      console.log('🔄 Processing QR code:', qrData)
      isProcessing.value = true
      errorMessage.value = ''
      
      try {
        // Kirim ke backend (backend akan melakukan validasi waktu)
        console.log('📤 Sending attendance request to backend...')
        const response = await axios.post(`${API_BASE_URL}/attendance`, {
          qr_code: qrData
        })
        
        console.log('📥 Backend response:', response.data)
        
        if (response.data.success) {
          console.log('✅ Attendance recorded successfully')
          scanResult.value = {
            studentName: response.data.student.name,
            nis: response.data.student.nis,
            class: response.data.student.class,
            time: new Date().toLocaleTimeString('id-ID')
          }
          
          // Refresh data absensi hari ini
          console.log('🔄 Refreshing attendance data...')
          await loadTodayAttendance()
          
          // Play success sound (optional)
          console.log('🔊 Playing success sound')
          playSuccessSound()
          
          // Clear result after 5 seconds
          setTimeout(() => {
            console.log('🧹 Clearing scan result')
            scanResult.value = null
          }, 5000)
          
        } else {
          console.log('❌ Backend returned success=false:', response.data)
          errorMessage.value = response.data.message || 'QR Code tidak valid'
        }
        
      } catch (error) {
        console.error('❌ Error processing attendance:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        
        if (error.response?.data?.message) {
          errorMessage.value = error.response.data.message
        } else {
          errorMessage.value = 'Terjadi kesalahan saat memproses QR Code'
        }
      }
      
      console.log('🏁 Processing completed, setting isProcessing to false')
      isProcessing.value = false
    }
    
    const loadTodayAttendance = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await axios.get(`${API_BASE_URL}/attendance?date=${today}`)
        
        if (response.data.success) {
          todayAttendance.value = response.data.data
        }
      } catch (error) {
        console.error('Error loading attendance:', error)
      }
    }
    
    const playSuccessSound = () => {
      // Create audio context for success sound
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (error) {
        console.log('Could not play success sound:', error)
      }
    }
    
    const testCameraAccess = async () => {
      try {
        cameraInfo.value = 'Mengecek akses kamera...'
        
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        
        if (videoDevices.length === 0) {
          cameraInfo.value = 'Tidak ada kamera yang terdeteksi'
          return
        }
        
        cameraInfo.value = `Ditemukan ${videoDevices.length} kamera:\n${videoDevices.map((device, index) => `${index + 1}. ${device.label || 'Kamera ' + (index + 1)}`).join('\n')}`
        
      } catch (error) {
        console.error('Error checking camera:', error)
        cameraInfo.value = 'Error saat mengecek kamera: ' + error.message
      }
    }
    
    onMounted(() => {
      loadTodayAttendance()
    })
    
    onUnmounted(() => {
      stopCamera()
    })
    
    return {
      videoElement,
      canvasElement,
      modalVideoElement,
      cameraStarted,
      scanResult,
      errorMessage,
      isProcessing,
      todayAttendance,
      cameraInfo,
      showCameraModal,
      startCamera,
      stopCamera,
      openCameraModal,
      closeCameraModal,
      testCameraAccess
    }
  }
}
</script>

<style scoped>
.scanner-page {
  padding: 20px;
}

.card {
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.scanner-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.alert {
  padding: 15px;
  margin-bottom: 20px;
  border: 1px solid transparent;
  border-radius: 4px;
}

.alert-success {
  color: #3c763d;
  background-color: #dff0d8;
  border-color: #d6e9c6;
}

.alert-danger {
  color: #a94442;
  background-color: #f2dede;
  border-color: #ebccd1;
}

.btn {
  display: inline-block;
  padding: 6px 12px;
  margin-bottom: 0;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.42857143;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  text-decoration: none;
  color: white;
}

.btn-success {
  background-color: #5cb85c;
  border-color: #4cae4c;
}

.btn-danger {
  background-color: #d9534f;
  border-color: #d43f3a;
}

.btn:hover {
  opacity: 0.8;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.table th,
.table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.table th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #495057;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-hadir {
  background-color: #d4edda;
  color: #155724;
}

/* Animation untuk flash effect */
@keyframes flash {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Animation untuk scan overlay */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
  }
}

.scan-overlay {
  animation: pulse 2s infinite;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
}

.modal-content {
  background: white;
  border-radius: 15px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #667eea;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.camera-container {
  position: relative;
  width: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 10px;
}

.loading-camera {
  text-align: center;
  color: #666;
}

.loading-spinner {
  font-size: 3rem;
  margin-bottom: 10px;
  animation: pulse 1.5s infinite;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.video-overlay .scan-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 250px;
  height: 250px;
  border: 3px solid #28a745;
  border-radius: 15px;
  background: rgba(40, 167, 69, 0.1);
}

.scan-label {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: #28a745;
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
}

.scan-status {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.flash-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(40, 167, 69, 0.3);
  border-radius: 10px;
  animation: flash 0.5s ease-out;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #f8f9fa;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 15px;
  }
  
  .modal-header h3 {
    font-size: 1.2rem;
  }
  
  .modal-body {
    padding: 15px;
  }
  
  .modal-footer {
    padding: 15px;
    flex-direction: column;
  }
  
  .video-overlay .scan-overlay {
    width: 200px;
    height: 200px;
  }
  
  .scan-status {
    bottom: 10px;
    left: 10px;
    font-size: 12px;
    padding: 6px 10px;
  }
}

@media (max-width: 480px) {
  .modal-header h3 {
    font-size: 1rem;
  }
  
  .video-overlay .scan-overlay {
    width: 150px;
    height: 150px;
  }
  
  .scan-label {
    font-size: 10px;
    padding: 3px 8px;
  }
}
</style>