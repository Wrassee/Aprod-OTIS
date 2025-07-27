import { ProtocolError } from '@shared/schema';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';

class PDFService {
  async generatePDF(excelBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('Converting Excel to PDF with full formatting preservation');
      
      // Read the Excel workbook with full formatting support
      const workbook = XLSX.read(excelBuffer, { 
        type: 'buffer',
        cellStyles: true,
        cellNF: true,
        cellHTML: true,
        sheetStubs: true,
        bookSST: true,
        dense: false
      });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      console.log('Excel sheet name:', sheetName);
      console.log('Excel range:', worksheet['!ref']);
      
      // Convert Excel to HTML with full formatting
      const htmlContent = XLSX.utils.sheet_to_html(worksheet, {
        header: this.getHTMLHeader(),
        footer: '</body></html>',
        editable: false,
        cellHTML: true
      });
      
      console.log('Generated HTML for PDF conversion, length:', htmlContent.length);
      
      // Use Puppeteer to convert HTML to PDF maintaining Excel layout
      console.log('Starting Puppeteer browser...');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set content and wait for load
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      console.log('Generating PDF from HTML...');
      
      // Generate PDF with Excel-like formatting
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '5mm',
          right: '5mm', 
          bottom: '5mm',
          left: '5mm'
        },
        scale: 0.75,
        preferCSSPageSize: false
      });
      
      await browser.close();
      
      console.log('Generated PDF buffer size:', pdfBuffer.length, 'bytes');
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('Error converting Excel to PDF:', error);
      return this.generateFallbackPDF(excelBuffer);
    }
  }
  
  private getHTMLHeader(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OTIS Acceptance Protocol</title>
  <style>
    body { 
      font-family: 'Calibri', 'Arial', sans-serif; 
      margin: 0; 
      padding: 5px;
      background: white;
      font-size: 11px;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      table-layout: auto;
      font-size: 10px;
    } 
    td, th { 
      border: 1px solid #000; 
      padding: 2px 4px; 
      text-align: left; 
      vertical-align: middle;
      font-size: 9px;
      word-wrap: break-word;
      height: auto;
      min-height: 12px;
    } 
    th { 
      background-color: #d32f2f; 
      color: white;
      font-weight: bold;
      text-align: center;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .otis-red {
      background-color: #d32f2f !important;
      color: white !important;
      font-weight: bold;
      text-align: center;
    }
    .otis-header {
      background-color: #d32f2f;
      color: white;
      font-weight: bold;
      text-align: center;
      font-size: 12px;
      padding: 8px;
    }
    @media print {
      body { margin: 0; padding: 0; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>`
  }

  private extractKeyInformation(data: any[][]): { basicInfo: Array<{label: string, value: string}>, questions: Array<{question: string, answer: string}> } {
    const basicInfo: Array<{label: string, value: string}> = [];
    const questions: Array<{question: string, answer: string}> = [];
    
    // Common field mappings (approximate positions based on typical Excel templates)
    const fieldMap = [
      { pattern: /átvevő|name.*prüfer|recipient/i, label: 'Recipient Name' },
      { pattern: /szerelő|monteur|engineer/i, label: 'Engineer Name' },
      { pattern: /irányítószám|postleitzahl|postal/i, label: 'Postal Code' },
      { pattern: /város|stadt|city/i, label: 'City' },
      { pattern: /utca|strasse|street/i, label: 'Street' },
      { pattern: /házszám|hausnummer|house/i, label: 'House Number' },
      { pattern: /lift.*azonosító|anlage.*nummer|elevator.*id/i, label: 'Elevator ID' },
      { pattern: /projekt|projektnummer|project/i, label: 'Project ID' },
      { pattern: /kirendeltség|agentur|agency/i, label: 'Agency' }
    ];
    
    // Process data to find key information
    data.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return;
      
      row.forEach((cell, cellIndex) => {
        if (cell && typeof cell === 'string' && cell.trim()) {
          const cellValue = cell.trim();
          
          // Check if this looks like a field label
          fieldMap.forEach(field => {
            if (field.pattern.test(cellValue)) {
              // Look for value in next cell or nearby cells
              const value = this.findNearbyValue(data, rowIndex, cellIndex);
              if (value) {
                basicInfo.push({ label: field.label, value });
              }
            }
          });
          
          // Check for question patterns (Q25, Q26, etc. with X or -)
          if (/^Q\d+$/.test(cellValue)) {
            const answer = this.findNearbyValue(data, rowIndex, cellIndex);
            if (answer && (answer === 'X' || answer === '-' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'no')) {
              questions.push({ 
                question: `Question ${cellValue}`, 
                answer: answer 
              });
            }
          }
        }
      });
    });
    
    return { basicInfo, questions };
  }
  
  private findNearbyValue(data: any[][], rowIndex: number, cellIndex: number): string | null {
    // Look in adjacent cells for values
    const searchPositions = [
      [rowIndex, cellIndex + 1], // Right
      [rowIndex + 1, cellIndex], // Below
      [rowIndex, cellIndex + 2], // Two cells right
      [rowIndex - 1, cellIndex], // Above
    ];
    
    for (const [r, c] of searchPositions) {
      if (r >= 0 && r < data.length && c >= 0 && data[r] && c < data[r].length) {
        const value = data[r][c];
        if (value && typeof value === 'string' && value.trim() && value.trim() !== '') {
          return value.trim();
        }
      }
    }
    
    return null;
  }

  private createPDFContent(keyInfo: { basicInfo: Array<{label: string, value: string}>, questions: Array<{question: string, answer: string}> }): string {
    // Create a simple but valid PDF with basic content
    const currentDate = new Date().toLocaleString();
    
    let textContent = 'OTIS ACCEPTANCE PROTOCOL\\n\\n';
    textContent += 'Elevator Acceptance Documentation\\n\\n';
    
    // Add basic info
    if (keyInfo.basicInfo.length > 0) {
      textContent += 'BASIC INFORMATION:\\n';
      keyInfo.basicInfo.forEach(info => {
        textContent += `${info.label}: ${info.value}\\n`;
      });
      textContent += '\\n';
    }
    
    // Add questions
    if (keyInfo.questions.length > 0) {
      textContent += 'INSPECTION QUESTIONS:\\n';
      keyInfo.questions.forEach((question, index) => {
        if (question.question && question.answer) {
          textContent += `Q${index + 1}: ${question.question} = ${question.answer}\\n`;
        }
      });
    }
    
    textContent += `\\nGenerated: ${currentDate}\\nOTIS Elevator Company`;
    
    // Create a minimal but valid PDF
    const pdfContent = `%PDF-1.3
1 0 obj
<<
/Type /Catalog
/Outlines 2 0 R
/Pages 3 0 R
>>
endobj
2 0 obj
<<
/Type /Outlines
/Count 0
>>
endobj
3 0 obj
<<
/Type /Pages
/Count 1
/Kids [4 0 R]
>>
endobj
4 0 obj
<<
/Type /Page
/Parent 3 0 R
/Resources <<
/Font <<
/F1 9 0 R 
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
5 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
100 700 Td
(${textContent}) Tj
ET
endstream
endobj
9 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Times-Roman
>>
endobj
xref
0 10
0000000000 65535 f 
0000000019 00000 n 
0000000093 00000 n 
0000000147 00000 n 
0000000222 00000 n 
0000000390 00000 n 
0000001522 00000 n 
0000001690 00000 n 
0000002423 00000 n 
0000002456 00000 n 
trailer
<<
/Size 10
/Root 1 0 R
>>
startxref
2714
%%EOF`;

    return pdfContent;
  }

  private async generateFallbackPDF(excelBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('Using Excel-based fallback PDF generation');
      
      // Read Excel and extract meaningful data
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Extract data in a more structured way
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
      const extractedData: Array<{label: string, value: string}> = [];
      
      // Look for filled cells with meaningful content
      for (let row = range.s.r; row <= Math.min(range.e.r, 50); row++) {
        for (let col = range.s.c; col <= Math.min(range.e.c, 10); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v && typeof cell.v === 'string' && cell.v.length > 2) {
            const nextCellAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 });
            const nextCell = worksheet[nextCellAddress];
            
            if (nextCell && nextCell.v) {
              extractedData.push({
                label: String(cell.v).substring(0, 30),
                value: String(nextCell.v).substring(0, 50)
              });
            }
          }
        }
      }
      
      console.log(`Extracted ${extractedData.length} data pairs from Excel`);
      
      return Buffer.from(this.createPDFContent({ 
        basicInfo: extractedData.slice(0, 10), 
        questions: [] 
      }));
      
    } catch (error) {
      console.error('Fallback PDF generation failed:', error);
      
      // Ultra simple fallback
      const simplePDF = this.createSimplePDF();
      return Buffer.from(simplePDF, 'binary');
    }
  }
  
  private createSimplePDF(): string {
    const currentDate = new Date().toLocaleString();
    
    return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 300 >>
stream
BT
/F1 16 Tf
50 750 Td
(OTIS ELEVATOR ACCEPTANCE PROTOCOL) Tj
0 -50 Td
/F1 12 Tf
(Generated: ${currentDate}) Tj
0 -30 Td
(This is a simplified PDF version.) Tj
0 -20 Td
(Please use the Excel file for complete formatting.) Tj
0 -30 Td
(OTIS Elevator Company) Tj
0 -20 Td
(Made to move you) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000074 00000 n 
0000000131 00000 n 
0000000244 00000 n 
0000000595 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
672
%%EOF`;
  }

  async generateErrorListPDF(errors: ProtocolError[], language: string): Promise<Buffer> {
    try {
      console.log(`Generating error list PDF with ${errors.length} errors in ${language}`);
      
      let content = `OTIS ERROR REPORT\n${errors.length} Error${errors.length !== 1 ? 's' : ''} Found\n\n`;
      
      if (errors.length === 0) {
        content += 'No errors reported - System is functioning correctly\n';
      } else {
        errors.forEach((error, index) => {
          content += `Error #${index + 1}\n`;
          content += `Title: ${error.title}\n`;
          content += `Severity: ${error.severity.toUpperCase()}\n`;
          
          if (error.description) {
            content += `Description: ${error.description}\n`;
          }
          
          if (error.images && error.images.length > 0) {
            content += `Images attached: ${error.images.length}\n`;
          }
          
          content += '\n';
        });
      }
      
      const pdfContent = this.createPDFContent({ 
        basicInfo: [], 
        questions: content.split('\n').map(line => ({ question: '', answer: line }))
      });
      
      console.log('Generated error list PDF content length:', pdfContent.length);
      return Buffer.from(pdfContent, 'utf-8');
      
    } catch (error) {
      console.error('Error generating error list PDF:', error);
      throw new Error('Failed to generate error list PDF');
    }
  }
}

export const pdfService = new PDFService();
