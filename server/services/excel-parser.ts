import * as XLSX from "xlsx";
import * as fs from "fs/promises"; // REFAKTORÁLVA: Aszinkron fájlkezelés
import { QuestionType } from "../../shared/schema.js";

// REFAKTORÁLVA: Interface-ek és típusok a jobb olvashatóságért
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

// REFAKTORÁLVA: Konstansok a "magic strings" elkerülésére
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
   * @param filePath Az Excel fájl elérési útvonala.
   * @returns A feldolgozott kérdések tömbje.
   */
  async parseQuestionsFromExcel(filePath: string): Promise<ParsedQuestion[]> {
    try {
      console.log(`🔍 Parsing questions from: ${filePath}`);

      // REFAKTORÁLVA: Aszinkron fájl olvasás
      const fileBuffer = await fs.readFile(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("Excel file contains no sheets.");
      
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      if (rows.length < 2) throw new Error("Excel file must contain a header and at least one data row.");
      
      const header = rows[0];
      console.log(`📋 Header row:`, header);

      const colIndices = this.mapHeaderToIndices(header);

      if (colIndices.ID === -1 || colIndices.TITLE === -1 || colIndices.TYPE === -1) {
        throw new Error(`Missing required columns. Found indices - ID: ${colIndices.ID}, Title: ${colIndices.TITLE}, Type: ${colIndices.TYPE}`);
      }
      
      const questions: ParsedQuestion[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[colIndices.ID] || !row[colIndices.TITLE]) {
          console.log(`⚠️ Skipping empty or invalid row ${r + 1}`);
          continue;
        }

        const type = this.parseQuestionType(row[colIndices.TYPE]);
        if (!type) {
          console.log(`⚠️ Unknown question type for row ${r + 1}: "${row[colIndices.TYPE]}" - skipping`);
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
        
        console.log(`✅ Parsed Q${q.questionId}: "${q.titleHu || q.title}" (${q.type})`);
        questions.push(q);
      }
      
      console.log(`✅ Successfully parsed ${questions.length} questions.`);
      return questions;
    } catch (err) {
      console.error("❌ Error parsing Excel file:", err);
      // REFAKTORÁLVA: Specifikusabb hibaüzenet
      const message = err instanceof Error ? err.message : "Unexpected error while parsing Excel";
      throw new Error(`Failed to parse Excel file: ${message}`);
    }
  }

  /**
   * Kinyeri a sablonfájl metaadatait előre definiált cellákból.
   * Például: A1='Verzió', B1='1.1'
   * @param filePath Az Excel fájl elérési útvonala.
   */
  async extractTemplateInfo(filePath: string): Promise<TemplateInfo> {
    // REFAKTORÁLVA: Működő, dinamikus adatkinyerés
    try {
        const fileBuffer = await fs.readFile(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("Sheet not found");

        const worksheet = workbook.Sheets[sheetName];
        
        // Tegyük fel, hogy a metaadatok az első néhány sorban vannak, pl. B1, B2, B3
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
   * Adatokkal tölt fel egy létező Excel sablont, és visszaadja a módosított fájlt Buffer formátumban.
   * @param templatePath A sablonfájl elérési útvonala.
   * @param data Egy objektum, ahol a kulcsok a cella-placeholderek és az értékek a beírandó adatok.
   * @returns A generált Excel fájl Buffer-ként.
   */
  async populateTemplate(templatePath: string, data: Record<string, any>): Promise<Buffer> {
    try {
      const fileBuffer = await fs.readFile(templatePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // REFAKTORÁLVA: Módosításokat az első munkalapon végezzük
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("Template file has no sheets.");

      const worksheet = workbook.Sheets[sheetName];
      
      // Adatok feltöltése a megfelelő cellákba
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          // A {{key}} formátumú placeholdereket keressük a cellákban
          const cellAddress = this.findCellByPlaceholder(worksheet, `{{${key}}}`);
          if (cellAddress) {
            XLSX.utils.sheet_add_aoa(worksheet, [[value]], { origin: cellAddress });
            console.log(`🖋️ Populated cell ${cellAddress} for key "${key}" with value: ${value}`);
          } else {
            console.log(`⚠️ Placeholder "{{${key}}}" not found in template.`);
          }
        }
      });
      
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error populating template:', error);
      throw new Error('Failed to populate template');
    }
  }

  // --- Segédfüggvények ---

  private normalizeHeader(str: string): string {
    if (typeof str !== 'string') return '';
    return str.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/[_\s-]/g, '');
  }

  private mapHeaderToIndices(header: string[]): Record<keyof typeof COLUMN_ALIASES, number> {
    const indices: any = {};
    for (const key in COLUMN_ALIASES) {
        const aliases = COLUMN_ALIASES[key as keyof typeof COLUMN_ALIASES];
        let foundIndex = -1;
        for (const alias of aliases) {
            const normalizedAlias = this.normalizeHeader(alias);
            const index = header.findIndex(col => this.normalizeHeader(col) === normalizedAlias);
            if (index !== -1) {
                foundIndex = index;
                break;
            }
        }
        indices[key] = foundIndex;
    }
    return indices;
  }
  
  private parseQuestionType(raw?: string): QuestionType | null {
    if (!raw) return null;
    const t = raw.toLowerCase().trim();
    
    // REFAKTORÁLVA: Tisztább leképezés Map segítségével
    const typeMap: Record<string, QuestionType> = {
        "yes_no": "checkbox",
        "yes_no_na": "checkbox",
        "checkbox": "checkbox",
        "true_false": "radio",
        "radio": "radio",
        "measurement": "measurement",
        "calculated": "calculated",
        "number": "number",
        "text": "text"
    };

    return typeMap[t] || null;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'string') {
      return ["true", "yes", "igen", "ja", "1", "x"].includes(value.toLowerCase().trim());
    }
    return !!value;
  }

  /**
   * KRITIKUS JAVÍTÁS: Ez a metódus most már működik.
   * Megkeres egy cellát a tartalma alapján (pl. egy placeholder).
   * @param worksheet A munkalap, amiben keresünk.
   * @param placeholder A keresett szöveg.
   * @returns A cella címe (pl. "A1") vagy null, ha nem található.
   */
  private findCellByPlaceholder(worksheet: XLSX.WorkSheet, placeholder: string): string | null {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellAddress];
            if (cell && cell.v && cell.v.toString().trim() === placeholder) {
                return cellAddress;
            }
        }
    }
    return null;
  }
}
