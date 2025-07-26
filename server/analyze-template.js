import XLSX from 'xlsx';
import fs from 'fs';

// Script to analyze the structure of the uploaded template
const templatePath = '../uploads/1753490088267-Abnahmeprotokoll Leer.xlsx';

if (fs.existsSync(templatePath)) {
  console.log('Analyzing template:', templatePath);
  
  const workbook = XLSX.read(fs.readFileSync(templatePath), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log('Sheet name:', sheetName);
  console.log('Range:', worksheet['!ref']);
  
  // Convert to JSON to see structure
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  console.log('\n=== TEMPLATE STRUCTURE ANALYSIS ===');
  console.log('Total rows:', jsonData.length);
  
  // Look for cells that might be form fields (containing underscores, spaces, or common patterns)
  console.log('\n=== POTENTIAL FORM FIELDS ===');
  for (let R = 0; R < Math.min(50, jsonData.length); R++) {
    const row = jsonData[R];
    for (let C = 0; C < Math.min(20, row.length); C++) {
      const cell = row[C];
      if (cell && typeof cell === 'string') {
        // Look for potential form field patterns
        if (cell.includes('____') || cell.includes('...') || 
            cell.toLowerCase().includes('név') || 
            cell.toLowerCase().includes('dátum') ||
            cell.toLowerCase().includes('name') ||
            cell.toLowerCase().includes('date') ||
            /^\s*$/.test(cell) === false && cell.length < 50) {
          console.log(`Row ${R+1}, Col ${String.fromCharCode(65+C)}: "${cell}"`);
        }
      }
    }
  }

  // Look for specific cells that might need our data
  console.log('\n=== SEARCHING FOR SPECIFIC PATTERNS ===');
  const patterns = ['név', 'name', 'dátum', 'date', 'szerelő', 'technician', 'irányító', 'postal', 'város', 'city', 'utca', 'street', 'otis', 'lift'];
  
  for (let R = 0; R < jsonData.length; R++) {
    const row = jsonData[R];
    for (let C = 0; C < row.length; C++) {
      const cell = row[C];
      if (cell && typeof cell === 'string') {
        const cellLower = cell.toLowerCase();
        for (const pattern of patterns) {
          if (cellLower.includes(pattern)) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            console.log(`${cellRef} (Row ${R+1}, Col ${String.fromCharCode(65+C)}): "${cell}"`);
            
            // Check adjacent cells for possible input fields
            const rightCell = row[C+1];
            const belowCell = jsonData[R+1] ? jsonData[R+1][C] : undefined;
            
            if (rightCell !== undefined) {
              console.log(`  -> Right cell: "${rightCell}"`);
            }
            if (belowCell !== undefined) {
              console.log(`  -> Below cell: "${belowCell}"`);
            }
            console.log('---');
            break;
          }
        }
      }
    }
  }
  
} else {
  console.log('Template file not found:', templatePath);
}