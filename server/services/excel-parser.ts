import * as XLSX from "xlsx";
import * as fs from "fs/promises";
import { QuestionType } from "../../shared/schema.js";

// Interface-ek és típusok a jobb olvashatóságért
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

export interface TemplateInfo {
  name: string;
  language: string;
  type: string;
  version?: string;
}

// Konstansok a "magic strings" elkerülésére
const COLUMN_ALIASES = {
    ID: ["id"],
    TITLE: ["title"],
    TITLE_HU: ["title_hun", "titlehun"],
    TITLE_DE: ["title_de", "titlede"],
    TYPE: ["type"],
    REQUIRED: ["kell", "required"],
    PLACEHOLDER: ["leiras", "description", "placeholder"],
    CELL_REF: ["cel", "target", "cell_reference", "cell"],
    SHEET_NAME: ["munkalapneve", "sheet"],
    MULTI_CELL: ["multicell"],
    GROUP_NAME: ["blokknevehu", "blokkneve", "group_name", "group"],
    GROUP_NAME_DE: ["blokknevede", "group_name_de"],
    GROUP_ORDER: ["order"],
    UNIT: ["unit"],
    MIN_VALUE: ["min_value", "min"],
    MAX_VALUE: ["max_value", "max"],
    CALC_FORMULA: ["calculation_formula", "formula"],
    CALC_INPUTS: ["calculation_inputs", "inputs"],
};

export class ExcelParserService {
  /**
   * Beolvas egy Excel sablonfájlt és kinyeri belőle a kérdések listáját.
   */
  async parseQuestionsFromExcel(filePath: string): Promise<ParsedQuestion[]> {
    try {
      console.log(`🔍 Parsing questions from: ${filePath}`);

      const fileBuffer = await fs.readFile(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("Excel file contains no sheets.");
      
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      if (rows.length < 2) throw new Error("Excel file must contain a header and at least one data row.");
      
      const header = rows[0];
      // JAVÍTÁS: Kiírjuk a logba a beolvasott fejlécet a könnyebb hibakeresésért.
      console.log(`📋 Header found in Excel: [${header.join(', ')}]`);
      
      const colIndices = this.mapHeaderToIndices(header);

      if (colIndices.ID === -1 || colIndices.TITLE === -1 || colIndices.TYPE === -1) {
        throw new Error(`Missing required columns. Found indices - ID: ${colIndices.ID}, Title: ${colIndices.TITLE}, Type: ${colIndices.TYPE}`);
      }
      
      const questions: ParsedQuestion[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[colIndices.ID] || !row[colIndices.TITLE]) continue;

        const type = this.parseQuestionType(row[colIndices.TYPE]);
        if (!type) {
          console.warn(`⚠️ Skipping row ${r+1} due to unknown question type: "${row[colIndices.TYPE]}"`);
          continue;
        }

        const q: ParsedQuestion = {
          questionId: row[colIndices.ID].toString(),
          title: row[colIndices.TITLE].toString(),
          titleHu: colIndices.TITLE_HU !== -1 ? row[colIndices.TITLE_HU]?.toString() : undefined,
          titleDe: colIndices.TITLE_DE !== -1 ? row[colIndices.TITLE_DE]?.toString() : undefined,
          type,
          required: colIndices.REQUIRED !== -1 ? this.parseBoolean(row[colIndices.REQUIRED]) : false,
          placeholder: colIndices.PLACEHOLDER !== -1 ? row[colIndices.PLACEHOLDER]?.toString() : undefined,
          cellReference: colIndices.CELL_REF !== -1 ? row[colIndices.CELL_REF]?.toString() : undefined,
          sheetName: colIndices.SHEET_NAME !== -1 ? row[colIndices.SHEET_NAME]?.toString() : firstSheetName,
          multiCell: colIndices.MULTI_CELL !== -1 ? this.parseBoolean(row[colIndices.MULTI_CELL]) : false,
          groupName: colIndices.GROUP_NAME !== -1 ? row[colIndices.GROUP_NAME]?.toString() : undefined,
          groupNameDe: colIndices.GROUP_NAME_DE !== -1 ? row[colIndices.GROUP_NAME_DE]?.toString() : undefined,
          groupOrder: colIndices.GROUP_ORDER !== -1 ? parseInt(row[colIndices.GROUP_ORDER]?.toString() ?? "0", 10) : 0,
          unit: colIndices.UNIT !== -1 ? row[colIndices.UNIT]?.toString() : undefined,
          minValue: colIndices.MIN_VALUE !== -1 ? parseFloat(row[colIndices.MIN_VALUE]?.toString()) : undefined,
          maxValue: colIndices.MAX_VALUE !== -1 ? parseFloat(row[colIndices.MAX_VALUE]?.toString()) : undefined,
          calculationFormula: colIndices.CALC_FORMULA !== -1 ? row[colIndices.CALC_FORMULA]?.toString() : undefined,
          calculationInputs: colIndices.CALC_INPUTS !== -1 ? row[colIndices.CALC_INPUTS]?.toString() : undefined,
        };
        questions.push(q);
      }
      
      console.log(`✅ Successfully parsed ${questions.length} questions.`);
      return questions;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while parsing Excel";
      throw new Error(`Failed to parse Excel file: ${message}`);
    }
  }

