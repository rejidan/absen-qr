import express from 'express'
import { supabase } from '../config/database.js'

const router = express.Router()

// GET /api/settings - Get all settings
router.get('/', async (req, res) => {
  try {
    const { data: settingsData, error } = await supabase
      .from('settings')
      .select('*')
      .order('setting_key')
    
    if (error) throw error
    
    // Convert to key-value object for easier frontend consumption
    const settings = {}
    settingsData.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
        updated_at: row.updated_at
      }
    })
    
    res.json({
      success: true,
      data: settings
    })
    
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil pengaturan'
    })
  }
})

// GET /api/settings/:key - Get specific setting
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params
    
    const { data: setting, error } = await supabase
      .from('settings')
      .select('*')
      .eq('setting_key', key)
      .single()
    
    if (error || !setting) {
      return res.status(404).json({
        success: false,
        message: 'Pengaturan tidak ditemukan'
      })
    }
    
    res.json({
      success: true,
      data: {
        key: setting.setting_key,
        value: setting.setting_value,
        description: setting.description,
        updated_at: setting.updated_at
      }
    })
    
  } catch (error) {
    console.error('Error fetching setting:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil pengaturan'
    })
  }
})

// PUT /api/settings/:key - Update specific setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const { value } = req.body
    
    console.log(`🔧 [SETTINGS] PUT /:key request received for ${key}`)    
    console.log(`📥 [SETTINGS] Request body:`, req.body)
    console.log(`🔧 [SETTINGS] PUT /:key request for ${key} with value: "${value}"`)
    console.log(`📥 [SETTINGS] Value: "${value}" (type: ${typeof value})`)
    
    if (!value) {
      console.log(`❌ [SETTINGS] Empty value for ${key}`)
      return res.status(400).json({
        success: false,
        message: 'Nilai pengaturan tidak boleh kosong'
      })
    }
    
    // Check if setting exists
    const { data: existingSetting, error: checkError } = await supabase
      .from('settings')
      .select('*')
      .eq('setting_key', key)
      .single()
    
    if (checkError || !existingSetting) {
      console.log(`❌ [SETTINGS] Setting ${key} not found`)
      return res.status(404).json({
        success: false,
        message: 'Pengaturan tidak ditemukan'
      })
    }
    
    // Validate time format for time-related settings
    if (key.includes('time')) {
      const isValid = isValidTimeFormat(value)
      console.log(`⏰ [SETTINGS] Time validation for ${key}: "${value}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`)
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Format waktu tidak valid. Gunakan format HH:MM'
        })
      }
    }
    
    // Validate numeric values for tolerance
    if (key === 'late_tolerance') {
      const isValidTolerance = !isNaN(value) && parseInt(value) >= 0
      console.log(`🕐 [SETTINGS] Tolerance validation: "${value}" -> ${isValidTolerance ? '✅ Valid' : '❌ Invalid'}`)
      if (!isValidTolerance) {
        return res.status(400).json({
          success: false,
          message: 'Toleransi harus berupa angka positif'
        })
      }
    }
    
    // Normalize time format to HH:MM:SS if it's a time setting
    let normalizedValue = value
    if (key.includes('time')) {
      // First convert dots to colons if present (13.00 -> 13:00)
      normalizedValue = value.replace(/\./g, ':')
      // Then add seconds if missing (13:00 -> 13:00:00)
      if (normalizedValue.length === 5) {
        normalizedValue = normalizedValue + ':00'
      }
      console.log(`🔄 [SETTINGS] Normalized ${key}: "${value}" -> "${normalizedValue}"`)
    }
    
    console.log(`💾 [SETTINGS] Updating ${key} with value: "${normalizedValue}"`)
    
    const { error: updateError } = await supabase
      .from('settings')
      .update({ setting_value: normalizedValue })
      .eq('setting_key', key)
    
    if (updateError) throw updateError
    
    console.log(`✅ [SETTINGS] Updated ${key}`)
    console.log(`🎉 [SETTINGS] Successfully updated ${key}`)
    
    res.json({
      success: true,
      message: 'Pengaturan berhasil diperbarui',
      data: {
        key,
        value
      }
    })
    
  } catch (error) {
    console.error(`💥 [SETTINGS] Error updating setting ${req.params.key}:`, error)
    console.error('📍 [SETTINGS] Error stack:', error.stack)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui pengaturan'
    })
  }
})

