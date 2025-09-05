import express from 'express'
import { supabase } from '../config/database.js'
import multer from 'multer'
import xlsx from 'xlsx'
import path from 'path'
import fs from 'fs'

const router = express.Router()

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true)
    } else {
      cb(new Error('File harus berformat Excel (.xlsx atau .xls)'), false)
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

// GET /api/students/template - Download Excel template
router.get('/template', async (req, res) => {
  try {
    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new()
    
    // Define template data with headers and example row
    const templateData = [
      ['NIS', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin', 'Tanggal Lahir', 'Alamat', 'No. Telepon'],
      ['12345678', 'Contoh Nama Siswa', '10A', 'L', '2005-01-15', 'Jl. Contoh No. 123', '081234567890']
    ]
    
    const worksheet = xlsx.utils.aoa_to_sheet(templateData)
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 12 }, // NIS
      { width: 25 }, // Nama Lengkap
      { width: 8 },  // Kelas
      { width: 15 }, // Jenis Kelamin
      { width: 15 }, // Tanggal Lahir
      { width: 30 }, // Alamat
      { width: 15 }  // No. Telepon
    ]
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template Data Siswa')
    
    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="template_data_siswa.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    res.send(buffer)
    
  } catch (error) {
    console.error('Error generating template:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat template'
    })
  }
})

// POST /api/students/import - Import students from Excel
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File Excel tidak ditemukan'
      })
    }

    // Read Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (data.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'File Excel kosong atau tidak memiliki data'
      })
    }

    // Validate headers
    const headers = data[0]
    const expectedHeaders = ['NIS', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin', 'Tanggal Lahir', 'Alamat', 'No. Telepon']
    
    const headerValid = expectedHeaders.every(header => 
      headers.some(h => h && h.toString().toLowerCase().includes(header.toLowerCase()))
    )
    
    if (!headerValid) {
      return res.status(400).json({
        success: false,
        message: 'Format header tidak sesuai. Pastikan kolom: NIS, Nama Lengkap, Kelas, Jenis Kelamin, Tanggal Lahir, Alamat, No. Telepon'
      })
    }

    // Process data rows
    const students = []
    const errors = []
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
        continue
      }
      
      const student = {
        nis: row[0] ? row[0].toString().trim() : '',
        name: row[1] ? row[1].toString().trim() : '',
        class: row[2] ? row[2].toString().trim() : '',
        gender: row[3] ? row[3].toString().trim() : '',
        birth_date: row[4] ? row[4].toString().trim() : '',
        address: row[5] ? row[5].toString().trim() : '',
        phone: row[6] ? row[6].toString().trim() : ''
      }
      
      // Validate required fields
      const rowErrors = []
      
      if (!student.nis) rowErrors.push('NIS tidak boleh kosong')
      if (!student.name) rowErrors.push('Nama tidak boleh kosong')
      if (!student.class) rowErrors.push('Kelas tidak boleh kosong')
      if (!student.gender || !['L', 'P', 'Laki-laki', 'Perempuan'].includes(student.gender)) {
        rowErrors.push('Jenis kelamin harus L/P atau Laki-laki/Perempuan')
      }
      
      // Normalize gender
      if (student.gender === 'Laki-laki') student.gender = 'L'
      if (student.gender === 'Perempuan') student.gender = 'P'
      
      // Validate birth_date format
      if (student.birth_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(student.birth_date)) {
          rowErrors.push('Format tanggal lahir harus YYYY-MM-DD')
        }
      }
      
      if (rowErrors.length > 0) {
        errors.push({
          row: i + 1,
          nis: student.nis,
          name: student.name,
          errors: rowErrors
        })
      } else {
        students.push(student)
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Terdapat kesalahan pada data',
        errors: errors
      })
    }
    
    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada data siswa yang valid untuk diimpor'
      })
    }

    // Check for duplicate NIS in database
    const nisValues = students.map(s => s.nis)
    const { data: existingStudents, error: checkError } = await supabase
      .from('students')
      .select('nis')
      .in('nis', nisValues)
    
    if (checkError) throw checkError
    
    const existingNIS = existingStudents.map(s => s.nis)
    const duplicates = students.filter(s => existingNIS.includes(s.nis))
    
    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Terdapat NIS yang sudah ada di database',
        duplicates: duplicates.map(s => ({ nis: s.nis, name: s.name }))
      })
    }

    // Insert students to database
    const { error: insertError } = await supabase
      .from('students')
      .insert(students)
    
    if (insertError) throw insertError
    
    res.json({
      success: true,
      message: `Berhasil mengimpor ${students.length} data siswa`,
      imported_count: students.length
    })
    
  } catch (error) {
    console.error('Error importing students:', error)
    
    if (error.message.includes('File harus berformat Excel')) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengimpor data siswa'
    })
  }
})

