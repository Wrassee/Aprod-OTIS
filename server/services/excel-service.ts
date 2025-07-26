import * as XLSX from 'xlsx';
import { FormData } from '../../client/src/lib/types';
import { storage } from '../storage';
import { excelParserService } from './excel-parser';
import fs from 'fs';

class ExcelService {
  async generateExcel(formData: FormData, language: string): Promise<Buffer> {
    try {
      // Try to get the active protocol template
      const protocolTemplate = await storage.getActiveTemplate('protocol', language);
      
      if (protocolTemplate) {
        console.log(`Using protocol template: ${protocolTemplate.name} (${protocolTemplate.fileName})`);
        
        // Use uploaded template directly - copy the template and add data to it
        const templateBuffer = fs.readFileSync(protocolTemplate.filePath);
        return await this.populateProtocolTemplate(templateBuffer, formData, language);
      } else {
        console.log('No protocol template found, using basic Excel creation');
        // Fallback to creating a new Excel if no template is available
        return await this.createBasicExcel(formData, language);
      }
    } catch (error) {
      console.error('Error generating Excel from template, falling back to basic Excel:', error);
      // Fallback to basic Excel creation
      return await this.createBasicExcel(formData, language);
    }
  }

  private async populateProtocolTemplate(templateBuffer: Buffer, formData: FormData, language: string): Promise<Buffer> {
    try {
      const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
      
      // Log template info
      console.log('Template sheet names:', workbook.SheetNames);
      
      // Get the first worksheet and make a copy to preserve original
      const sheetName = workbook.SheetNames[0];
      let worksheet = JSON.parse(JSON.stringify(workbook.Sheets[sheetName]));
      
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
      const cellMappings = [];
      
      // Add answers based on question configs
      Object.entries(formData.answers).forEach(([questionId, answer]) => {
        const config = questionConfigs.find(q => q.questionId === questionId);
        if (config && config.cellReference) {
          cellMappings.push({
            cell: config.cellReference,
            value: answer,
            label: config.title || `Question ${questionId}`
          });
        }
      });
      
      // Add date to a suitable location if not already mapped
      if (!cellMappings.find(m => m.cell === 'F9')) {
        cellMappings.push({
          cell: 'F9', // Try the first available cell
          value: formData.receptionDate,
          label: 'Reception date'
        });
      }
      
      cellMappings.forEach(mapping => {
        if (mapping.value) {
          // Preserve existing cell formatting if it exists
          const existingCell = worksheet[mapping.cell];
          const newValue = this.formatAnswer(mapping.value, language);
          
          if (existingCell) {
            // Keep existing formatting, just update the value
            worksheet[mapping.cell] = {
              ...existingCell,
              v: newValue,
              t: typeof mapping.value === 'number' ? 'n' : 's'
            };
          } else {
            // Create new cell with value
            worksheet[mapping.cell] = { 
              v: newValue, 
              t: typeof mapping.value === 'number' ? 'n' : 's' 
            };
          }
          console.log(`Filled ${mapping.label} at ${mapping.cell}: ${mapping.value}`);
          filledCells++;
        }
      });
      
      console.log(`Successfully filled ${filledCells} specific cells in the OTIS template`);
      
      // MOST IMPORTANTLY: Make sure the worksheet gets the updated range
      // Update the worksheet range to include any new cells we added
      if (Object.keys(cellMappings).length > 0) {
        let newRange = worksheet['!ref'];
        const range = XLSX.utils.decode_range(newRange || 'A1:A1');
        
        // Check if we need to expand the range for new cells
        cellMappings.forEach(mapping => {
          if (mapping.value) {
            const cellRef = XLSX.utils.decode_cell(mapping.cell);
            if (cellRef.r > range.e.r) range.e.r = cellRef.r;
            if (cellRef.c > range.e.c) range.e.c = cellRef.c;
          }
        });
        
        worksheet['!ref'] = XLSX.utils.encode_range(range);
        console.log('Updated worksheet range to:', worksheet['!ref']);
      }
      
      // Generate buffer without changing the original range unless we added fallback data
      const buffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
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
