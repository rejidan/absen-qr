<template>
  <div class="student-attendance-history">
    <!-- Header -->
    <div class="header-section">
      <div class="student-info" v-if="student">
        <h2>Riwayat Kehadiran</h2>
        <div class="student-details">
          <p><strong>NIS:</strong> {{ student.nis }}</p>
          <p><strong>Nama:</strong> {{ student.name }}</p>
          <p><strong>Kelas:</strong> {{ student.class }}</p>
        </div>
      </div>
      <button @click="$emit('close')" class="close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label>Periode:</label>
        <select v-model="selectedPeriod" @change="onPeriodChange">
          <option value="all">Semua</option>
          <option value="thisMonth">Bulan Ini</option>
          <option value="lastMonth">Bulan Lalu</option>
          <option value="thisYear">Tahun Ini</option>
          <option value="custom">Kustom</option>
        </select>
      </div>

      <div class="filter-group" v-if="selectedPeriod === 'custom'">
        <label>Dari Tanggal:</label>
        <input type="date" v-model="startDate" @change="loadAttendanceHistory">
      </div>

      <div class="filter-group" v-if="selectedPeriod === 'custom'">
        <label>Sampai Tanggal:</label>
        <input type="date" v-model="endDate" @change="loadAttendanceHistory">
      </div>

      <div class="filter-group">
        <label>Status:</label>
        <select v-model="selectedStatus" @change="filterData">
          <option value="all">Semua Status</option>
          <option value="hadir">Hadir</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
          <option value="alpha">Alpha</option>
        </select>
      </div>

      <button @click="exportToCSV" class="export-btn" :disabled="filteredAttendance.length === 0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7,10 12,15 17,10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Ekspor CSV
      </button>
    </div>

    <!-- Statistics -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-number">{{ stats.hadir }}</div>
        <div class="stat-label">Hadir</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.izin }}</div>
        <div class="stat-label">Izin</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.sakit }}</div>
        <div class="stat-label">Sakit</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.alpha }}</div>
        <div class="stat-label">Alpha</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ filteredAttendance.length }}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Memuat riwayat kehadiran...</p>
    </div>

    <!-- Attendance Table -->
    <div v-else-if="filteredAttendance.length > 0" class="table-section">
      <div class="table-container">
        <table class="attendance-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Jam Masuk</th>
              <th>Jam Keluar</th>
              <th>Status</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(record, index) in paginatedAttendance" :key="index">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td>{{ formatDate(record.date) }}</td>
              <td>
                <span v-if="record.timeIn" class="time-badge time-in">{{ record.timeIn }}</span>
                <span v-else class="time-badge time-empty">-</span>
              </td>
              <td>
                <span v-if="record.timeOut" class="time-badge time-out">{{ record.timeOut }}</span>
                <span v-else class="time-badge time-empty">-</span>
              </td>
              <td>
                <span :class="`status-badge status-${record.status}`">
                  {{ record.status.charAt(0).toUpperCase() + record.status.slice(1) }}
                </span>
              </td>
              <td>{{ record.notes || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="totalPages > 1">
        <button 
          @click="currentPage = Math.max(1, currentPage - 1)" 
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          ← Sebelumnya
        </button>
        
        <span class="pagination-info">
          Halaman {{ currentPage }} dari {{ totalPages }}
        </span>
        
        <button 
          @click="currentPage = Math.min(totalPages, currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Selanjutnya →
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"></path>
          <polyline points="9,11 9,9 12,6 15,9 15,11"></polyline>
        </svg>
      </div>
      <h3>Tidak Ada Data Kehadiran</h3>
      <p>Belum ada riwayat kehadiran untuk periode yang dipilih.</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from '../config/api.js'

export default {
  name: 'StudentAttendanceHistory',
  props: {
    studentId: {
      type: [String, Number],
      required: true
    }
  },
  emits: ['close'],
  setup(props) {
    const student = ref(null)
    const attendanceData = ref([])
    const isLoading = ref(false)
    const selectedPeriod = ref('thisMonth')
    const selectedStatus = ref('all')
    const startDate = ref('')
    const endDate = ref('')
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    // Computed properties
    const filteredAttendance = computed(() => {
      let filtered = attendanceData.value
      
      if (selectedStatus.value !== 'all') {
        filtered = filtered.filter(item => item.status === selectedStatus.value)
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
        
        // Fallback to date sorting
        return new Date(b.date) - new Date(a.date)
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
    const loadAttendanceHistory = async () => {
      try {
        isLoading.value = true
        const params = new URLSearchParams()
        
        if (selectedPeriod.value === 'custom' && startDate.value && endDate.value) {
          params.append('startDate', startDate.value)
          params.append('endDate', endDate.value)
        } else if (selectedPeriod.value === 'thisMonth') {
          const now = new Date()
          params.append('month', now.getMonth() + 1)
          params.append('year', now.getFullYear())
        } else if (selectedPeriod.value === 'lastMonth') {
          const now = new Date()
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          params.append('month', lastMonth.getMonth() + 1)
          params.append('year', lastMonth.getFullYear())
        } else if (selectedPeriod.value === 'thisYear') {
          const now = new Date()
          params.append('year', now.getFullYear())
        }
        
        const response = await axios.get(`${API_BASE_URL}/students/${props.studentId}/attendance?${params}`)
        
        if (response.data.success) {
          student.value = response.data.student
          attendanceData.value = response.data.attendance
        } else {
          console.error('Failed to load attendance history:', response.data.message)
          attendanceData.value = []
        }
      } catch (error) {
        console.error('Error loading attendance history:', error)
        attendanceData.value = []
      } finally {
        isLoading.value = false
        currentPage.value = 1
      }
    }

    const onPeriodChange = () => {
      if (selectedPeriod.value === 'custom') {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate.value = firstDay.toISOString().split('T')[0]
        endDate.value = now.toISOString().split('T')[0]
      }
      loadAttendanceHistory()
    }

    const filterData = () => {
      currentPage.value = 1
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const exportToCSV = () => {
      if (filteredAttendance.value.length === 0) return
      
      const headers = ['No', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status', 'Catatan']
      const csvContent = [
        headers.join(','),
        ...filteredAttendance.value.map((record, index) => [
          index + 1,
          record.date,
          record.timeIn || '-',
          record.timeOut || '-',
          record.status,
          record.notes || '-'
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `riwayat_kehadiran_${student.value?.name || 'siswa'}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    // Watch for student ID changes
    watch(() => props.studentId, () => {
      if (props.studentId) {
        loadAttendanceHistory()
      }
    }, { immediate: true })

    onMounted(() => {
      loadAttendanceHistory()
    })

    return {
      student,
      attendanceData,
      isLoading,
      selectedPeriod,
      selectedStatus,
      startDate,
      endDate,
      currentPage,
      itemsPerPage,
      filteredAttendance,
      totalPages,
      paginatedAttendance,
      stats,
      loadAttendanceHistory,
      onPeriodChange,
      filterData,
      formatDate,
      exportToCSV
    }
  }
}
</script>

<style scoped>
.student-attendance-history {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.student-info h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
}

.student-details {
  display: flex;
  gap: 24px;
}

.student-details p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: white;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.filters-section {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  min-width: 120px;
}

.export-btn {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.export-btn:hover:not(:disabled) {
  background: #059669;
}

.export-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.stats-section {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.stat-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  flex: 1;
  min-width: 80px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: #6b7280;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.table-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-container {
  flex: 1;
  overflow: auto;
}

.attendance-table {
  width: 100%;
  border-collapse: collapse;
}

.attendance-table th {
  background: #f9fafb;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 1;
}

.attendance-table td {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.attendance-table tbody tr:hover {
  background: #f9fafb;
}

.time-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.time-in {
  background: #dcfce7;
  color: #166534;
}

.time-out {
  background: #fef3c7;
  color: #92400e;
}

.time-empty {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-hadir {
  background: #dcfce7;
  color: #166534;
}

.status-izin {
  background: #dbeafe;
  color: #1e40af;
}

.status-sakit {
  background: #fef3c7;
  color: #92400e;
}

.status-alpha {
  background: #fee2e2;
  color: #dc2626;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.pagination-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  .filters-section {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .stats-section {
    flex-wrap: wrap;
  }
  
  .student-details {
    flex-direction: column;
    gap: 8px;
  }
  
  .attendance-table {
    font-size: 12px;
  }
  
  .attendance-table th,
  .attendance-table td {
    padding: 8px;
  }
}
</style>