  /**
   * Kinyeri a sablonfájl metaadatait előre definiált cellákból.
   */
  async extractTemplateInfo(filePath: string): Promise<TemplateInfo> {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("Sheet not found");

        const worksheet = workbook.Sheets[sheetName];
        const getCellValue = (cell: string) => worksheet[cell]?.v?.toString() ?? '';

        return {
            name: getCellValue('B1') || sheetName,
            type: getCellValue('B2') || 'unified',
            version: getCellValue('B3') || '1.0',
            language: 'multilingual'
        };
    } catch (error) {
        console.error('Error extracting template info:', error);
        throw new Error('Failed to extract template information from Excel file.');
    }
  }

  /**
   * Adatokkal tölt fel egy Excel sablont a kérdéskonfigurációban megadott cellahivatkozások alapján.
   */
  async populateTemplate(templatePath: string, answers: Record<string, any>, questions: ParsedQuestion[]): Promise<Buffer> {
    try {
      const templateBuffer = await fs.readFile(templatePath);
      const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
      
      questions.forEach(question => {
        const answer = answers[question.questionId];
        if (question.cellReference && answer !== undefined && answer !== null) {
          
          const [sheetName, cellRef] = question.cellReference.includes('!') 
            ? question.cellReference.split('!')
            : [question.sheetName || workbook.SheetNames[0], question.cellReference];

          if (sheetName && workbook.Sheets[sheetName]) {
            const worksheet = workbook.Sheets[sheetName];
            const value = this.formatAnswerForExcel(answer, question.type);
            
            worksheet[cellRef] = {
              v: value,
              t: typeof value === 'number' ? 'n' : 's'
            };
            console.log(`🖋️ Populated cell ${sheetName}!${cellRef} for Q_ID "${question.questionId}" with value: ${value}`);
          }
        }
      });
      
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error populating template:', error);
      throw new Error('Failed to populate Excel template');
    }
  }

  // --- Segédfüggvények ---

  private normalizeHeader(str: string): string {
    if (typeof str !== 'string') return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s-]/g, '');
  }

  private mapHeaderToIndices(header: string[]): Record<keyof typeof COLUMN_ALIASES, number> {
    const indices: any = {};
    for (const key in COLUMN_ALIASES) {
        const aliases = COLUMN_ALIASES[key as keyof typeof COLUMN_ALIASES];
        const foundIndex = header.findIndex(col => aliases.some(alias => this.normalizeHeader(col) === this.normalizeHeader(alias)));
        indices[key] = foundIndex;
    }
    return indices;
  }
  
  /**
   * JAVÍTVA: Ez a verzió sokkal több lehetséges típusnevet (aliast) felismer az Excelből,
   * és helyesen alakítja át őket a frontend által várt "checkbox" és "radio" típusokra.
   */
  private parseQuestionType(raw?: string): QuestionType | null {
    if (!raw) return null;
    const t = raw.toLowerCase().trim();

    // Checkbox típusú kérdések aliasai
    const checkboxAliases = ['yes_no', 'yes_no_na', 'yesno', 'boolean', 'bool', 'checkbox'];
    if (checkboxAliases.includes(t)) {
      return 'checkbox';
    }

    // Radio button típusú kérdések aliasai
    const radioAliases = ['true_false', 'truefalse', 'true/false', 'binary', 'radio'];
    if (radioAliases.includes(t)) {
      return 'radio';
    }
    
    // Egyéb típusok aliasai a nagyobb rugalmasságért
    if (['measurement', 'measure', 'mérés', 'messung', 'numeric_with_unit'].includes(t)) return 'measurement';
    if (['calculated', 'calc', 'számított', 'berechnet', 'computed'].includes(t)) return 'calculated';
    if (['number', 'numeric', 'num', 'int', 'integer', 'float'].includes(t)) return 'number';
    if (['text', 'string', 'str', 'textarea', 'memo'].includes(t)) return 'text';
    
    // Ha egyetlen típusra sem illik
    return null;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'string') {
      return ["true", "yes", "igen", "ja", "1", "x"].includes(value.toLowerCase().trim());
    }
    return !!value;
  }

  /**
   * A különböző típusú válaszokat Excel-kompatibilis formátumra hozza.
   */
  private formatAnswerForExcel(answer: any, type: QuestionType): any {
    switch (type) {
      case 'checkbox': // yes_no_na
        if (answer === 'yes') return 'Igen';
        if (answer === 'no') return 'Nem';
        if (answer === 'na') return 'N/A';
        return answer;
      case 'radio': // true_false
        if (answer === 'true' || answer === true) return 'X';
        if (answer === 'false' || answer === false) return '-';
        return answer;
      case 'measurement':
      case 'calculated':
      case 'number':
        // Biztosítjuk, hogy számként kerüljön beírásra, ha lehetséges.
        const num = parseFloat(answer);
        return isNaN(num) ? answer : num;
      case 'text':
      default:
        return answer?.toString() || '';
    }
  }
}

// HIÁNYZÓ RÉSZ: Létrehozzuk és exportáljuk a szolgáltatás egy példányát.
export const excelParserService = new ExcelParserService();