// PUT /api/settings - Update multiple settings at once
router.put('/', async (req, res) => {
  try {
    console.log('🔧 [SETTINGS] Batch update request received:')
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2))
    
    const { settings } = req.body
    
    if (!settings || typeof settings !== 'object') {
      console.log('❌ [SETTINGS] Invalid settings data type:', typeof settings)
      return res.status(400).json({
        success: false,
        message: 'Data pengaturan tidak valid'
      })
    }
    
    const updates = []
    const errors = []
    
    console.log('🔍 [SETTINGS] Validating settings...')
    
    // Validate all settings first
    for (const [key, value] of Object.entries(settings)) {
      console.log(`🔍 [SETTINGS] Validating ${key}: "${value}" (type: ${typeof value})`)
      
      if (!value) {
        console.log(`❌ [SETTINGS] Empty value for ${key}`)
        errors.push(`Nilai untuk ${key} tidak boleh kosong`)
        continue
      }
      
      // Validate time format
      if (key.includes('time')) {
        const isValid = isValidTimeFormat(value)
        console.log(`⏰ [SETTINGS] Time validation for ${key}: "${value}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`)
        if (!isValid) {
          errors.push(`Format waktu untuk ${key} tidak valid`)
          continue
        }
      }
      
      // Validate tolerance
      if (key === 'late_tolerance') {
        const isValidTolerance = !isNaN(value) && parseInt(value) >= 0
        console.log(`🕐 [SETTINGS] Tolerance validation: "${value}" -> ${isValidTolerance ? '✅ Valid' : '❌ Invalid'}`)
        if (!isValidTolerance) {
          errors.push(`Toleransi harus berupa angka positif`)
          continue
        }
      }
      
      updates.push([value, key])
      console.log(`✅ [SETTINGS] ${key} passed validation`)
    }
    
    if (errors.length > 0) {
      console.log('❌ [SETTINGS] Validation failed with errors:', errors)
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors
      })
    }
    
    console.log(`📝 [SETTINGS] Updating ${updates.length} settings...`)
    
    // Update all settings
    for (const [value, key] of updates) {
      // Normalize time format to HH:MM:SS if it's a time setting
      let normalizedValue = value
      if (key.includes('time')) {
        // First convert dots to colons if present (13.00 -> 13:00)
        normalizedValue = value.replace(/\./g, ':')
        // Then add seconds if missing (13:00 -> 13:00:00)
        if (normalizedValue.length === 5) {
          normalizedValue = normalizedValue + ':00'
        }
        console.log(`🔄 [SETTINGS] Normalized ${key}: "${value}" -> "${normalizedValue}"`)
      }
      
      console.log(`💾 [SETTINGS] Updating ${key} with value: "${normalizedValue}"`)
      
      const { error: updateError } = await supabase
        .from('settings')
        .update({ setting_value: normalizedValue })
        .eq('setting_key', key)
      
      if (updateError) throw updateError
      
      console.log(`✅ [SETTINGS] Updated ${key}`)
    }
    
    console.log('🎉 [SETTINGS] All settings updated successfully')
    
    res.json({
      success: true,
      message: `${updates.length} pengaturan berhasil diperbarui`
    })
    
  } catch (error) {
    console.error('💥 [SETTINGS] Error updating settings:', error)
    console.error('📍 [SETTINGS] Error stack:', error.stack)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui pengaturan'
    })
  }
})

// GET /api/settings/time/schedule - Get time schedule in a formatted way
router.get('/time/schedule', async (req, res) => {
  try {
    const { data: settingsData, error } = await supabase
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['arrival_time_start', 'arrival_time_end', 'departure_time_start', 'departure_time_end', 'late_tolerance'])
    
    if (error) throw error
    
    const schedule = {}
    settingsData.forEach(row => {
      schedule[row.setting_key] = row.setting_value
    })
    
    res.json({
      success: true,
      data: {
        arrival: {
          start: schedule.arrival_time_start || '06:30:00',
          end: schedule.arrival_time_end || '07:30:00'
        },
        departure: {
          start: schedule.departure_time_start || '15:00:00',
          end: schedule.departure_time_end || '17:00:00'
        },
        late_tolerance: parseInt(schedule.late_tolerance || '15')
      }
    })
    
  } catch (error) {
    console.error('Error fetching time schedule:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil jadwal waktu'
    })
  }
})

// Helper function to validate time format (HH:MM:SS)
function isValidTimeFormat(timeString) {
  console.log(`🔍 [VALIDATION] Checking time format for: "${timeString}" (length: ${timeString?.length})`)
  
  // Convert dots to colons if present (13.00 -> 13:00)
  const normalizedTime = timeString?.replace(/\./g, ':')
  console.log(`🔄 [VALIDATION] Normalized time: "${normalizedTime}"`)
  
  // Accept both HH:MM and HH:MM:SS formats
  const timeRegexWithSeconds = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
  const timeRegexWithoutSeconds = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  
  const isValid = timeRegexWithSeconds.test(normalizedTime) || timeRegexWithoutSeconds.test(normalizedTime)
  console.log(`✅ [VALIDATION] Time validation result: ${isValid}`)
  
  return isValid
}

export default router