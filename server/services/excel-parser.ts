import * as XLSX from 'xlsx';
import { QuestionType, type InsertQuestionConfig } from '../../shared/schema.js';

export interface ParsedQuestion {
  questionId: string;
  title: string;
  titleHu?: string;
  titleDe?: string;
  type: QuestionType;
  required: boolean;
  placeholder?: string;
  cellReference?: string;
  sheetName?: string;
  multiCell?: boolean; // New field to control multi-cell behavior for yes_no_na
  groupName?: string; // Group/block name for organizing questions (Hungarian)
  groupNameDe?: string; // German group/block name
  groupOrder?: number; // Order within the group
  unit?: string; // Unit for measurement questions
  minValue?: number; // Minimum value for validation
  maxValue?: number; // Maximum value for validation
  calculationFormula?: string; // Formula for calculated questions
  calculationInputs?: string; // Comma-separated input question IDs
}

class ExcelParserService {
  async parseQuestionsFromExcel(filePath: string): Promise<ParsedQuestion[]> {
    try {
      console.log(`🔍 Parsing questions from: ${filePath}`);
      
      // Read Excel file with dynamic import
      const XLSX = await import('xlsx');
      const workbook = XLSX.default.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to array of arrays  
      const data = XLSX.default.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const questions: ParsedQuestion[] = [];
      
      // Expected columns: ID, Title_EN, Title_HU, Title_DE, Type, Required, Placeholder, CellReference, MultiCell, Group, Order
      const headerRow = data[0];
      if (!headerRow || headerRow.length < 4) {
        throw new Error('Invalid Excel format. Expected columns: ID, Title_EN, Title_HU, Title_DE, Type, Required, Placeholder, CellReference, MultiCell, Group, Order');
      }
      
      // Find column indices
      const getColumnIndex = (possibleNames: string[]) => {
        return possibleNames.reduce((index, name) => {
          if (index === -1) {
            return headerRow.findIndex((col: string) => 
              col?.toString().toLowerCase().trim().includes(name.toLowerCase())
            );
          }
          return index;
        }, -1);
      };
      
      const idIndex = getColumnIndex(['id', 'question_id', 'questionid']);
      const titleIndex = getColumnIndex(['title', 'title_en', 'question']);
      const titleHuIndex = getColumnIndex(['title_hu', 'hungarian', 'magyar']);
      const titleDeIndex = getColumnIndex(['title_de', 'german', 'deutsch']);
      const typeIndex = getColumnIndex(['type', 'input_type', 'field_type']);
      
      console.log(`🔍 Excel Column Detection:
        ID Index: ${idIndex} (${headerRow[idIndex]})
        Title Index: ${titleIndex} (${headerRow[titleIndex]})
        Type Index: ${typeIndex} (${headerRow[typeIndex]})
        Header Row: ${JSON.stringify(headerRow)}`);
      const requiredIndex = getColumnIndex(['required', 'mandatory', 'kötelező']);
      const placeholderIndex = getColumnIndex(['placeholder', 'hint', 'example']);
      // Cell reference column - search for multiple possible names
      const cellRefIndex = getColumnIndex(['cell_reference', 'cellreference', 'cél', 'cell', 'reference']);
      // MultiCell column 
      const multiCellIndex = getColumnIndex(['multicell', 'multi_cell', 'multi']);
      // Group and Order columns
      const groupIndex = getColumnIndex(['group', 'csoport', 'blokk', 'kategória']);
      const groupDeIndex = getColumnIndex(['group_de', 'gruppe_de', 'german_group', 'deutsch_gruppe']);
      const orderIndex = getColumnIndex(['order', 'sorrend', 'rang']);
      
      // Measurement and calculation columns
      const unitIndex = getColumnIndex(['unit', 'egység', 'einheit', 'mértékegység']);
      const minValueIndex = getColumnIndex(['min_value', 'minvalue', 'minimum', 'min']);
      const maxValueIndex = getColumnIndex(['max_value', 'maxvalue', 'maximum', 'max']);
      const calculationFormulaIndex = getColumnIndex(['calculation_formula', 'formula', 'képlet', 'formel']);
      const calculationInputsIndex = getColumnIndex(['calculation_inputs', 'inputs', 'bemenet', 'eingabe', 'bemenetek', 'eingaben']);
      
      if (idIndex === -1 || titleIndex === -1 || typeIndex === -1) {
        throw new Error('Required columns not found: ID, Title, Type');
      }
      
      // Parse data rows (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[idIndex] || !row[titleIndex]) continue;
        
        const type = this.parseQuestionType(row[typeIndex]?.toString());
        if (!type) continue;
        
        const question: ParsedQuestion = {
          questionId: row[idIndex].toString(),
          title: row[titleIndex].toString(),
          titleHu: titleHuIndex !== -1 ? row[titleHuIndex]?.toString() : undefined,
          titleDe: titleDeIndex !== -1 ? row[titleDeIndex]?.toString() : undefined,
          type,
          required: requiredIndex !== -1 ? this.parseBoolean(row[requiredIndex]) : true,
          placeholder: placeholderIndex !== -1 ? row[placeholderIndex]?.toString() : undefined,
          cellReference: cellRefIndex !== -1 ? row[cellRefIndex]?.toString() : undefined,
          sheetName: sheetName,
          multiCell: multiCellIndex !== -1 ? this.parseBoolean(row[multiCellIndex]) : false,
          groupName: groupIndex !== -1 ? row[groupIndex]?.toString() : undefined,
          groupNameDe: groupDeIndex !== -1 ? row[groupDeIndex]?.toString() : undefined,
          groupOrder: orderIndex !== -1 ? parseInt(row[orderIndex]?.toString()) || 0 : 0,
          unit: unitIndex !== -1 ? row[unitIndex]?.toString() : undefined,
          minValue: minValueIndex !== -1 ? parseFloat(row[minValueIndex]?.toString()) : undefined,
          maxValue: maxValueIndex !== -1 ? parseFloat(row[maxValueIndex]?.toString()) : undefined,
          calculationFormula: calculationFormulaIndex !== -1 ? row[calculationFormulaIndex]?.toString() : undefined,
          calculationInputs: calculationInputsIndex !== -1 ? row[calculationInputsIndex]?.toString() : undefined,
        };
        
        questions.push(question);
      }
      
      return questions;
    } catch (error) {
      console.error('🚨 Error parsing Excel file:', error);
      console.error('🚨 File path:', filePath);
      const fs = await import('fs');
      console.error('🚨 File exists:', fs.existsSync(filePath));
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.error('🚨 File size:', stats.size, 'bytes');
      }
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async extractTemplateInfo(buffer: Buffer): Promise<{ sheets: string[], cellReferences: string[] }> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets = workbook.SheetNames;
      const cellReferences: string[] = [];
      
