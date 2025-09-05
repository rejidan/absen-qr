<template>
  <div class="dashboard-page">
    <div class="card">
      <h2 style="color: #667eea; margin-bottom: 30px;">📊 Dashboard Absensi</h2>
      
      <!-- Filter Section -->
      <div style="display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tanggal:</label>
          <input 
            type="date" 
            v-model="selectedDate" 
            class="form-control" 
            style="width: 200px;"
            @change="loadAttendance"
          >
        </div>
        
        <div class="form-group" style="margin-bottom: 0;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Kelas:</label>
          <select v-model="selectedClass" class="form-control" style="width: 150px;" @change="filterData">
            <option value="">Semua Kelas</option>
            <option v-for="cls in availableClasses" :key="cls" :value="cls">{{ cls }}</option>
          </select>
        </div>
        
        <div style="display: flex; align-items: end; gap: 10px;">
          <button @click="loadAttendance" class="btn" :disabled="isLoading">
            {{ isLoading ? '⏳' : '🔄' }} Refresh
          </button>
          <button @click="exportToCSV" class="btn btn-success" :disabled="filteredAttendance.length === 0">
            📥 Export CSV
          </button>
        </div>
      </div>
      
      <!-- Statistics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; color: #155724;">{{ stats.hadir }}</h3>
          <p style="margin: 5px 0 0 0; color: #155724;">Hadir</p>
        </div>
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; color: #856404;">{{ stats.izin }}</h3>
          <p style="margin: 5px 0 0 0; color: #856404;">Izin</p>
        </div>
        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; color: #721c24;">{{ stats.sakit }}</h3>
          <p style="margin: 5px 0 0 0; color: #721c24;">Sakit</p>
        </div>
        <div style="background: #f5c6cb; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; color: #721c24;">{{ stats.alpha }}</h3>
          <p style="margin: 5px 0 0 0; color: #721c24;">Alpha</p>
        </div>
      </div>
      
      <!-- Data Table -->
      <div v-if="isLoading" style="text-align: center; padding: 40px;">
        <p>⏳ Memuat data...</p>
      </div>
      
      <div v-else-if="filteredAttendance.length === 0" style="text-align: center; padding: 40px; color: #6c757d;">
        <p>📭 Tidak ada data absensi untuk tanggal dan filter yang dipilih</p>
      </div>
      
      <div v-else style="overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>No</th>
              <th>NIS</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>Jam Masuk</th>
              <th>Jam Keluar</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(attendance, index) in paginatedAttendance" :key="attendance.id">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td>{{ attendance.nis }}</td>
              <td>{{ attendance.studentName }}</td>
              <td>{{ attendance.class }}</td>
              <td>
                <span v-if="attendance.timeIn" class="time-badge time-in">
                  {{ attendance.timeIn }}
                </span>
                <span v-else class="time-badge time-empty">-</span>
              </td>
              <td>
                <span v-if="attendance.timeOut" class="time-badge time-out">
                  {{ attendance.timeOut }}
                </span>
                <span v-else class="time-badge time-empty">-</span>
              </td>
              <td>
                <span :class="`status-badge status-${attendance.status}`">
                  {{ attendance.status.toUpperCase() }}
                </span>
              </td>
              <td>
                <select 
                  v-model="attendance.status" 
                  @change="updateAttendanceStatus(attendance)"
                  style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;"
                >
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpha">Alpha</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Pagination -->
        <div v-if="totalPages > 1" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px;">
          <button 
            @click="currentPage = Math.max(1, currentPage - 1)" 
            :disabled="currentPage === 1"
            class="btn"
            style="padding: 8px 12px;"
          >
            ← Prev
          </button>
          
          <span style="padding: 8px 16px; background: #f8f9fa; border-radius: 4px;">
            {{ currentPage }} / {{ totalPages }}
          </span>
          
          <button 
            @click="currentPage = Math.min(totalPages, currentPage + 1)" 
            :disabled="currentPage === totalPages"
            class="btn"
            style="padding: 8px 12px;"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from '../config/api.js'

