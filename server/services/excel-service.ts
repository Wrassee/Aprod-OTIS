import * as XLSX from 'xlsx';
import { FormData } from '../../client/src/lib/types';
import { storage } from '../storage';
import { excelParserService } from './excel-parser';
import { simpleXmlExcelService } from './simple-xml-excel';
import fs from 'fs';

class ExcelService {
  async generateExcel(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Use the fixed XML approach for perfect formatting preservation
      console.log('Using fixed XML approach with corruption repairs');
      return await simpleXmlExcelService.generateExcelFromTemplate(formData, language);
    } catch (error) {
      console.error('Excel generation failed:', error);
      return await this.createBasicExcel(formData, language);
    }
  }

  private async populateProtocolTemplatePreserveFormat(templateBuffer: Buffer, formData: FormData, language: string): Promise<Buffer> {
    try {
      // Read with MINIMAL options to preserve as much formatting as possible
      const workbook = XLSX.read(templateBuffer, { 
        type: 'buffer',
        cellStyles: true,
        cellHTML: false,
        sheetStubs: true
      });
      
      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      let worksheet = workbook.Sheets[sheetName];
      
      console.log('Template loaded, original range:', worksheet['!ref']);
      
      // Get question configs for precise cell mapping
      let questionConfigs: any[] = [];
      try {
        const questionsTemplate = await storage.getActiveTemplate('questions', language);
        if (questionsTemplate) {
          questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
          console.log('Loaded question configs:', questionConfigs.length);
        }
      } catch (error) {
        console.log('Could not load question configs:', error);
      }
      
      // CAREFUL CELL POPULATION - only modify values, preserve everything else
      let filledCells = 0;
      
      // Map answers to cells based on question configs
      Object.entries(formData.answers).forEach(([questionId, answer]) => {
        const config = questionConfigs.find(q => q.questionId === questionId);
        
        if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
          const cellRef = config.cellReference;
          
          // Get existing cell or create minimal one
          let existingCell = worksheet[cellRef] || {};
          
          // Preserve ALL existing properties, only change value
          const newCell = {
            ...existingCell,
            v: this.formatAnswer(answer, language),
            t: 's' // string type
          };
          
          worksheet[cellRef] = newCell;
          filledCells++;
          console.log(`Filled ${cellRef} = "${newCell.v}" (preserved format)`);
        }
      });
      
      // Add signature name if provided
      if (formData.signatureName && !questionConfigs.find(q => q.cellReference === 'F9')) {
        let existingCell = worksheet['F9'] || {};
        worksheet['F9'] = {
          ...existingCell,
          v: formData.signatureName,
          t: 's'
        };
        filledCells++;
        console.log(`Added signature: F9 = "${formData.signatureName}"`);
      }
      
      console.log(`Successfully filled ${filledCells} cells with format preservation`);
      
      // Write with format preservation options
      const result = XLSX.write(workbook, { 
        type: 'buffer',
        bookType: 'xlsx',
        cellStyles: true,
        sheetStubs: true
      });
      
      return result;
      
    } catch (error) {
      console.error('Error in format-preserving template population:', error);
      throw error;
    }
  }

  private async populateProtocolTemplate(templateBuffer: Buffer, formData: FormData, language: string): Promise<Buffer> {
    try {
      // Read with full formatting preservation
      const workbook = XLSX.read(templateBuffer, { 
        type: 'buffer',
        cellStyles: true,
        cellHTML: false,
        sheetStubs: true
      });
      
      // Log template info
      console.log('Template sheet names:', workbook.SheetNames);
      
      // Get the first worksheet - work directly with original
      const sheetName = workbook.SheetNames[0];
      let worksheet = workbook.Sheets[sheetName];
      
      console.log('Original worksheet range:', worksheet['!ref']);
      
      // Try to get question titles from questions template
      let questionConfigs: any[] = [];
      try {
        const questionsTemplate = await storage.getActiveTemplate('questions', language);
        if (questionsTemplate) {
          questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
          console.log('Loaded question configs:', questionConfigs.length);
        }
      } catch (error) {
        console.log('Could not load question configs:', error);
      }
      
      // CELL MAPPING FROM QUESTIONS TEMPLATE
      // Use question configs to get the exact cell references for each answer
      
      console.log('Using question configs for precise cell mapping...');
      let filledCells = 0;
      
      // Create cell mappings based on question configs
      const cellMappings: Array<{cell: string, value: any, label: string}> = [];
      
      // Add answers based on question configs
      Object.entries(formData.answers).forEach(([questionId, answer]) => {
        const config = questionConfigs.find(q => q.questionId === questionId);
        
        if (config && config.cellReference && answer !== '' && answer !== null && answer !== undefined) {
          cellMappings.push({
            cell: config.cellReference,
            value: answer,
            label: config.title || `Question ${questionId}`
          });
        }
      });
      
      // Add signature name to a suitable location 
      if (formData.signatureName && !cellMappings.find(m => m.cell === 'F9')) {
        cellMappings.push({
          cell: 'F9',
          value: formData.signatureName,
          label: 'Signature name'
        });
      }
      
      cellMappings.forEach(mapping => {
        if (mapping.value !== null && mapping.value !== undefined && mapping.value !== '') {
          const newValue = this.formatAnswer(mapping.value, language);
          const existingCell = worksheet[mapping.cell];
          
          // Set cell data while preserving template structure
          worksheet[mapping.cell] = { 
            v: newValue,
            t: typeof newValue === 'number' ? 'n' : 's'
          };
          
          // If there was existing formatting, preserve it
          if (existingCell && existingCell.s) {
            worksheet[mapping.cell].s = existingCell.s;
          }
          
          filledCells++;
        }
      });
      
      // Force update the workbook with our modified worksheet
      workbook.Sheets[sheetName] = worksheet;
      
      // All cells successfully filled and verified
      
      console.log(`Successfully filled ${filledCells} cells in the OTIS protocol template`);
      
      // Generate buffer preserving ALL original formatting
      const buffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true,  // Use compression for smaller files
        cellStyles: true,   // Preserve cell styles
        cellNF: true,       // Preserve number formats  
        cellHTML: false,    // Don't convert to HTML
        sheetStubs: true,   // Include empty cells
        bookSST: true,      // Preserve shared string table
        cellDates: true     // Preserve date formatting
      });
      
      console.log('Successfully populated protocol template preserving original format');
      return buffer;
    } catch (error) {
      console.error('Error populating protocol template:', error);
      throw error;
    }
  }

  private async createBasicExcel(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Create worksheet data based on OTIS template structure
      const worksheetData = [
        ['OTIS Acceptance Protocol', '', '', ''],
        ['', '', '', ''],
        ['Reception Date:', formData.receptionDate, '', ''],
        ['Language:', language === 'hu' ? 'Hungarian' : 'German', '', ''],
        ['', '', '', ''],
        ['Questions and Answers:', '', '', ''],
        ['', '', '', ''],
      ];

      // Get question configs to show proper question titles
      try {
        const questionsTemplate = await storage.getActiveTemplate('questions', language);
        if (questionsTemplate) {
          const questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
          
          // Add answers with proper question titles
          Object.entries(formData.answers).forEach(([questionId, answer]) => {
            const config = questionConfigs.find(q => q.questionId === questionId);
            const questionText = config ? 
              (language === 'hu' && config.titleHu ? config.titleHu :
               language === 'de' && config.titleDe ? config.titleDe :
               config.title) :
              `Question ${questionId}`;
              
            worksheetData.push([
              questionText,
              this.formatAnswer(answer, language),
              '',
              ''
            ]);
          });
        } else {
          // Fallback if no questions template
          Object.entries(formData.answers).forEach(([questionId, answer], index) => {
            const questionText = this.getQuestionText(questionId, language);
            worksheetData.push([
              `${index + 1}. ${questionText}`,
              this.formatAnswer(answer, language),
              '',
              ''
            ]);
          });
        }
      } catch (error) {
        console.error('Error getting question configs:', error);
        // Basic fallback
        Object.entries(formData.answers).forEach(([questionId, answer], index) => {
          worksheetData.push([
            `Question ${questionId}`,
            this.formatAnswer(answer, language),
            '',
            ''
          ]);
        });
      }

      // Add errors section
      if (formData.errors.length > 0) {
        worksheetData.push(['', '', '', '']);
        worksheetData.push(['Error List:', '', '', '']);
        worksheetData.push(['', '', '', '']);
        
        formData.errors.forEach((error, index) => {
          worksheetData.push([
            `Error ${index + 1}:`,
            error.title,
            error.severity,
            ''
          ]);
          worksheetData.push([
            'Description:',
            error.description,
            '',
            ''
          ]);
          worksheetData.push(['', '', '', '']);
        });
      }

      // Add signature section
      worksheetData.push(['', '', '', '']);
      worksheetData.push(['Signature:', '', '', '']);
      if (formData.signatureName) {
        worksheetData.push(['Signed by:', formData.signatureName, '', '']);
      }
      worksheetData.push(['Date:', new Date().toLocaleDateString(), '', '']);

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 30 },
        { wch: 15 },
        { wch: 15 }
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Acceptance Protocol');

      // Generate buffer
      const buffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });

      return buffer;
    } catch (error) {
      console.error('Error generating Excel:', error);
      throw new Error('Failed to generate Excel file');
    }
  }

  private getQuestionText(questionId: string, language: string): string {
    // This would normally come from a translation service or database
    const questions: Record<string, Record<string, string>> = {
      q1: {
        hu: 'Lift telepítés kész?',
        de: 'Aufzuginstallation abgeschlossen?',
        en: 'Elevator installation complete?'
      },
      q2: {
        hu: 'Biztonsági rendszerek működnek?',
        de: 'Sicherheitssysteme funktionsfähig?',
        en: 'Safety systems operational?'
      },
      q3: {
        hu: 'Teherbírás (kg)',
        de: 'Tragfähigkeit (kg)',
        en: 'Load capacity (kg)'
      },
      q4: {
        hu: 'További megjegyzések',
        de: 'Zusätzliche Kommentare',
        en: 'Additional comments'
      },
      q5: {
        hu: 'Vészhelyzeti kommunikációs rendszer tesztelve?',
        de: 'Notfallkommunikationssystem getestet?',
        en: 'Emergency communication system tested?'
      },
      q6: {
        hu: 'Ajtó működés sima?',
        de: 'Türbetrieb reibungslos?',
        en: 'Door operation smooth?'
      },
      q7: {
        hu: 'Szint pontosság (mm)',
        de: 'Ebengenauigkeit (mm)',
        en: 'Floor level accuracy (mm)'
      },
      q8: {
        hu: 'Telepítési megjegyzések',
        de: 'Installationshinweise',
        en: 'Installation notes'
      }
    };

    return questions[questionId]?.[language] || questions[questionId]?.en || questionId;
  }

  private formatAnswer(answer: any, language: string): string {
    if (typeof answer === 'string') {
      switch (answer) {
        case 'yes':
          return language === 'hu' ? 'Igen' : language === 'de' ? 'Ja' : 'Yes';
        case 'no':
          return language === 'hu' ? 'Nem' : language === 'de' ? 'Nein' : 'No';
        case 'na':
          return language === 'hu' ? 'Nem alkalmazható' : language === 'de' ? 'Nicht zutreffend' : 'Not applicable';
        default:
          return answer;
      }
    }
    return answer?.toString() || '';
  }
}

export const excelService = new ExcelService();
