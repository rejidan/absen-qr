import express from 'express'
import { supabase } from '../config/database.js'

const router = express.Router()

// POST /api/attendance - Record attendance via QR scan
router.post('/', async (req, res) => {
  try {
    const { qr_code } = req.body
    
    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required'
      })
    }
    
    // Find student by QR code
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('qr_code', qr_code)
      .single()
    
    if (studentError || !students) {
      return res.status(404).json({
        success: false,
        message: 'QR code tidak valid atau siswa tidak ditemukan'
      })
    }
    
    const student = students
    const today = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toTimeString().split(' ')[0]
    
    // Check if student already has attendance record today
    const { data: existingAttendance, error: attendanceError } = await supabase
      .from('attendances')
      .select('*')
      .eq('student_id', student.id)
      .eq('date', today)
      .single()

    const hasExisting = existingAttendance && !attendanceError
    const existing = hasExisting ? existingAttendance : null
    
    // Get time settings from database
    const { data: timeSettings, error: settingsError } = await supabase
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['arrival_time_start', 'arrival_time_end', 'departure_time_start', 'departure_time_end', 'late_tolerance'])
    
    const settings = {}
    if (timeSettings && !settingsError) {
      timeSettings.forEach(row => {
        settings[row.setting_key] = row.setting_value
      })
    }
    
    // Default values if settings not found
    const arrivalStart = settings.arrival_time_start || '06:30:00'
    const arrivalEnd = settings.arrival_time_end || '07:30:00'
    const departureStart = settings.departure_time_start || '15:00:00'
    const departureEnd = settings.departure_time_end || '17:00:00'
    const lateTolerance = parseInt(settings.late_tolerance || '15')
    
    // Convert time strings to minutes for comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const now = new Date()
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes()
    const arrivalStartMin = timeToMinutes(arrivalStart)
    const arrivalEndMin = timeToMinutes(arrivalEnd) + lateTolerance
    const departureStartMin = timeToMinutes(departureStart)
    const departureEndMin = timeToMinutes(departureEnd)
    
    // Determine if it's arrival or departure time
    let attendanceType = 'arrival'
    let status = 'hadir'
    
    if (currentTimeMinutes >= departureStartMin && currentTimeMinutes <= departureEndMin) {
      attendanceType = 'departure'
      // Check if student hasn't checked in yet
      if (!hasExisting || !existing.time_in) {
        return res.status(400).json({
          success: false,
          message: `${student.name} belum melakukan absensi datang hari ini`
        })
      }
      // Check if already checked out
      if (existing.time_out) {
        return res.status(400).json({
          success: false,
          message: `${student.name} sudah melakukan absensi pulang hari ini pada ${existing.time_out}`
        })
      }
    } else if (currentTimeMinutes >= arrivalStartMin && currentTimeMinutes <= arrivalEndMin) {
      attendanceType = 'arrival'
      // Check if already checked in
      if (hasExisting && existing.time_in) {
        return res.status(400).json({
          success: false,
          message: `${student.name} sudah melakukan absensi datang hari ini pada ${existing.time_in}`
        })
      }
      // Check if late
      if (currentTimeMinutes > timeToMinutes(arrivalEnd)) {
        status = 'terlambat'
      }
    } else {
      return res.status(400).json({
        success: false,
        message: `Absensi hanya dapat dilakukan pada jam:\n- Datang: ${arrivalStart} - ${arrivalEnd} (+ ${lateTolerance} menit toleransi)\n- Pulang: ${departureStart} - ${departureEnd}`
      })
    }

    let result
    if (attendanceType === 'arrival') {
      if (hasExisting) {
        // Update existing record with time_in
        const { error: updateError } = await supabase
          .from('attendances')
          .update({ time_in: currentTime, status: status })
          .eq('student_id', student.id)
          .eq('date', today)
        
        if (updateError) throw updateError
        result = { insertId: existing.id }
      } else {
        // Create new record with time_in
        const { data: insertData, error: insertError } = await supabase
          .from('attendances')
          .insert({ student_id: student.id, date: today, time_in: currentTime, status: status })
          .select('id')
          .single()
        
        if (insertError) throw insertError
        result = { insertId: insertData.id }
      }
    } else {
      // Update existing record with time_out
      const { error: updateError } = await supabase
        .from('attendances')
        .update({ time_out: currentTime })
        .eq('student_id', student.id)
        .eq('date', today)
      
      if (updateError) throw updateError
      result = { insertId: existing.id }
    }
    
    const attendanceMessage = attendanceType === 'arrival' 
      ? (status === 'terlambat' ? 'Absensi datang berhasil dicatat (Terlambat)' : 'Absensi datang berhasil dicatat')
      : 'Absensi pulang berhasil dicatat'

    // Get updated attendance record
    const { data: updatedRecord, error: recordError } = await supabase
      .from('attendances')
      .select('*')
      .eq('student_id', student.id)
      .eq('date', today)
      .single()
    
    if (recordError) throw recordError

    res.json({
      success: true,
      message: attendanceMessage,
      student: {
        id: student.id,
        name: student.name,
        nis: student.nis,
        class: student.class
      },
      attendance: {
        id: result.insertId,
        date: today,
        timeIn: updatedRecord.time_in,
        timeOut: updatedRecord.time_out,
        status: updatedRecord.status,
        type: attendanceType
      }
    })
    
  } catch (error) {
    console.error('Error recording attendance:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencatat absensi'
    })
  }
})

