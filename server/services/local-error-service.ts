import { ProtocolError } from '@shared/schema';
import XLSX from 'xlsx';
import { localFileService } from './local-file-service';

export class LocalErrorService {
  /**
   * Generate Excel error list from protocol errors
   */
  async generateErrorExcel(
    errors: ProtocolError[],
    protocolData: {
      buildingAddress?: string;
      liftId?: string;
      inspectorName?: string;
      inspectionDate?: string;
    },
    language: string = 'hu'
  ): Promise<Buffer> {
    const t = this.getTranslations(language);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Header data
    const headerData = [
      [t.title],
      [''],
      [t.building, protocolData.buildingAddress || ''],
      [t.liftId, protocolData.liftId || ''],
      [t.inspector, protocolData.inspectorName || ''],
      [t.date, protocolData.inspectionDate || new Date().toLocaleDateString()],
      [''],
      [t.totalErrors, errors.length.toString()],
      ['']
    ];

    // Error list headers
    const errorHeaders = [
      [t.number, t.severity, t.title, t.description, t.photos]
    ];

    // Error data
    const errorData = errors.map((error, index) => [
      (index + 1).toString(),
      this.getSeverityText(error.severity, language),
      error.title,
      error.description,
      error.images?.length ? `${error.images.length} ${t.photo}` : t.noPhotos
    ]);

    // Summary data
    const criticalCount = errors.filter(e => e.severity === 'critical').length;
    const mediumCount = errors.filter(e => e.severity === 'medium').length;
    const lowCount = errors.filter(e => e.severity === 'low').length;

    const summaryData = [
      [''],
      [t.summary],
      [t.critical, criticalCount.toString()],
      [t.medium, mediumCount.toString()],
      [t.low, lowCount.toString()],
      [''],
      [t.generatedOn, new Date().toLocaleString()]
    ];

    // Combine all data
    const allData = [
      ...headerData,
      ...errorHeaders,
      ...errorData,
      ...summaryData
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(allData);

    // Set column widths
    worksheet['!cols'] = [
      { width: 8 },  // Number
      { width: 12 }, // Severity
      { width: 30 }, // Title
      { width: 50 }, // Description
      { width: 15 }  // Photos
    ];

    // Style the header
    if (worksheet['A1']) {
      worksheet['A1'].s = {
        font: { bold: true, size: 16 },
        alignment: { horizontal: 'center' }
      };
    }

    // Style error headers
    const headerRowIndex = headerData.length;
    for (let col = 0; col < 5; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: '366FB3' } },
          alignment: { horizontal: 'center' }
        };
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, t.errorList);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    console.log(`Generated error Excel with ${errors.length} errors`);
    return buffer;
  }

  /**
   * Generate PDF error list from protocol errors
   */
  async generateErrorPDF(
    errors: ProtocolError[],
    protocolData: {
      buildingAddress?: string;
      liftId?: string;
      inspectorName?: string;
      inspectionDate?: string;
    },
    language: string = 'hu'
  ): Promise<Buffer> {
    // First generate Excel, then convert to PDF
    const excelBuffer = await this.generateErrorExcel(errors, protocolData, language);
    
    // Save Excel temporarily and convert to PDF
    const excelPath = await localFileService.saveErrorList(excelBuffer, 'excel');
    
    try {
      // Use LibreOffice to convert Excel to PDF
      const { spawn } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      
      const tempDir = path.dirname(excelPath);
      const baseName = path.basename(excelPath, '.xlsx');
      const pdfPath = path.join(tempDir, `${baseName}.pdf`);
      
      return new Promise((resolve, reject) => {
        const process = spawn('libreoffice', [
          '--headless',
          '--convert-to', 'pdf',
          '--outdir', tempDir,
          excelPath
        ]);

        let stderr = '';
        process.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0 && fs.existsSync(pdfPath)) {
            const pdfBuffer = fs.readFileSync(pdfPath);
            
            // Cleanup
            try {
              fs.unlinkSync(excelPath);
              fs.unlinkSync(pdfPath);
            } catch (e) {
              console.warn('Cleanup warning:', e.message);
            }
            
            resolve(pdfBuffer);
          } else {
            console.warn('LibreOffice conversion failed, generating HTML-based PDF');
            // Fallback to HTML-based PDF generation
            this.generateHTMLBasedPDF(errors, protocolData, language)
              .then(resolve)
              .catch(reject);
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          process.kill();
          reject(new Error('PDF conversion timeout'));
        }, 30000);
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      // Fallback to HTML-based PDF
      return this.generateHTMLBasedPDF(errors, protocolData, language);
    }
  }

  /**
   * Fallback HTML-based PDF generation
   */
  private async generateHTMLBasedPDF(
    errors: ProtocolError[],
    protocolData: any,
    language: string
  ): Promise<Buffer> {
    const t = this.getTranslations(language);
    
    // Generate HTML content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t.errorList}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { margin-bottom: 20px; }
          .error-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .error-table th, .error-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .error-table th { background-color: #366FB3; color: white; }
          .summary { margin-top: 30px; }
          .severity-critical { color: #dc3545; font-weight: bold; }
          .severity-medium { color: #ffc107; font-weight: bold; }
          .severity-low { color: #007bff; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t.title}</h1>
        </div>
        
        <div class="info">
          <p><strong>${t.building}:</strong> ${protocolData.buildingAddress || ''}</p>
          <p><strong>${t.liftId}:</strong> ${protocolData.liftId || ''}</p>
          <p><strong>${t.inspector}:</strong> ${protocolData.inspectorName || ''}</p>
          <p><strong>${t.date}:</strong> ${protocolData.inspectionDate || new Date().toLocaleDateString()}</p>
          <p><strong>${t.totalErrors}:</strong> ${errors.length}</p>
        </div>

        <table class="error-table">
          <thead>
            <tr>
              <th>${t.number}</th>
              <th>${t.severity}</th>
              <th>${t.title}</th>
              <th>${t.description}</th>
              <th>${t.photos}</th>
            </tr>
          </thead>
          <tbody>
            ${errors.map((error, index) => `
              <tr>
                <td>${index + 1}</td>
                <td class="severity-${error.severity}">${this.getSeverityText(error.severity, language)}</td>
                <td>${error.title}</td>
                <td>${error.description}</td>
                <td>${error.images?.length ? `${error.images.length} ${t.photo}` : t.noPhotos}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h3>${t.summary}</h3>
          <p><span class="severity-critical">${t.critical}:</span> ${errors.filter(e => e.severity === 'critical').length}</p>
          <p><span class="severity-medium">${t.medium}:</span> ${errors.filter(e => e.severity === 'medium').length}</p>
          <p><span class="severity-low">${t.low}:</span> ${errors.filter(e => e.severity === 'low').length}</p>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
          <p>${t.generatedOn}: ${new Date().toLocaleString()}</p>
          <p>OTIS APROD - ${t.protocolApp}</p>
        </div>
      </body>
      </html>
    `;

    // Convert HTML to PDF using puppeteer (if available) or return HTML as fallback
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.setContent(html);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
      });
      
      await browser.close();
      return pdfBuffer;
    } catch (error) {
      console.warn('Puppeteer not available, returning HTML as fallback');
      // Return HTML as buffer - browser can handle this
      return Buffer.from(html, 'utf-8');
    }
  }

  /**
   * Get translations for error list generation
   */
  private getTranslations(language: string) {
    if (language === 'de') {
      return {
        title: 'OTIS Fehlerliste',
        building: 'Gebäude',
        liftId: 'Aufzug ID',
        inspector: 'Prüfer',
        date: 'Datum',
        totalErrors: 'Gesamtfehler',
        number: 'Nr.',
        severity: 'Schwere',
        title: 'Titel',
        description: 'Beschreibung',
        photos: 'Fotos',
        photo: 'Foto',
        noPhotos: 'Keine Fotos',
        summary: 'Zusammenfassung',
        critical: 'Kritisch',
        medium: 'Mittel',
        low: 'Niedrig',
        generatedOn: 'Erstellt am',
        errorList: 'Fehlerliste',
        protocolApp: 'Abnahmeprotokoll Anwendung'
      };
    } else {
      return {
        title: 'OTIS Hibalista',
        building: 'Épület',
        liftId: 'Lift ID',
        inspector: 'Ellenőr',
        date: 'Dátum',
        totalErrors: 'Összes hiba',
        number: 'Sz.',
        severity: 'Súlyosság',
        title: 'Cím',
        description: 'Leírás',
        photos: 'Fotók',
        photo: 'fotó',
        noPhotos: 'Nincs fotó',
        summary: 'Összegzés',
        critical: 'Kritikus',
        medium: 'Közepes',
        low: 'Alacsony',
        generatedOn: 'Generálva',
        errorList: 'Hibalista',
        protocolApp: 'Átvételi Protokoll Alkalmazás'
      };
    }
  }

  /**
   * Get severity text in specified language
   */
  private getSeverityText(severity: string, language: string): string {
    const translations = this.getTranslations(language);
    
    switch (severity) {
      case 'critical': return translations.critical;
      case 'medium': return translations.medium;
      case 'low': return translations.low;
      default: return severity;
    }
  }
}

// Export singleton instance
export const localErrorService = new LocalErrorService();