export default {
  name: 'Dashboard',
  setup() {
    const selectedDate = ref(new Date().toISOString().split('T')[0])
    const selectedClass = ref('')
    const attendanceData = ref([])
    const isLoading = ref(false)
    const currentPage = ref(1)
    const itemsPerPage = ref(10)
    
    // Computed properties
    const availableClasses = computed(() => {
      const classes = [...new Set(attendanceData.value.map(item => item.class))]
      return classes.sort()
    })
    
    const filteredAttendance = computed(() => {
      let filtered = attendanceData.value
      
      if (selectedClass.value) {
        filtered = filtered.filter(item => item.class === selectedClass.value)
      }
      
      return filtered.sort((a, b) => {
        // Sort by updated_at first (most recent first)
        if (a.updated_at && b.updated_at) {
          const updatedA = new Date(a.updated_at)
          const updatedB = new Date(b.updated_at)
          if (updatedA.getTime() !== updatedB.getTime()) {
            return updatedB - updatedA
          }
        }
        
        // Fallback to timeIn sorting
        const timeA = a.timeIn || '00:00:00'
        const timeB = b.timeIn || '00:00:00'
        return new Date(`${selectedDate.value} ${timeB}`) - new Date(`${selectedDate.value} ${timeA}`)
      })
    })
    
    const totalPages = computed(() => {
      return Math.ceil(filteredAttendance.value.length / itemsPerPage.value)
    })
    
    const paginatedAttendance = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredAttendance.value.slice(start, end)
    })
    
    const stats = computed(() => {
      const data = filteredAttendance.value
      return {
        hadir: data.filter(item => item.status === 'hadir').length,
        izin: data.filter(item => item.status === 'izin').length,
        sakit: data.filter(item => item.status === 'sakit').length,
        alpha: data.filter(item => item.status === 'alpha').length
      }
    })
    
    // Methods
    const loadAttendance = async () => {
      try {
        isLoading.value = true
        const params = new URLSearchParams()
        
        if (selectedDate.value) {
          params.append('date', selectedDate.value)
        }
        
        if (selectedClass.value) {
          params.append('class', selectedClass.value)
        }
        
        const url = `${API_BASE_URL}/attendance?${params}`
        console.log('Loading attendance from:', url)
        console.log('Selected date:', selectedDate.value)
        console.log('Selected class:', selectedClass.value)
        
        const response = await axios.get(url)
        
        console.log('API Response:', response.data)
        
        if (response.data.success) {
          attendanceData.value = response.data.data
          console.log('✅ Attendance data loaded successfully:', response.data.data.length, 'records')
          console.log('Sample data:', response.data.data.slice(0, 2))
        } else {
          console.error('❌ Failed to load attendance:', response.data.message)
          attendanceData.value = []
        }
      } catch (error) {
        console.error('❌ Error loading attendance:', error)
        console.error('Error details:', error.response?.data || error.message)
        attendanceData.value = []
      } finally {
        isLoading.value = false
        currentPage.value = 1
      }
    }
    
    const loadDummyData = () => {
      // Fallback dummy data - should not be used if API is working
      attendanceData.value = []
    }
    
    const filterData = () => {
      currentPage.value = 1
    }
    
    const updateAttendanceStatus = async (attendance) => {
      try {
        const response = await axios.put(`${API_BASE_URL}/attendance/${attendance.id}`, {
          status: attendance.status
        })
        
        if (response.data.success) {
          console.log('Status updated successfully')
        }
      } catch (error) {
        console.error('Error updating status:', error)
        // Untuk demo, kita biarkan perubahan tetap tersimpan di frontend
      }
    }
    
    const exportToCSV = () => {
      const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Jam Masuk', 'Jam Keluar', 'Status']
      const csvContent = [
        headers.join(','),
        ...filteredAttendance.value.map((item, index) => [
          index + 1,
          item.nis,
          `"${item.studentName}"`,
          `"${item.class}"`,
          item.timeIn ? item.timeIn.substring(0, 5) : '-',
          item.timeOut ? item.timeOut.substring(0, 5) : '-',
          item.status.toUpperCase()
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `absensi_${selectedDate.value}_${selectedClass.value || 'semua_kelas'}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
    
    onMounted(() => {
      loadAttendance()
    })
    
    return {
      selectedDate,
      selectedClass,
      attendanceData,
      isLoading,
      currentPage,
      itemsPerPage,
      availableClasses,
      filteredAttendance,
      totalPages,
      paginatedAttendance,
      stats,
      loadAttendance,
      filterData,
      updateAttendanceStatus,
      exportToCSV
    }
  }
}
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  background: #667eea;
  color: white;
}

.btn:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.btn-success {
  background: #28a745;
}

.btn-success:hover {
  background: #218838;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table th,
.table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
  vertical-align: middle;
}

.table th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
  border: none;
}

.table th:first-child {
  text-align: center;
  width: 60px;
}

.table th:nth-child(5),
.table th:nth-child(6) {
  text-align: center;
  width: 100px;
}

.table th:nth-child(7) {
  text-align: center;
  width: 80px;
}

.table th:last-child {
  text-align: center;
  width: 120px;
}

.table td:first-child {
  text-align: center;
  font-weight: 600;
  color: #6c757d;
}

.table td:nth-child(5),
.table td:nth-child(6) {
  text-align: center;
}

.table td:nth-child(7),
.table td:last-child {
  text-align: center;
}

.table tbody tr {
  background: white;
  transition: all 0.2s ease;
}

.table tbody tr:nth-child(even) {
  background: #f8f9fa;
}

.table tbody tr:hover {
  background: #e3f2fd;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-hadir {
  background: #d4edda;
  color: #155724;
}

.status-izin {
  background: #fff3cd;
  color: #856404;
}

.status-sakit {
  background: #f8d7da;
  color: #721c24;
}

.status-alpha {
  background: #f5c6cb;
  color: #721c24;
}

.time-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  min-width: 60px;
  text-align: center;
  letter-spacing: 0.5px;
}

.time-in {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #0d47a1;
  border: 1px solid #90caf9;
  box-shadow: 0 2px 4px rgba(13, 71, 161, 0.1);
}

.time-out {
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
  color: #e65100;
  border: 1px solid #ffb74d;
  box-shadow: 0 2px 4px rgba(230, 81, 0, 0.1);
}

.time-empty {
  background: #f5f5f5;
  color: #9e9e9e;
  border: 1px solid #e0e0e0;
  font-style: italic;
}

@media (max-width: 1024px) {
  .table th:nth-child(5),
  .table th:nth-child(6) {
    width: 90px;
  }
  
  .table th,
  .table td {
    padding: 12px 8px;
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 10px;
  }
  
  .card {
    padding: 15px;
  }
  
  .table {
    font-size: 12px;
    border-radius: 6px;
  }
  
  .table th,
  .table td {
    padding: 10px 6px;
  }
  
  .table th {
    font-size: 10px;
  }
  
  .table th:first-child {
    width: 40px;
  }
  
  .table th:nth-child(5),
  .table th:nth-child(6) {
    width: 80px;
  }
  
  .table th:nth-child(7) {
    width: 70px;
  }
  
  .table th:last-child {
    width: 100px;
  }
  
  .time-badge {
    padding: 4px 8px;
    font-size: 11px;
    min-width: 50px;
  }
  
  .status-badge {
    padding: 3px 8px;
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .dashboard-page {
    padding: 5px;
  }
  
  .card {
    padding: 10px;
  }
  
  .table {
    font-size: 11px;
  }
  
  .table th,
  .table td {
    padding: 8px 4px;
  }
  
  .table th {
    font-size: 9px;
  }
  
  .table th:first-child {
    width: 35px;
  }
  
  .table th:nth-child(5),
  .table th:nth-child(6) {
    width: 70px;
  }
  
  .table th:nth-child(7) {
    width: 60px;
  }
  
  .table th:last-child {
    width: 80px;
  }
  
  .time-badge {
    padding: 3px 6px;
    font-size: 10px;
    min-width: 45px;
  }
  
  .status-badge {
    padding: 2px 6px;
    font-size: 9px;
  }
  
  /* Hide some columns on very small screens */
  .table th:nth-child(2),
  .table td:nth-child(2) {
    display: none;
  }
}
</style>