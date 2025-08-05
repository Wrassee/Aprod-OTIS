const XLSX = require('xlsx');
const fs = require('fs');

// Script to parse questions from uploaded template
const templatePath = process.argv[2]; // Get path from command line argument

if (!templatePath) {
  console.error('Template path not provided');
  process.exit(1);
}

if (fs.existsSync(templatePath)) {
  try {
    const workbook = XLSX.read(fs.readFileSync(templatePath), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    const questions = [];
    
    // Check if this is a structured question template (with headers)
    if (jsonData.length > 1) {
      const headers = jsonData[0];
      
      // Look for standard question template structure
      const idCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('id'));
      const questionCol = headers.findIndex(h => h && (h.toString().toLowerCase().includes('kérdés') || h.toString().toLowerCase().includes('question')));
      const typeCol = headers.findIndex(h => h && (h.toString().toLowerCase().includes('típus') || h.toString().toLowerCase().includes('type')));
      const cellCol = headers.findIndex(h => h && (h.toString().toLowerCase().includes('cella') || h.toString().toLowerCase().includes('cell')));
      
      if (idCol >= 0 && questionCol >= 0 && typeCol >= 0 && cellCol >= 0) {
        // Parse structured template
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[idCol] && row[questionCol] && row[typeCol] && row[cellCol]) {
            questions.push({
              id: row[idCol].toString(),
              title: row[questionCol].toString(),
              type: row[typeCol].toString().toLowerCase().replace(/_/g, '_'),
              cellReference: row[cellCol].toString(),
              required: true
            });
          }
        }
      }
    }
    
    // If no structured questions found, try to detect form fields
    if (questions.length === 0) {
      let questionId = 1;
      
      // Look for form field patterns
      for (let R = 0; R < Math.min(100, jsonData.length); R++) {
        const row = jsonData[R] || [];
        for (let C = 0; C < Math.min(20, row.length); C++) {
          const cell = row[C];
          if (cell && typeof cell === 'string') {
            const cellText = cell.trim();
            
            // Detect form field patterns
            if (cellText.includes('____') || cellText.includes('...') || 
                (cellText.length > 5 && cellText.length < 100 && cellText.includes(':'))) {
              
              const cellRef = XLSX.utils.encode_cell({ r: R, c: C + 1 }); // Assume input is next cell
              let questionType = 'text';
              
              // Determine type based on content
              if (cellText.toLowerCase().includes('dátum') || cellText.toLowerCase().includes('date')) {
                questionType = 'date';
              } else if (cellText.toLowerCase().includes('szám') || cellText.toLowerCase().includes('number')) {
                questionType = 'number';
              } else if (cellText.toLowerCase().includes('igen/nem') || cellText.toLowerCase().includes('yes/no')) {
                questionType = 'yes_no_na';
              }
              
              questions.push({
                id: `Q${questionId}`,
                title: cellText.replace(/[_.:]+$/, '').trim(),
                type: questionType,
                cellReference: cellRef,
                required: true
              });
              
              questionId++;
            }
          }
        }
      }
    }
    
    // Output JSON for the Node.js process to consume
    console.log(JSON.stringify(questions));
    
  } catch (error) {
    console.error('Error parsing template:', error.message);
    process.exit(1);
  }
  
} else {
  console.log('Template file not found:', templatePath);
}