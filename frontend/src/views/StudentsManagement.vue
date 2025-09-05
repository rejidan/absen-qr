<template>
  <div class="students-management">
    <!-- Header -->
    <div class="header">
      <h1>📚 Manajemen Siswa</h1>
      <div class="header-buttons">
        <button @click="downloadTemplate" class="btn-secondary">
          📥 Download Template
        </button>
        <button @click="triggerFileInput" class="btn-secondary">
          📤 Import Excel
        </button>
        <button @click="showAddModal = true" class="btn-primary">
          ➕ Tambah Siswa
        </button>
      </div>
    </div>

    <!-- Hidden file input for Excel import -->
    <input 
      ref="fileInput" 
      type="file" 
      accept=".xlsx,.xls" 
      @change="handleFileUpload" 
      style="display: none"
    />

    <!-- Search and Filter -->
    <div class="filters">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 Cari nama atau NIS siswa..."
          @input="searchStudents"
        >
      </div>
      <div class="filter-box">
        <select v-model="selectedClass" @change="filterByClass">
          <option value="">Semua Kelas</option>
          <option v-for="cls in classes" :key="cls" :value="cls">{{ cls }}</option>
        </select>
      </div>
    </div>

    <!-- Students Table -->
    <div class="table-container">
      <table class="students-table">
        <thead>
          <tr>
            <th>NIS</th>
            <th>Nama</th>
            <th>Kelas</th>
            <th>QR Code</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="student in filteredStudents" :key="student.id">
            <td>{{ student.nis }}</td>
            <td>{{ student.name }}</td>
            <td>{{ student.class }}</td>
            <td>
              <button @click="showQRCode(student)" class="btn-qr">
                📱 Lihat QR
              </button>
            </td>
            <td class="actions">
              <button @click="viewAttendanceHistory(student)" class="btn-history">
                📊 Riwayat
              </button>
              <button @click="editStudent(student)" class="btn-edit">
                ✏️ Edit
              </button>
              <button @click="deleteStudent(student)" class="btn-delete">
                🗑️ Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="filteredStudents.length === 0" class="no-data">
        <p>📝 Tidak ada data siswa yang ditemukan</p>
      </div>
    </div>

    <!-- Add/Edit Student Modal -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ showAddModal ? '➕ Tambah Siswa Baru' : '✏️ Edit Siswa' }}</h2>
          <button @click="closeModals" class="close-btn">✖️</button>
        </div>
        
        <form @submit.prevent="saveStudent" class="student-form">
          <div class="form-group">
            <label for="nis">NIS:</label>
            <input 
              id="nis"
              v-model="studentForm.nis" 
              type="text" 
              required 
              :disabled="showEditModal"
              placeholder="Masukkan NIS siswa"
            >
          </div>
          
          <div class="form-group">
            <label for="name">Nama Lengkap:</label>
            <input 
              id="name"
              v-model="studentForm.name" 
              type="text" 
              required 
              placeholder="Masukkan nama lengkap siswa"
            >
          </div>
          
          <div class="form-group">
            <label for="class">Kelas:</label>
            <input 
              id="class"
              v-model="studentForm.class" 
              type="text" 
              required 
              placeholder="Contoh: XII IPA 1"
            >
          </div>
          
          <div class="form-actions">
            <button type="button" @click="closeModals" class="btn-cancel">
              ❌ Batal
            </button>
            <button type="submit" class="btn-save" :disabled="loading">
              {{ loading ? '⏳ Menyimpan...' : (showAddModal ? '💾 Simpan' : '📝 Update') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- QR Code Modal -->
    <div v-if="showQRModal" class="modal-overlay" @click="closeQRModal">
      <div class="modal qr-modal" @click.stop>
        <div class="modal-header">
          <h2>📱 QR Code - {{ selectedStudent?.name }}</h2>
          <button @click="closeQRModal" class="close-btn">✖️</button>
        </div>
        
        <div class="qr-content">
          <div class="qr-code-container">
            <canvas ref="qrCanvas" class="qr-canvas"></canvas>
          </div>
          <div class="student-info">
            <p><strong>NIS:</strong> {{ selectedStudent?.nis }}</p>
            <p><strong>Nama:</strong> {{ selectedStudent?.name }}</p>
            <p><strong>Kelas:</strong> {{ selectedStudent?.class }}</p>
          </div>
          <button @click="downloadQR" class="btn-download">
            💾 Download QR Code
          </button>
        </div>
      </div>
    </div>

    <!-- Attendance History Modal -->
    <div v-if="showAttendanceModal" class="modal-overlay" @click="closeAttendanceModal">
      <div class="modal attendance-modal" @click.stop>
        <StudentAttendanceHistory 
          :studentId="selectedStudentId" 
          @close="closeAttendanceModal"
        />
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
import { ref, onMounted, computed } from 'vue'
import QRCode from 'qrcode'
import StudentAttendanceHistory from '../components/StudentAttendanceHistory.vue'

// Reactive data
const students = ref([])
const filteredStudents = ref([])
const classes = ref([])
const searchQuery = ref('')
const selectedClass = ref('')
const loading = ref(false)
const message = ref('')
const messageType = ref('success')

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const showQRModal = ref(false)
const showAttendanceModal = ref(false)
const selectedStudent = ref(null)
const selectedStudentId = ref(null)

// Form data
const studentForm = ref({
  id: null,
  nis: '',
  name: '',
  class: ''
})

// QR Code
const qrCanvas = ref(null)

// API Base URL
const API_BASE = 'http://localhost:3001/api'

// Fetch students from API
const fetchStudents = async () => {
  try {
    loading.value = true
    const response = await fetch(`${API_BASE}/students`)
    const data = await response.json()
    
    if (data.success) {
      students.value = data.data
      filteredStudents.value = data.data
      extractClasses()
    } else {
      showMessage('Gagal memuat data siswa', 'error')
    }
  } catch (error) {
    console.error('Error fetching students:', error)
    showMessage('Terjadi kesalahan saat memuat data', 'error')
  } finally {
    loading.value = false
  }
}

// Extract unique classes
const extractClasses = () => {
  const uniqueClasses = [...new Set(students.value.map(s => s.class))]
  classes.value = uniqueClasses.sort()
}

// Search students
const searchStudents = () => {
  let filtered = students.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(student => 
      student.name.toLowerCase().includes(query) ||
      student.nis.toLowerCase().includes(query)
    )
  }
  
  if (selectedClass.value) {
    filtered = filtered.filter(student => student.class === selectedClass.value)
  }
  
  filteredStudents.value = filtered
}

// Filter by class
const filterByClass = () => {
  searchStudents()
}

// Add new student
const saveStudent = async () => {
  try {
    loading.value = true
    
    const url = showAddModal.value 
      ? `${API_BASE}/students`
      : `${API_BASE}/students/${studentForm.value.id}`
    
    const method = showAddModal.value ? 'POST' : 'PUT'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nis: studentForm.value.nis,
        name: studentForm.value.name,
        class: studentForm.value.class
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      showMessage(data.message, 'success')
      closeModals()
      await fetchStudents()
    } else {
      showMessage(data.message, 'error')
    }
  } catch (error) {
    console.error('Error saving student:', error)
    showMessage('Terjadi kesalahan saat menyimpan data', 'error')
  } finally {
    loading.value = false
  }
}

