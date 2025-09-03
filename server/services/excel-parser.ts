import * as XLSX from "xlsx";
import * as fs from "fs";
import { QuestionType } from "../../shared/schema.js";
import { CellValueType } from '../../shared/types.js';

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
  multiCell?: boolean;
  groupName?: string;
  groupNameDe?: string;
  groupOrder?: number;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  calculationFormula?: string;
  calculationInputs?: string;
}

export class ExcelParserService {
  async parseQuestionsFromExcel(filePath: string): Promise<ParsedQuestion[]> {
    try {
      console.log(`🔍 Parsing questions from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (!rows.length) {
        throw new Error("Excel file is empty");
      }

      const header = rows[0];
      if (!header || header.length < 3) {
        throw new Error("Invalid Excel format – need at least ID, Title and Type columns");
      }

      // Normalizáló függvény az oszlop nevekhez
      const normalize = (str: string) => 
        str.toLowerCase()
           .normalize('NFD')
           .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics (éáűő -> eauo)
           .replace(/[_\s]/g, '');           // Remove spaces and underscores

      const colIndex = (aliases: string[]) => {
        for (const alias of aliases) {
          const normalizedAlias = normalize(alias);
          const index = header.findIndex((col) => {
            if (typeof col !== "string") return false;
            const normalizedCol = normalize(col);
            return normalizedCol.includes(normalizedAlias) || normalizedAlias.includes(normalizedCol);
          });
          if (index !== -1) return index;
        }
        return -1;
      };

      // Oszlopok keresése - a template oszlop neveinek megfelelően
      const idIdx = colIndex(["id"]);
      const titleIdx = colIndex(["title"]);
      const titleHuIdx = colIndex(["title_hun", "titlehun"]);  // "Title_Hun" oszlop
      const titleDeIdx = colIndex(["title_de", "titlede"]);    // "Title_De" oszlop
      const typeIdx = colIndex(["type"]);
      const requiredIdx = colIndex(["kell", "required"]);      // "Kell" oszlop
      const placeholderIdx = colIndex(["leiras", "description", "placeholder"]);  // "Leírás" oszlop
      const cellRefIdx = colIndex(["cel", "target", "cell_reference", "cell"]);    // "Cél" oszlop
      const multiCellIdx = colIndex(["multicell"]);
      const groupNameIdx = colIndex(["blokknevehu", "blokkneve", "group_name", "group"]);    // "Blokk neve HU" oszlop
      const groupNameDeIdx = colIndex(["blokknevede", "group_name_de"]);  // "Blokk neve DE" oszlop
      const groupOrderIdx = colIndex(["order"]);               // "Order" oszlop
      const unitIdx = colIndex(["unit"]);
      const minIdx = colIndex(["min_value", "min"]);
      const maxIdx = colIndex(["max_value", "max"]);
      const sheetNameIdx = colIndex(["munkalapneve", "sheet"]);  // "Munkalap neve" oszlop
      const calcFormulaIdx = colIndex(["calculation_formula", "formula"]);
      const calcInputsIdx = colIndex(["calculation_inputs", "inputs"]);

      if (idIdx === -1 || titleIdx === -1 || typeIdx === -1) {
        throw new Error(`Missing required columns. Header: ${JSON.stringify(header)}`);
      }

      console.log(`📋 Found columns - ID: ${idIdx}, Title: ${titleIdx}, TitleHu: ${titleHuIdx}, Type: ${typeIdx}, Group: ${groupNameIdx}, CellRef: ${cellRefIdx}`);

      const questions: ParsedQuestion[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[idIdx] || !row[titleIdx]) continue;

        const type = this.parseQuestionType(row[typeIdx]?.toString());
        if (!type) {
          console.log(`⚠️  Unknown question type for row ${r}: ${row[typeIdx]}`);
          continue;
        }

        const q: ParsedQuestion = {
          questionId: row[idIdx].toString(),
          title: row[titleIdx].toString(),
          titleHu: titleHuIdx !== -1 ? row[titleHuIdx]?.toString() : undefined,
          titleDe: titleDeIdx !== -1 ? row[titleDeIdx]?.toString() : undefined,
          type,
          required: requiredIdx !== -1 ? this.parseBoolean(row[requiredIdx]) : false,
          placeholder: placeholderIdx !== -1 ? row[placeholderIdx]?.toString() : undefined,
          cellReference: cellRefIdx !== -1 ? row[cellRefIdx]?.toString() : undefined,
          sheetName: sheetNameIdx !== -1 ? row[sheetNameIdx]?.toString() : firstSheetName,
          multiCell: multiCellIdx !== -1 ? this.parseBoolean(row[multiCellIdx]) : false,
          groupName: groupNameIdx !== -1 ? row[groupNameIdx]?.toString() : undefined,
          groupNameDe: groupNameDeIdx !== -1 ? row[groupNameDeIdx]?.toString() : undefined,
          groupOrder: groupOrderIdx !== -1 ? parseInt(row[groupOrderIdx]?.toString() ?? "0", 10) : 0,
          unit: unitIdx !== -1 ? row[unitIdx]?.toString() : undefined,
          minValue: minIdx !== -1 ? parseFloat(row[minIdx]?.toString()) : undefined,
          maxValue: maxIdx !== -1 ? parseFloat(row[maxIdx]?.toString()) : undefined,
          calculationFormula: calcFormulaIdx !== -1 ? row[calcFormulaIdx]?.toString() : undefined,
          calculationInputs: calcInputsIdx !== -1 ? row[calcInputsIdx]?.toString() : undefined,
        };
        
        console.log(`✅ Parsed question ${q.questionId}: ${q.titleHu || q.title} (${q.type}) - Group: ${q.groupName}`);
        questions.push(q);
      }
      
      console.log(`✅ Successfully parsed ${questions.length} questions.`);
      return questions;
    } catch (err) {
      console.error("Error parsing Excel file:", err);
      throw new Error(err instanceof Error ? err.message : "Unexpected error while parsing Excel");
    }
  }
  
  private parseQuestionType(raw?: string): QuestionType | null {
    if (!raw) return null;
    const t = raw.toLowerCase().trim();
    if (["yes_no", "yes_no_na", "checkbox"].includes(t)) return "checkbox";
    if (["true_false", "radio"].includes(t)) return "radio";
    if (["measurement"].includes(t)) return "measurement";
    if (["calculated"].includes(t)) return "calculated";
    if (["number"].includes(t)) return "number";
    if (["text"].includes(t)) return "text";
    return null;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'string') {
      return ["true", "yes", "igen", "ja", "1", "x"].includes(value.toLowerCase().trim());
    }
    return !!value;
  }

  // Template információk kinyerése
  async extractTemplateInfo(filePath: string): Promise<{
    name: string;
    language: string;
    type: string;
    version?: string;
  }> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Az első munkalap neve alapján próbáljuk meghatározni a típust
      const sheetName = workbook.SheetNames[0];
      
      return {
        name: sheetName || 'Unknown',
        language: 'multilingual', // Alapértelmezett, mivel mindkét nyelv benne van
        type: 'unified',
        version: '1.0'
      };
    } catch (error) {
      console.error('Error extracting template info:', error);
      throw new Error('Failed to extract template information');
    }
  }

  // Template feltöltés Excel formátumba
  async populateTemplate(templatePath: string, data: Record<string, any>): Promise<Buffer> {
    try {
      const fileBuffer = fs.readFileSync(templatePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Adatok feltöltése a megfelelő cellákba
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          // Keressük meg a megfelelő cellát a kulcs alapján
          const cellRef = this.findCellReference(worksheet, key);
          if (cellRef) {
            worksheet[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
          }
        }
      });
      
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error populating template:', error);
      throw new Error('Failed to populate template');
    }
  }

  private findCellReference(worksheet: XLSX.WorkSheet, key: string): string | null {
    // Itt implementálhatnád a logikát, hogy megtaláld a megfelelő cellát
    // Ez függhet a template struktúrájától
    return null;
  }

  // Válasz formázása Excel export számára
  formatAnswerForExcel(answer: any, type: QuestionType, language: string = 'hu'): string {
    if (answer === null || answer === undefined) return '';
    
    switch (type) {
      case 'checkbox':
        if (typeof answer === 'string') {
          switch (answer.toLowerCase()) {
            case 'yes':
              return language === 'hu' ? 'Igen' : 'Ja';
            case 'no':
              return language === 'hu' ? 'Nem' : 'Nein';
            case 'na':
              return language === 'hu' ? 'Nem alkalmazható' : 'Nicht zutreffend';
            default:
              return answer;
          }
        }
        break;
      case 'radio':
        if (typeof answer === 'boolean') {
          return answer ? (language === 'hu' ? 'Igen' : 'Ja') : (language === 'hu' ? 'Nem' : 'Nein');
        }
        break;
      case 'measurement':
      case 'calculated':
      case 'number':
        return answer.toString();
      case 'text':
      default:
        return answer.toString();
    }
    
    return answer.toString();
  }
}

export const excelParserService = new ExcelParserService();