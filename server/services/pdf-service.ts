import { ProtocolError } from '@shared/schema';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

class PDFService {
  async generatePDF(excelBuffer: Buffer, language: string = 'hu'): Promise<Buffer> {
    console.log('Generating PDF from Excel buffer of size:', excelBuffer.length);
    
    try {
      // Read Excel data
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array for processing
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Generate OTIS branded PDF
      return this.generateEnhancedFallbackPDF(data, language);
    } catch (error) {
      console.error('PDF generation error:', error);
      // Fallback to simple PDF
      return this.generateFallbackPDF(excelBuffer, language);
    }
  }

  private createStructuredTable(data: any[][], language: string): string {
    if (!data || data.length === 0) {
      return '<p>No data available</p>';
    }

    let html = '<div class="protocol-content">';
    
    // Process rows with intelligent grouping
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(cell => !cell)) continue;

      // Check if this is a header row (has fewer filled cells or looks like a title)
      const isHeaderRow = this.isHeaderRow(row, i);
      
      if (isHeaderRow) {
        html += `<div class="section-header">${row[0] || ''}</div>`;
      } else {
        // Regular data row - create a structured display
        html += '<div class="data-row">';
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          if (cell) {
            html += `<div class="data-cell"><span class="cell-content">${cell}</span></div>`;
          }
        }
        html += '</div>';
      }
    }
    
    html += '</div>';
    return html;
  }

  private isHeaderRow(row: any[], index: number): boolean {
    if (!row || row.length === 0) return false;
    
    // First row is usually header
    if (index === 0) return true;
    
    // Row with only first cell filled might be a section header
    const filledCells = row.filter(cell => cell && cell.toString().trim()).length;
    return filledCells === 1 && row[0];
  }

  private createOTISHtmlTemplate(content: string, language: string): string {
    const translations = {
      hu: {
        title: 'OTIS Átvételi Protokoll',
        subtitle: 'Lift Átvételi Dokumentáció',
        generated: 'Létrehozva',
        company: 'OTIS Lift Kft.'
      },
      de: {
        title: 'OTIS Abnahmeprotokoll',
        subtitle: 'Aufzug Abnahme Dokumentation',
        generated: 'Erstellt am',
        company: 'OTIS Aufzüge GmbH'
      }
    };

    const t = translations[language as keyof typeof translations] || translations.hu;

    return `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm 15mm;
          }
          
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.4;
            color: #333;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 4px solid #E31937;
            padding-bottom: 20px;
            margin-bottom: 30px;
            position: relative;
          }
          
          .otis-logo {
            font-size: 32px;
            font-weight: bold;
            color: #E31937;
            letter-spacing: 2px;
            margin-bottom: 5px;
          }
          
          .header h1 {
            color: #E31937;
            font-size: 24px;
            margin: 10px 0 5px 0;
            font-weight: 600;
          }
          
          .header h2 {
            color: #666;
            font-size: 14px;
            margin: 0 0 10px 0;
            font-weight: normal;
          }
          
          .slogan {
            color: #999;
            font-size: 10px;
            font-style: italic;
            margin-top: 10px;
          }
          
          .protocol-content {
            margin: 20px 0;
          }
          
          .section-header {
            background: linear-gradient(135deg, #E31937, #B71C2E);
            color: white;
            padding: 12px 20px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0 10px 0;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(227, 25, 55, 0.3);
          }
          
          .data-row {
            display: flex;
            flex-wrap: wrap;
            margin: 8px 0;
            padding: 10px;
            background: #fafafa;
            border-left: 3px solid #E31937;
            border-radius: 2px;
          }
          
          .data-row:nth-child(even) {
            background: #f5f5f5;
          }
          
          .data-cell {
            margin: 2px 15px 2px 0;
            min-width: 150px;
          }
          
          .cell-content {
            padding: 4px 8px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 3px;
            display: inline-block;
            min-width: 60px;
            text-align: center;
            font-weight: 500;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #E31937;
            color: #666;
            font-size: 11px;
            text-align: center;
            page-break-inside: avoid;
          }
          
          .footer .company-info {
            font-weight: bold;
            color: #E31937;
            margin-bottom: 5px;
          }
          
          /* Print optimizations */
          @media print {
            body { font-size: 12px; }
            .section-header { break-after: avoid; }
            .data-row { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="otis-logo">OTIS</div>
          <h1>${t.title}</h1>
          <h2>${t.subtitle}</h2>
          <div class="slogan">Made to move you</div>
        </div>
        
        ${content}
        
        <div class="footer">
          <div class="company-info">${t.company}</div>
          <div>${t.generated}: ${new Date().toLocaleString(language === 'de' ? 'de-DE' : 'hu-HU')}</div>
        </div>
      </body>
      </html>
    `;
  }

  private async generateEnhancedFallbackPDF(jsonData: any[][], language: string = 'hu'): Promise<Buffer> {
    try {
      console.log('Using enhanced HTML-based PDF generation with OTIS branding');
      
      const isGerman = language === 'de';
      
      // Create professional OTIS-branded PDF content
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: white;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 3px solid #d32f2f;
              margin-bottom: 30px;
            }
            .logo {
              color: #d32f2f;
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .slogan {
              color: #666;
              font-size: 14px;
              font-style: italic;
            }
            .title {
              color: #333;
              font-size: 24px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .protocol-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .data-table td {
              padding: 8px 12px;
              border: 1px solid #ddd;
              vertical-align: top;
            }
            .data-table .label {
              background: #f0f0f0;
              font-weight: bold;
              width: 30%;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #d32f2f;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">OTIS</div>
            <div class="slogan">Made to Move You</div>
          </div>
          
          <div class="title">
            ${isGerman ? 'Aufzug Abnahmeprotokoll' : 'Lift Átvételi Protokoll'}
          </div>
          
          <div class="protocol-info">
            <strong>${isGerman ? 'Erstellungsdatum:' : 'Létrehozás dátuma:'}</strong> ${new Date().toLocaleDateString(isGerman ? 'de-DE' : 'hu-HU')}<br>
            <strong>${isGerman ? 'Version:' : 'Verzió:'}</strong> OTIS APRO 0.1.9
          </div>
          
          <table class="data-table">
      `;
      
      // Process Excel data and create table rows
      if (jsonData && jsonData.length > 0) {
        for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
          const row = jsonData[i];
          if (row && row.length > 0) {
            for (let j = 0; j < Math.min(row.length, 4); j++) {
              const cellValue = row[j] ? String(row[j]).substring(0, 100) : '';
              if (cellValue.trim()) {
                htmlContent += `
                  <tr>
                    <td class="label">${isGerman ? 'Feld' : 'Mező'} ${i+1}-${j+1}</td>
                    <td>${cellValue}</td>
                  </tr>
                `;
              }
            }
          }
        }
      } else {
        htmlContent += `
          <tr>
            <td class="label">${isGerman ? 'Status' : 'Állapot'}</td>
            <td>${isGerman ? 'Protokoll erfolgreich generiert' : 'Protokoll sikeresen létrehozva'}</td>
          </tr>
        `;
      }
      
      htmlContent += `
          </table>
          
          <div class="footer">
            <p><strong>OTIS Elevator Company</strong></p>
            <p>${isGerman ? 'Dieses Dokument wurde automatisch generiert' : 'Ez a dokumentum automatikusan került létrehozásra'}</p>
          </div>
        </body>
        </html>
      `;
      
      // Convert HTML to simple PDF-like text format
      const textContent = this.htmlToText(htmlContent);
      return this.createSimplePDF(textContent, isGerman);
      
    } catch (error) {
      console.error('Enhanced fallback PDF generation failed:', error);
      throw new Error('Failed to generate enhanced PDF');
    }
  }

  private async generateFallbackPDF(excelBuffer: Buffer, language: string = 'hu'): Promise<Buffer> {
    try {
      console.log('Using fallback PDF generation');
      
      // Read Excel data
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays for easier processing
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Use enhanced fallback with OTIS branding
      return this.generateEnhancedFallbackPDF(data, language);
    } catch (error) {
      console.error('Fallback PDF generation failed:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private createSimplePDF(content: string, isGerman: boolean = false): Buffer {
    const title = isGerman ? 'OTIS Aufzug Abnahmeprotokoll' : 'OTIS Lift Átvételi Protokoll';
    
    const pdfContent = `%PDF-1.4
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
<< /Length ${content.length + 200} >>
stream
BT
/F1 16 Tf
50 750 Td
(${title}) Tj
0 -30 Td
/F1 12 Tf
(Generated: ${new Date().toLocaleString()}) Tj
0 -20 Td
(OTIS Made to Move You) Tj
0 -30 Td
/F1 10 Tf
12 TL
${content.split('\n').slice(0, 60).map(line => {
  const cleanLine = line.replace(/[()\\]/g, '\\$&').substring(0, 80);
  return `(${cleanLine}) Tj T*`;
}).join('\n')}
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
${400 + content.length}
%%EOF`;

    return Buffer.from(pdfContent, 'utf-8');
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