// Edit student
const editStudent = (student) => {
  studentForm.value = {
    id: student.id,
    nis: student.nis,
    name: student.name,
    class: student.class
  }
  showEditModal.value = true
}

// Delete student
const deleteStudent = async (student) => {
  if (!confirm(`Apakah Anda yakin ingin menghapus siswa ${student.name}?`)) {
    return
  }
  
  try {
    loading.value = true
    
    const response = await fetch(`${API_BASE}/students/${student.id}`, {
      method: 'DELETE'
    })
    
    const data = await response.json()
    
    if (data.success) {
      showMessage(data.message, 'success')
      await fetchStudents()
    } else {
      showMessage(data.message, 'error')
    }
  } catch (error) {
    console.error('Error deleting student:', error)
    showMessage('Terjadi kesalahan saat menghapus data', 'error')
  } finally {
    loading.value = false
  }
}

// Show QR Code
const showQRCode = async (student) => {
  selectedStudent.value = student
  showQRModal.value = true
  
  // Generate QR code after modal is shown
  await new Promise(resolve => setTimeout(resolve, 100))
  await generateQRCode(student.qr_code)
}

// Generate QR Code
const generateQRCode = async (qrData) => {
  try {
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    showMessage('Gagal membuat QR code', 'error')
  }
}

// Download QR Code
const downloadQR = () => {
  if (qrCanvas.value && selectedStudent.value) {
    const link = document.createElement('a')
    link.download = `QR_${selectedStudent.value.nis}_${selectedStudent.value.name}.png`
    link.href = qrCanvas.value.toDataURL()
    link.click()
  }
}

// Close modals
const closeModals = () => {
  showAddModal.value = false
  showEditModal.value = false
  studentForm.value = {
    id: null,
    nis: '',
    name: '',
    class: ''
  }
}

