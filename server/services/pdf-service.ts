import { ProtocolError } from '@shared/schema';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';

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
      
      // Convert worksheet to HTML for easier PDF generation
      const html = XLSX.utils.sheet_to_html(worksheet, {
        header: '<style>table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style>',
        footer: ''
      });
      
      // Create a proper HTML document with OTIS styling
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>OTIS Acceptance Protocol</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #d32f2f;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #d32f2f;
              font-size: 28px;
              margin: 0;
            }
            .header h2 {
              color: #666;
              font-size: 16px;
              margin: 5px 0 0 0;
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin: 20px 0;
            } 
            td, th { 
              border: 1px solid #ddd; 
              padding: 12px 8px; 
              text-align: left; 
              vertical-align: top;
            } 
            th { 
              background-color: #f8f8f8; 
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>OTIS Acceptance Protocol</h1>
            <h2>Elevator Acceptance Documentation</h2>
          </div>
          ${html}
          <div class="footer">
            Generated on ${new Date().toLocaleString()} | OTIS Elevator Company
          </div>
        </body>
        </html>
      `;
      
      console.log('Generated HTML length:', fullHtml.length);
      
      // Use puppeteer to convert HTML to PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      await browser.close();
      
      console.log('Generated PDF buffer size:', pdfBuffer.length);
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to simple text-based PDF if puppeteer fails
      return this.generateFallbackPDF(excelBuffer);
    }
  }

  private async generateFallbackPDF(excelBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('Using fallback PDF generation');
      
      // Read Excel data
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays for easier processing
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Create a simple text representation  
      let textContent = 'OTIS ACCEPTANCE PROTOCOL\n';
      textContent += '========================\n\n';
      textContent += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      data.forEach((row, index) => {
        if (row && row.length > 0) {
          textContent += `${row.join(' | ')}\n`;
        }
      });
      
      // Create a minimal PDF with the text content
      const simplePDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${textContent.length + 50} >>
stream
BT
/F1 10 Tf
50 750 Td
12 TL
${textContent.split('\n').map(line => `(${line.replace(/[()\\]/g, '\\$&')}) Tj T*`).join('\n')}
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${300 + textContent.length}
%%EOF`;

      return Buffer.from(simplePDF, 'utf-8');
    } catch (error) {
      console.error('Fallback PDF generation failed:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  async generateErrorListPDF(errors: ProtocolError[], language: string): Promise<Buffer> {
    try {
      // Generate a separate PDF for the error list
      const mockErrorPDFContent = `
        %PDF-1.4
        1 0 obj
        <<
        /Type /Catalog
        /Pages 2 0 R
        >>
        endobj
        
        2 0 obj
        <<
        /Type /Pages
        /Kids [3 0 R]
        /Count 1
        >>
        endobj
        
        3 0 obj
        <<
        /Type /Page
        /Parent 2 0 R
        /MediaBox [0 0 612 792]
        /Contents 4 0 R
        >>
        endobj
        
        4 0 obj
        <<
        /Length 60
        >>
        stream
        BT
        /F1 12 Tf
        100 700 Td
        (OTIS Error List - ${errors.length} errors found) Tj
        ET
        endstream
        endobj
        
        xref
        0 5
        0000000000 65535 f 
        0000000009 00000 n 
        0000000058 00000 n 
        0000000115 00000 n 
        0000000206 00000 n 
        trailer
        <<
        /Size 5
        /Root 1 0 R
        >>
        startxref
        315
        %%EOF
      `;

      return Buffer.from(mockErrorPDFContent, 'utf-8');
    } catch (error) {
      console.error('Error generating error list PDF:', error);
      throw new Error('Failed to generate error list PDF');
    }
  }
}

export const pdfService = new PDFService();
