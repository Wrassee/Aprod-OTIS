// Manual question parsing test
const XLSX = require('xlsx');
const fs = require('fs');

async function testParsing() {
  try {
    const filePath = '/home/runner/workspace/uploads/1756203381733-kerdes-template-minta.xlsx';
    
    if (!fs.existsSync(filePath)) {
      console.log('File not found, trying direct path...');
      const workbook = XLSX.readFile('./kerdes-template-minta.xlsx');
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('Sheet name:', sheetName);
      console.log('Header row:', data[0]);
      console.log('Data rows:', data.length);
      
      // Parse questions manually
      const headerRow = data[0];
      const getColumnIndex = (possibleNames) => {
        return possibleNames.reduce((index, name) => {
          if (index === -1) {
            return headerRow.findIndex((col) => 
              col?.toString().toLowerCase().trim().includes(name.toLowerCase())
            );
          }
          return index;
        }, -1);
      };
      
      const idIndex = getColumnIndex(['id', 'question_id', 'questionid']);
      const titleIndex = getColumnIndex(['title', 'title_en', 'question']);
      const titleHuIndex = getColumnIndex(['title_hu', 'hungarian', 'magyar']);
      const titleDeIndex = getColumnIndex(['title_de', 'german', 'deutsch']);
      const typeIndex = getColumnIndex(['type', 'input_type', 'field_type']);
      
      console.log(`Column indices:
        ID: ${idIndex} (${headerRow[idIndex]})
        Title: ${titleIndex} (${headerRow[titleIndex]})
        Title HU: ${titleHuIndex} (${headerRow[titleHuIndex]})
        Title DE: ${titleDeIndex} (${headerRow[titleDeIndex]})
        Type: ${typeIndex} (${headerRow[typeIndex]})`);
      
      if (idIndex === -1 || titleIndex === -1 || typeIndex === -1) {
        console.log('Required columns not found: ID, Title, Type');
        return;
      }
      
      // Parse data rows
      const questions = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[idIndex] || !row[titleIndex]) continue;
        
        const question = {
          questionId: row[idIndex].toString(),
          title: row[titleIndex].toString(),
          titleHu: titleHuIndex !== -1 ? row[titleHuIndex]?.toString() : undefined,
          titleDe: titleDeIndex !== -1 ? row[titleDeIndex]?.toString() : undefined,
          type: row[typeIndex]?.toString(),
        };
        
        questions.push(question);
      }
      
      console.log(`Parsed ${questions.length} questions:`);
      questions.forEach((q, i) => {
        console.log(`${i+1}. ${q.questionId}: ${q.titleHu || q.title} (${q.type})`);
      });
      
      return questions;
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
}

testParsing();