const closeQRModal = () => {
  showQRModal.value = false
  selectedStudent.value = null
}

// Show attendance history
const viewAttendanceHistory = (student) => {
  selectedStudent.value = student
  selectedStudentId.value = student.id
  showAttendanceModal.value = true
}

// Close attendance modal
const closeAttendanceModal = () => {
  showAttendanceModal.value = false
  selectedStudent.value = null
  selectedStudentId.value = null
}

// Download template Excel
const downloadTemplate = async () => {
  try {
    loading.value = true
    const response = await fetch(`${API_BASE}/students/template`)
    
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_data_siswa.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showMessage('Template berhasil didownload', 'success')
    } else {
      showMessage('Gagal mendownload template', 'error')
    }
  } catch (error) {
    console.error('Error downloading template:', error)
    showMessage('Terjadi kesalahan saat mendownload template', 'error')
  } finally {
    loading.value = false
  }
}

// Trigger file input
const fileInput = ref(null)
const triggerFileInput = () => {
  fileInput.value.click()
}

// Handle file upload
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    loading.value = true
    
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_BASE}/students/import`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    
    if (data.success) {
      showMessage(data.message, 'success')
      await fetchStudents()
    } else {
      // Handle validation errors
      if (data.errors) {
        let errorMessage = 'Terdapat kesalahan pada data:\n'
        data.errors.forEach(error => {
          errorMessage += `Baris ${error.row}: ${error.errors.join(', ')}\n`
        })
        alert(errorMessage)
      } else if (data.duplicates) {
        let duplicateMessage = 'NIS yang sudah ada:\n'
        data.duplicates.forEach(dup => {
          duplicateMessage += `${dup.nis} - ${dup.name}\n`
        })
        alert(duplicateMessage)
      } else {
        showMessage(data.message, 'error')
      }
    }
  } catch (error) {
    console.error('Error importing file:', error)
    showMessage('Terjadi kesalahan saat mengimpor file', 'error')
  } finally {
    loading.value = false
    // Reset file input
    event.target.value = ''
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
  fetchStudents()
})
</script>

<style scoped>
.students-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.header h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 2rem;
}

.header-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filters {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box, .filter-box {
  flex: 1;
  min-width: 200px;
}

.search-box input, .filter-box select {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.search-box input:focus, .filter-box select:focus {
  outline: none;
  border-color: #3498db;
}

.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
}

.students-table th {
  background: #3498db;
  color: white;
  padding: 15px;
  text-align: left;
  font-weight: 600;
}

.students-table td {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.students-table tr:hover {
  background: #f8f9fa;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-primary, .btn-secondary, .btn-edit, .btn-delete, .btn-qr, .btn-save, .btn-cancel, .btn-download {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #27ae60;
  color: white;
}

.btn-primary:hover {
  background: #219a52;
}

.btn-secondary {
  background: #3498db;
  color: white;
}

.btn-secondary:hover {
  background: #2980b9;
}

.btn-edit {
  background: #f39c12;
  color: white;
}

.btn-edit:hover {
  background: #e67e22;
}

.btn-delete {
  background: #e74c3c;
  color: white;
}

.btn-delete:hover {
  background: #c0392b;
}

.btn-qr {
  background: #9b59b6;
  color: white;
}

.btn-qr:hover {
  background: #8e44ad;
}

.btn-save {
  background: #27ae60;
  color: white;
}

.btn-save:hover {
  background: #219a52;
}

.btn-cancel {
  background: #95a5a6;
  color: white;
}

.btn-cancel:hover {
  background: #7f8c8d;
}

.btn-download {
  background: #3498db;
  color: white;
  width: 100%;
  margin-top: 20px;
}

.btn-download:hover {
  background: #2980b9;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.qr-modal {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 5px;
}

.student-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.form-group input:disabled {
  background: #f8f9fa;
  color: #6c757d;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

.qr-content {
  padding: 20px;
  text-align: center;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.qr-canvas {
  border: 2px solid #ddd;
  border-radius: 8px;
}

.student-info {
  text-align: left;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.student-info p {
  margin: 5px 0;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
  font-size: 18px;
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
  color: #3498db;
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
}

.message.success {
  background: #27ae60;
}

.message.error {
  background: #e74c3c;
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
  .header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .students-table {
    font-size: 14px;
  }
  
  .students-table th,
  .students-table td {
    padding: 10px 8px;
  }
  
  .actions {
    flex-direction: column;
    gap: 5px;
  }
  
  .modal {
    width: 95%;
    margin: 10px;
  }
}
</style>