import QRCode from 'qrcode'
import fs from 'fs/promises'
import path from 'path'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'absensi_siswa',
  port: process.env.DB_PORT || 3306
}

async function generateQRCodes() {
  let connection
  
  try {
    console.log('🔄 Connecting to database...')
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connected to database')
    
    // Get all students
    const [students] = await connection.execute(
      'SELECT id, nis, name, class, qr_code FROM students ORDER BY class, name'
    )
    
    if (students.length === 0) {
      console.log('❌ No students found in database')
      console.log('💡 Run: npm run init-db to create sample data')
      return
    }
    
    console.log(`📊 Found ${students.length} students`)
    
    // Create output directory
    const outputDir = path.join(process.cwd(), 'qr-codes')
    
    try {
      await fs.access(outputDir)
    } catch {
      await fs.mkdir(outputDir, { recursive: true })
      console.log(`📁 Created directory: ${outputDir}`)
    }
    
    // Generate QR codes
    console.log('🔄 Generating QR codes...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const student of students) {
      try {
        // QR code data
        const qrData = student.qr_code
        
        // File name
        const fileName = `${student.nis}_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
        const filePath = path.join(outputDir, fileName)
        
        // QR code options
        const qrOptions = {
          type: 'png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 300
        }
        
        // Generate QR code
        await QRCode.toFile(filePath, qrData, qrOptions)
        
        console.log(`✅ Generated: ${fileName}`)
        successCount++
        
      } catch (error) {
        console.error(`❌ Error generating QR for ${student.name}:`, error.message)
        errorCount++
      }
    }
    
    // Generate HTML index file for easy viewing
    console.log('🔄 Generating HTML index...')
    
    const htmlContent = generateHTMLIndex(students)
    const htmlPath = path.join(outputDir, 'index.html')
    await fs.writeFile(htmlPath, htmlContent, 'utf8')
    
    console.log('✅ Generated HTML index')
    
    // Generate CSV file with QR data
    console.log('🔄 Generating CSV file...')
    
    const csvContent = generateCSV(students)
    const csvPath = path.join(outputDir, 'students_qr_data.csv')
    await fs.writeFile(csvPath, csvContent, 'utf8')
    
    console.log('✅ Generated CSV file')
    
    // Summary
    console.log('\n📊 Generation Summary:')
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   📁 Output directory: ${outputDir}`)
    console.log(`   🌐 View all QR codes: ${htmlPath}`)
    console.log(`   📄 CSV data: ${csvPath}`)
    
    if (successCount > 0) {
      console.log('\n🎉 QR codes generated successfully!')
      console.log('\n📝 Next steps:')
      console.log('   1. Print the QR codes from the generated PNG files')
      console.log('   2. Distribute QR codes to students')
      console.log('   3. Test scanning with the web application')
    }
    
  } catch (error) {
    console.error('❌ Error generating QR codes:', error)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Database connection error. Check your .env file.')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL server is not running or not accessible.')
    }
    
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

function generateHTMLIndex(students) {
  const studentsByClass = students.reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = []
    }
    acc[student.class].push(student)
    return acc
  }, {})
  
  let html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code Siswa - Sistem Absensi</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        h2 {
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-top: 40px;
        }
        .student-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .student-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            background: #fafafa;
        }
        .student-card img {
            max-width: 200px;
            height: auto;
            margin: 10px 0;
        }
        .student-info {
            margin-bottom: 15px;
        }
        .student-name {
            font-weight: bold;
            font-size: 16px;
            color: #333;
        }
        .student-details {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }
        .print-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .print-btn:hover {
            background: #5a6fd8;
        }
        @media print {
            .print-btn { display: none; }
            .student-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 QR Code Siswa - Sistem Absensi</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
            Generated on: ${new Date().toLocaleString('id-ID')}
        </p>
`
  
  Object.keys(studentsByClass).sort().forEach(className => {
    html += `
        <h2>📚 Kelas ${className}</h2>
        <div class="student-grid">
`
    
    studentsByClass[className].forEach(student => {
      const fileName = `${student.nis}_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
      
      html += `
            <div class="student-card">
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-details">
                        NIS: ${student.nis}<br>
                        Kelas: ${student.class}
                    </div>
                </div>
                <img src="${fileName}" alt="QR Code ${student.name}">
                <br>
                <button class="print-btn" onclick="printCard(this)">🖨️ Print</button>
            </div>
`
    })
    
    html += `
        </div>
`
  })
  
  html += `
    </div>
    
    <script>
        function printCard(button) {
            const card = button.closest('.student-card');
            const printWindow = window.open('', '_blank');
            const cardInfo = card.querySelector('.student-info').innerHTML;
            const cardImg = card.querySelector('img').outerHTML;
            printWindow.document.write(
                '<html>' +
                    '<head>' +
                        '<title>Print QR Code</title>' +
                        '<style>' +
                            'body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }' +
                            'img { max-width: 300px; }' +
                            '.info { margin-bottom: 20px; }' +
                        '</style>' +
                    '</head>' +
                    '<body>' +
                        '<div class="info">' + cardInfo + '</div>' +
                        cardImg +
                    '</body>' +
                '</html>'
            );
            printWindow.document.close();
            printWindow.print();
        }
    </script>
</body>
</html>
`
  
  return html
}

function generateCSV(students) {
  const headers = ['NIS', 'Nama', 'Kelas', 'QR Code']
  const rows = students.map(student => [
    student.nis,
    `"${student.name}"`,
    `"${student.class}"`,
    student.qr_code
  ])
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

// Run the QR generation
generateQRCodes()