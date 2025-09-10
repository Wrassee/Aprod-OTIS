import * as XLSX from 'xlsx';
import { FormData } from '../../shared/types.js';
import { storage } from '../storage.js';
import fs from 'fs';

class SafeExcelService {
  async generateExcelFromTemplate(formData: FormData, language: string): Promise<Buffer> {
    try {
      console.log('SAFE EXCEL: Starting safe Excel generation with data filling');
      
      // Get the active protocol template
      let protocolTemplate = await storage.getActiveTemplate('protocol', 'multilingual');
      if (!protocolTemplate) {
        protocolTemplate = await storage.getActiveTemplate('protocol', language);
      }
      
      if (!protocolTemplate) {
        throw new Error('No active protocol template found');
      }

      console.log(`SAFE: Using template: ${protocolTemplate.name}`);
      
      // Read template file
      const templateBuffer = fs.readFileSync(protocolTemplate.filePath);
      
      // Read the Excel file with minimal options to preserve formatting
      const workbook = XLSX.read(templateBuffer, { 
        type: 'buffer',
        cellStyles: true,
        cellNF: true,
        sheetStubs: false
      });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      console.log('SAFE: Original worksheet range:', worksheet['!ref']);
      
      // Get question configs for cell mapping
      let questionConfigs: any[] = [];
      try {
        let questionsTemplate = await storage.getActiveTemplate('questions', 'multilingual');
        if (!questionsTemplate) {
          questionsTemplate = await storage.getActiveTemplate('unified', 'multilingual');
        }
        if (!questionsTemplate) {
          questionsTemplate = await storage.getActiveTemplate('questions', language);
        }
        if (!questionsTemplate) {
          questionsTemplate = await storage.getActiveTemplate('unified', language);
        }
        
        if (questionsTemplate) {
          questionConfigs = await storage.getQuestionConfigsByTemplate(questionsTemplate.id);
          console.log(`SAFE: Loaded ${questionConfigs.length} question configs`);
        }
      } catch (error) {
        console.log('SAFE: Could not load question configs:', error);
      }
      
      // SAFE DATA FILLING - Only simple text/number values
      let filledCells = 0;
      
      for (const config of questionConfigs) {
        const questionId = config.questionId;
        let value = formData.answers[questionId];
        
        if (value !== undefined && value !== null && value !== '') {
          const cellRef = config.cellReference;
          if (cellRef && typeof cellRef === 'string') {
            
            // Handle different question types safely
            if (config.type === 'yes_no_na') {
              // For yes/no/na, place X in appropriate columns
              if (cellRef.includes(',')) {
                const cellRefs = cellRef.split(',');
                for (let i = 0; i < cellRefs.length; i++) {
                  const cell = cellRefs[i].trim();
                  if (cell && worksheet[cell]) {
                    // Clear first
                    worksheet[cell].v = '';
                    if (
                      (i === 0 && value === 'yes') ||
                      (i === 1 && value === 'no') ||
                      (i === 2 && value === 'na')
                    ) {
                      worksheet[cell].v = 'X';
                      worksheet[cell].t = 's'; // string type
                      filledCells++;
                    }
                  }
                }
              }
            } else if (config.type === 'true_false') {
              // For true/false, convert to X/-
              const displayValue = (value === true || value === 'true') ? 'X' : '-';
              if (worksheet[cellRef]) {
                worksheet[cellRef].v = displayValue;
                worksheet[cellRef].t = 's'; // string type
                filledCells++;
                console.log(`SAFE: ${cellRef} = "${displayValue}" (${config.type})`);
              }
            } else if (config.type === 'measurement') {
              // For measurements, just the numeric value
              if (worksheet[cellRef]) {
                const numValue = parseFloat(value.toString());
                if (!isNaN(numValue)) {
                  worksheet[cellRef].v = numValue;
                  worksheet[cellRef].t = 'n'; // numeric type
                  filledCells++;
                  console.log(`SAFE: ${cellRef} = ${numValue} (${config.type})`);
                }
              }
            } else {
              // For text/number types, use value as-is
              if (worksheet[cellRef]) {
                worksheet[cellRef].v = value;
                worksheet[cellRef].t = typeof value === 'number' ? 'n' : 's';
                filledCells++;
                console.log(`SAFE: ${cellRef} = "${value}" (${config.type})`);
              }
            }
          }
        }
      }
      
      console.log(`SAFE: Filled ${filledCells} cells with data`);
      
      // Write with minimal options to preserve format
      const buffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
        cellStyles: true,
        sheetStubs: false
      });
      
      console.log(`SAFE: Generated Excel buffer: ${buffer.length} bytes`);
      return buffer;
      
    } catch (error) {
      console.error('SAFE EXCEL ERROR:', error);
      throw error;
    }
  }
}

export const safeExcelService = new SafeExcelService();
