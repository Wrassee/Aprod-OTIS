// Manual parsing of questions for the active template
const XLSX = require('xlsx');
const path = require('path');

// Simulate the parsing logic
function parseQuestionsFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const questions = [];
  const headerRow = data[0];
  
  // Find column indices
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
  const typeIndex = getColumnIndex(['type', 'input_type', 'field_type']);
  
  console.log('Column indices:', { idIndex, titleIndex, titleHuIndex, typeIndex });
  console.log('Header row:', headerRow);
  
  if (idIndex === -1 || titleIndex === -1 || typeIndex === -1) {
    throw new Error('Required columns not found');
  }
  
  // Parse data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[idIndex] || !row[titleIndex]) continue;
    
    const question = {
      questionId: row[idIndex].toString(),
      title: row[titleIndex].toString(),
      titleHu: titleHuIndex !== -1 ? row[titleHuIndex]?.toString() : undefined,
      type: row[typeIndex]?.toString()
    };
    
    questions.push(question);
  }
  
  return questions;
}

// Test with the template file
const filePath = './uploads/1756203706454-kerdes-template-minta.xlsx';
try {
  const questions = parseQuestionsFromExcel(filePath);
  console.log(`Parsed ${questions.length} questions:`);
  questions.forEach((q, i) => {
    console.log(`${i+1}. ${q.questionId}: ${q.titleHu || q.title} (${q.type})`);
  });
  
  // Generate insert SQL
  console.log('\nGenerate SQL inserts:');
  questions.forEach(q => {
    console.log(`INSERT INTO question_configs (id, template_id, question_id, title, type, required, created_at) VALUES ('${crypto.randomUUID()}', 'b674f52e-154b-4d0c-8218-1c893daabaaa', '${q.questionId}', '${q.titleHu || q.title}', '${q.type}', 1, ${Date.now()});`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
}