// GET /api/students - Get all students
router.get('/', async (req, res) => {
  try {
    const { class: className, search } = req.query
    
    let query = supabase
      .from('students')
      .select('*')
    
    if (className) {
      query = query.eq('class', className)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,nis.ilike.%${search}%`)
    }
    
    query = query.order('class').order('name')
    
    const { data: students, error } = await query
    
    if (error) throw error
    
    res.json({
      success: true,
      data: students,
      count: students.length
    })
    
  } catch (error) {
    console.error('Error fetching students:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data siswa'
    })
  }
})

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !student) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan'
      })
    }
    
    res.json({
      success: true,
      data: student
    })
    
  } catch (error) {
    console.error('Error fetching student:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data siswa'
    })
  }
})

// POST /api/students - Add new student
router.post('/', async (req, res) => {
  try {
    const { nis, name, class: className } = req.body
    
    if (!nis || !name || !className) {
      return res.status(400).json({
        success: false,
        message: 'NIS, nama, dan kelas harus diisi'
      })
    }
    
    // Check if NIS already exists
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('*')
      .eq('nis', nis)
      .single()
    
    if (existingStudent && !checkError) {
      return res.status(400).json({
        success: false,
        message: 'NIS sudah terdaftar'
      })
    }
    
    // Generate unique QR code
    const qrCode = `QR_${nis}_${Date.now()}`
    
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert({
        nis,
        name,
        class: className,
        qr_code: qrCode
      })
      .select()
      .single()
    
    if (insertError) throw insertError
    
    res.status(201).json({
      success: true,
      message: 'Siswa berhasil ditambahkan',
      data: newStudent
    })
    
  } catch (error) {
    console.error('Error adding student:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambah siswa'
    })
  }
})

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nis, name, class: className } = req.body
    
    if (!nis || !name || !className) {
      return res.status(400).json({
        success: false,
        message: 'NIS, nama, dan kelas harus diisi'
      })
    }
    
    // Check if student exists
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
    
    if (checkError || !existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan'
      })
    }
    
    // Check if NIS is taken by another student
    const { data: nisCheck, error: nisError } = await supabase
      .from('students')
      .select('*')
      .eq('nis', nis)
      .neq('id', id)
      .single()
    
    if (nisCheck && !nisError) {
      return res.status(400).json({
        success: false,
        message: 'NIS sudah digunakan oleh siswa lain'
      })
    }
    
    const { error: updateError } = await supabase
      .from('students')
      .update({
        nis,
        name,
        class: className
      })
      .eq('id', id)
    
    if (updateError) throw updateError
    
    res.json({
      success: true,
      message: 'Data siswa berhasil diupdate'
    })
    
  } catch (error) {
    console.error('Error updating student:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengupdate siswa'
    })
  }
})

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if student exists
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
    
    if (checkError || !existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan'
      })
    }
    
    // Delete related attendance records first
    const { error: deleteAttendanceError } = await supabase
      .from('attendances')
      .delete()
      .eq('student_id', id)
    
    if (deleteAttendanceError) throw deleteAttendanceError
    
    // Delete student
    const { error: deleteStudentError } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
    
    if (deleteStudentError) throw deleteStudentError
    
    res.json({
      success: true,
      message: 'Siswa berhasil dihapus'
    })
    
  } catch (error) {
    console.error('Error deleting student:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus siswa'
    })
  }
})

// GET /api/students/classes/list - Get list of classes
router.get('/classes/list', async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('class')
      .order('class')
    
    if (error) throw error
    
    // Get unique classes
    const classes = [...new Set(students.map(student => student.class))]
    
    res.json({
      success: true,
      data: classes
    })
    
  } catch (error) {
    console.error('Error fetching classes:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar kelas'
    })
  }
})

// GET /api/students/:id/attendance - Get student attendance history
router.get('/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params
    const { month, year, startDate, endDate, limit = 50, sortBy = 'updated_at', sortOrder = 'DESC' } = req.query
    
    // Check if student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
    
    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan'
      })
    }
    
    // Build Supabase query for attendance
    let query = supabase
      .from('attendances')
      .select('date, time_in, time_out, status, created_at, updated_at')
      .eq('student_id', parseInt(id))
    
    // Filter by date range
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else if (month && year) {
      const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]
      query = query.gte('date', startOfMonth).lte('date', endOfMonth)
    } else if (year) {
      const startOfYear = `${year}-01-01`
      const endOfYear = `${year}-12-31`
      query = query.gte('date', startOfYear).lte('date', endOfYear)
    }
    
    // Configure sorting based on parameters
    const validSortColumns = ['updated_at', 'created_at', 'date', 'time_in', 'time_out']
    const validSortOrders = ['ASC', 'DESC']
    
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'updated_at'
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    
    // Apply sorting
    query = query.order(sortColumn, { ascending: sortDirection === 'ASC' })
    
    // Add limit
    if (limit) {
      const limitValue = parseInt(limit)
      if (limitValue > 0 && limitValue <= 1000) {
        query = query.limit(limitValue)
      }
    }
    
    const { data: attendanceData, error: attendanceError } = await query
    
    if (attendanceError) throw attendanceError
    
    // Format the response data
    const formattedRows = attendanceData.map(row => ({
      ...row,
      timeIn: row.time_in ? row.time_in.substring(0, 5) : null,
      timeOut: row.time_out ? row.time_out.substring(0, 5) : null,
      date: row.date,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))
    
    res.json({
      success: true,
      student: student,
      attendance: formattedRows,
      count: formattedRows.length
    })
    
  } catch (error) {
    console.error('Error fetching student attendance:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil riwayat absensi'
    })
  }
})

export default router