      // Extract cell references from all sheets
      sheets.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
        
        for (let row = range.s.r; row <= Math.min(range.e.r, 50); row++) {
          for (let col = range.s.c; col <= Math.min(range.e.c, 25); col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
              cellReferences.push(`${sheetName}!${cellAddress}`);
            }
          }
        }
      });
      
      return { sheets, cellReferences: cellReferences.slice(0, 100) }; // Limit to first 100
    } catch (error) {
      console.error('Error extracting template info:', error);
      throw new Error('Failed to extract template information');
    }
  }
  
  async populateTemplate(templateBuffer: Buffer, answers: Record<string, any>, questionConfigs: any[]): Promise<Buffer> {
    try {
      const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
      
      // Map answers to cell references
      questionConfigs.forEach(config => {
        if (config.cellReference && answers[config.questionId] !== undefined) {
          const [sheetName, cellRef] = config.cellReference.includes('!') 
            ? config.cellReference.split('!')
            : [config.sheetName || workbook.SheetNames[0], config.cellReference];
          
          if (workbook.Sheets[sheetName]) {
            const worksheet = workbook.Sheets[sheetName];
            const value = this.formatAnswerForExcel(answers[config.questionId], config.type);
            
            // Set cell value
            worksheet[cellRef] = {
              v: value,
              t: typeof value === 'number' ? 'n' : 's'
            };
          }
        }
      });
      
      // Generate buffer
      const buffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });
      
      return buffer;
    } catch (error) {
      console.error('Error populating template:', error);
      throw new Error('Failed to populate Excel template');
    }
  }
  
  private parseQuestionType(typeStr: string): QuestionType | null {
    if (!typeStr) return null;
    
    const type = typeStr.toLowerCase().trim();
    
    if (['yes_no', 'yes_no_na', 'yesno', 'boolean', 'bool'].includes(type)) {
      return 'yes_no_na';
    }
    if (['true_false', 'truefalse', 'true/false', 'binary'].includes(type)) {
      return 'true_false';
    }
    if (['measurement', 'measure', 'mérés', 'messung', 'numeric_with_unit'].includes(type)) {
      return 'measurement';
    }
    if (['calculated', 'calc', 'számított', 'berechnet', 'computed'].includes(type)) {
      return 'calculated';
    }
    if (['number', 'numeric', 'num', 'int', 'integer', 'float'].includes(type)) {
      return 'number';
    }
    if (['text', 'string', 'str', 'textarea', 'memo'].includes(type)) {
      return 'text';
    }
    
    return null;
  }
  
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const str = value.toLowerCase().trim();
      return ['true', 'yes', 'igen', 'ja', '1', 'x'].includes(str);
    }
    if (typeof value === 'number') return value !== 0;
    return true; // Default to required
  }
  
  private formatAnswerForExcel(answer: any, type: string): any {
    switch (type) {
      case 'yes_no_na':
        if (answer === 'yes') return 'Yes';
        if (answer === 'no') return 'No';
        if (answer === 'na') return 'N/A';
        return answer;
      case 'true_false':
        if (answer === 'true') return 'X';
        if (answer === 'false') return '-';
        return answer;
      case 'measurement':
      case 'calculated':
        return typeof answer === 'number' ? answer : parseFloat(answer) || 0;
      case 'number':
        return typeof answer === 'number' ? answer : parseFloat(answer) || 0;
      case 'text':
      default:
        return answer?.toString() || '';
    }
  }
}

export const excelParserService = new ExcelParserService();