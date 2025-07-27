import { ProtocolError } from '@shared/schema';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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
      
      // Create PDF with jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set up fonts and styles
      doc.setFont('helvetica');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(211, 47, 47); // OTIS red color
      doc.text('OTIS ACCEPTANCE PROTOCOL', 105, 25, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Elevator Acceptance Documentation', 105, 35, { align: 'center' });
      
      // Draw header line
      doc.setDrawColor(211, 47, 47);
      doc.setLineWidth(1);
      doc.line(20, 40, 190, 40);
      
      // Process Excel data and create structured sections
      let yPosition = 50;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      // Extract key information from Excel data
      const keyInfo = this.extractKeyInformation(data);
      
      // Basic Information Section
      if (keyInfo.basicInfo.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Basic Information', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        keyInfo.basicInfo.forEach(info => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${info.label}: ${info.value}`, 25, yPosition);
          yPosition += 7;
        });
        yPosition += 5;
      }
      
      // Questions Section
      if (keyInfo.questions.length > 0) {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Inspection Questions', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        keyInfo.questions.forEach(question => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Question text
          doc.text(`Q: ${question.question}`, 25, yPosition);
          yPosition += 6;
          
          // Answer with color coding
          if (question.answer === 'X' || question.answer.toLowerCase() === 'yes') {
            doc.setTextColor(0, 150, 0); // Green for positive
          } else if (question.answer === '-' || question.answer.toLowerCase() === 'no') {
            doc.setTextColor(150, 0, 0); // Red for negative
          } else {
            doc.setTextColor(100, 100, 100); // Gray for N/A or other
          }
          
          doc.text(`A: ${question.answer}`, 30, yPosition);
          doc.setTextColor(0, 0, 0); // Reset to black
          yPosition += 8;
        });
      }
      
      // Footer on last page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()} | OTIS Elevator Company`, 105, 285, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
      }
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      console.log('Generated PDF buffer size:', pdfBuffer.length);
      return pdfBuffer;
      
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

  private async generateFallbackPDF(excelBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('Using fallback PDF generation');
      
      // Simple PDF with minimal content
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('OTIS Acceptance Protocol', 20, 30);
      doc.setFontSize(12);
      doc.text('PDF generation error - please use Excel file', 20, 50);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 70);
      
      return Buffer.from(doc.output('arraybuffer'));
    } catch (error) {
      console.error('Fallback PDF generation failed:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  async generateErrorListPDF(errors: ProtocolError[], language: string): Promise<Buffer> {
    try {
      console.log(`Generating error list PDF with ${errors.length} errors in ${language}`);
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(211, 47, 47);
      doc.text('OTIS Error Report', 105, 25, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${errors.length} Error${errors.length !== 1 ? 's' : ''} Found`, 105, 35, { align: 'center' });
      
      // Draw header line
      doc.setDrawColor(211, 47, 47);
      doc.line(20, 40, 190, 40);
      
      let yPosition = 50;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      if (errors.length === 0) {
        doc.text('No errors reported - System is functioning correctly', 105, yPosition, { align: 'center' });
      } else {
        errors.forEach((error, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Error number
          doc.setFont('helvetica', 'bold');
          doc.text(`Error #${index + 1}`, 20, yPosition);
          yPosition += 8;
          
          // Title
          doc.setFont('helvetica', 'normal');
          doc.text(`Title: ${error.title}`, 25, yPosition);
          yPosition += 6;
          
          // Severity with color coding
          let severityColor: [number, number, number] = [0, 0, 0];
          if (error.severity === 'critical') {
            severityColor = [200, 0, 0];
          } else if (error.severity === 'medium') {
            severityColor = [255, 165, 0];
          } else {
            severityColor = [100, 100, 100];
          }
          
          doc.setTextColor(...severityColor);
          doc.text(`Severity: ${error.severity.toUpperCase()}`, 25, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 6;
          
          // Description
          if (error.description) {
            const descLines = doc.splitTextToSize(error.description, 160);
            doc.text('Description:', 25, yPosition);
            yPosition += 6;
            descLines.forEach((line: string) => {
              if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(line, 30, yPosition);
              yPosition += 5;
            });
          }
          
          // Images indicator
          if (error.images && error.images.length > 0) {
            doc.text(`Images attached: ${error.images.length}`, 25, yPosition);
            yPosition += 6;
          }
          
          yPosition += 5; // Space between errors
        });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()} | OTIS Elevator Company`, 105, 285, { align: 'center' });
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      console.log('Generated error list PDF buffer size:', pdfBuffer.length);
      return pdfBuffer;
      
    } catch (error) {
      console.error('Error generating error list PDF:', error);
      throw new Error('Failed to generate error list PDF');
    }
  }
}

export const pdfService = new PDFService();