// GET /api/attendance - Get attendance records
router.get('/', async (req, res) => {
  try {
    const { date, class: className, student_id, sortBy = 'updated_at', sortOrder = 'DESC' } = req.query
    
    // Configure sorting based on parameters
    const validSortColumns = ['updated_at', 'created_at', 'date', 'time_in', 'time_out']
    const validSortOrders = ['ASC', 'DESC']
    
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'updated_at'
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    
    // Build Supabase query
    let supabaseQuery = supabase
      .from('attendances')
      .select(`
        id,
        date,
        created_at,
        updated_at,
        time_in,
        time_out,
        status,
        students!inner(
          id,
          nis,
          name,
          class
        )
      `)
    
    // Apply filters
    if (date) {
      supabaseQuery = supabaseQuery.eq('date', date)
    }
    
    if (className) {
      supabaseQuery = supabaseQuery.eq('students.class', className)
    }
    
    if (student_id) {
      supabaseQuery = supabaseQuery.eq('students.id', student_id)
    }
    
    // Apply sorting
    if (sortColumn === 'updated_at') {
      supabaseQuery = supabaseQuery.order('updated_at', { ascending: sortDirection === 'ASC' })
    } else if (sortColumn === 'created_at') {
      supabaseQuery = supabaseQuery.order('created_at', { ascending: sortDirection === 'ASC' })
    } else if (sortColumn === 'date') {
      supabaseQuery = supabaseQuery.order('date', { ascending: sortDirection === 'ASC' })
    } else if (sortColumn === 'time_in') {
      supabaseQuery = supabaseQuery.order('time_in', { ascending: sortDirection === 'ASC' })
    } else if (sortColumn === 'time_out') {
      supabaseQuery = supabaseQuery.order('time_out', { ascending: sortDirection === 'ASC' })
    }
    
    const { data: attendanceData, error: attendanceError } = await supabaseQuery
    
    if (attendanceError) throw attendanceError
    
    // Transform data to match expected format
    const transformedData = attendanceData.map(record => ({
      id: record.id,
      date: record.date,
      created_at: record.created_at,
      updated_at: record.updated_at,
      timeIn: record.time_in,
      timeOut: record.time_out,
      status: record.status,
      student_id: record.students.id,
      nis: record.students.nis,
      studentName: record.students.name,
      class: record.students.class
    }))
    
    res.json({
      success: true,
      data: transformedData,
      count: transformedData.length
    })
    
  } catch (error) {
    console.error('Error fetching attendance:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data absensi'
    })
  }
})

// PUT /api/attendance/:id - Update attendance status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    const validStatuses = ['hadir', 'izin', 'sakit', 'alpha']
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid. Gunakan: hadir, izin, sakit, atau alpha'
      })
    }
    
    // Check if attendance record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single()
    
    if (checkError || !existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Data absensi tidak ditemukan'
      })
    }
    
    // Update status
    const { error: updateError } = await supabase
      .from('attendances')
      .update({ status: status })
      .eq('id', id)
    
    if (updateError) throw updateError
    
    res.json({
      success: true,
      message: 'Status absensi berhasil diupdate'
    })
    
  } catch (error) {
    console.error('Error updating attendance:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengupdate status absensi'
    })
  }
})

// GET /api/attendance/stats - Get attendance statistics
router.get('/stats', async (req, res) => {
  try {
    const { date, class: className } = req.query
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    // Build Supabase query for stats
    let query = supabase
      .from('attendances')
      .select('status, students!inner(class)')
      .eq('date', targetDate)
    
    if (className) {
      query = query.eq('students.class', className)
    }
    
    const { data: attendanceData, error } = await query
    
    if (error) throw error
    
    const stats = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0
    }
    
    // Count statuses
    attendanceData.forEach(record => {
      if (stats.hasOwnProperty(record.status)) {
        stats[record.status]++
      }
    })
    
    res.json({
      success: true,
      date: targetDate,
      class: className || 'Semua Kelas',
      stats
    })
    
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik'
    })
  }
})

export default router