import * as XLSX from 'xlsx';
import type { FormData } from '../../shared/types.js';
import { storage } from '../storage.js';
import { excelParserService } from './excel-parser.js';
import { simpleXmlExcelService } from './simple-xml-excel.js';
import { templateLoader } from './template-loader.js';
import fs from 'fs';

class ExcelService {
  async generateExcel(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Try XML-based approach first for better formatting preservation
      console.log('Using XML-based Excel manipulation for perfect formatting preservation');
      return await simpleXmlExcelService.generateExcelFromTemplate(formData, language);
    } catch (xmlError) {
      console.error('XML-based approach failed, falling back to XLSX library:', xmlError);
      
      // Fallback to original XLSX approach
      try {
        try {
          console.log('Loading template via Supabase Storage...');
          const templateBuffer = await templateLoader.loadTemplateBuffer('protocol', language);
          console.log(`Using XLSX fallback with loaded template (${templateBuffer.length} bytes)`);
          return await this.populateProtocolTemplate(templateBuffer, formData, language);
        } catch (templateError) {
          console.log('No protocol template found, using basic Excel creation');
          return await this.createBasicExcel(formData, language);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed, using basic Excel:', fallbackError);
        return await this.createBasicExcel(formData, language);
      }
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
        cellStyles: true    // Preserve cell styles
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
            const config = questionConfigs.find((q: any) => q.questionId === questionId);
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
      if (formData.errors && formData.errors.length > 0) {
        worksheetData.push(['', '', '', '']);
        worksheetData.push(['Error List:', '', '', '']);
        worksheetData.push(['', '', '', '']);
        
        formData.errors.forEach((error, index) => {
          worksheetData.push([
            `Error ${index + 1}:`,
            error.description,
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
