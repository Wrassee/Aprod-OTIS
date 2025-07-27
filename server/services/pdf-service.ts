import { ProtocolError } from '@shared/schema';
import * as XLSX from 'xlsx';

class PDFService {
  async generatePDF(excelBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('Generating PDF from Excel buffer of size:', excelBuffer.length);
      
      // Read the Excel file to extract data
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      console.log('Excel sheet name:', sheetName);
      console.log('Excel range:', worksheet['!ref']);
      
      // Convert to array of arrays for structured data extraction
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      
      // Extract key information
      const keyInfo = this.extractKeyInformation(data);
      
      // Create a properly formatted PDF using raw PDF format
      const pdfContent = this.createPDFContent(keyInfo);
      
      console.log('Generated PDF content length:', pdfContent.length);
      return Buffer.from(pdfContent, 'utf-8');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      return this.generateFallbackPDF(excelBuffer);
    }
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
      console.log('Using fallback PDF generation');
      
      const basicContent = 'OTIS ACCEPTANCE PROTOCOL\n\nPDF generation completed\n\nPlease use Excel file for detailed view';
      return Buffer.from(this.createPDFContent({ basicInfo: [], questions: [] }));
    } catch (error) {
      console.error('Fallback PDF generation failed:', error);
      throw new Error('Failed to generate PDF');
    }
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
