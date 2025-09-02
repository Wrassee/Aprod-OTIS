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

      const colIndex = (aliases: string[]) => {
        for (const a of aliases) {
          const i = header.findIndex((c) => typeof c === "string" && c.toLowerCase().trim().includes(a));
          if (i !== -1) return i;
        }
        return -1;
      };

      const idIdx = colIndex(["id"]);
      const titleIdx = colIndex(["title"]);
      const titleHuIdx = colIndex(["title_hu"]);
      const titleDeIdx = colIndex(["title_de"]);
      const typeIdx = colIndex(["type"]);
      const requiredIdx = colIndex(["required"]);
      const placeholderIdx = colIndex(["placeholder"]);
      const cellRefIdx = colIndex(["cell_reference", "cell"]);
      const multiCellIdx = colIndex(["multicell"]);
      const groupNameIdx = colIndex(["group_name", "group"]);
      const groupNameDeIdx = colIndex(["group_name_de"]);
      const groupOrderIdx = colIndex(["order"]);
      const unitIdx = colIndex(["unit"]);
      const minIdx = colIndex(["min"]);
      const maxIdx = colIndex(["max"]);
      const sheetNameIdx = colIndex(["sheet"]);
      const calcFormulaIdx = colIndex(["calculation_formula", "formula"]);
      const calcInputsIdx = colIndex(["calculation_inputs", "inputs"]);

      if (idIdx === -1 || titleIdx === -1 || typeIdx === -1) {
        throw new Error(`Missing required columns. Header: ${JSON.stringify(header)}`);
      }

      const questions: ParsedQuestion[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[idIdx] || !row[titleIdx]) continue;

        const type = this.parseQuestionType(row[typeIdx]?.toString());
        if (!type) continue;

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
        questions.push(q);
      }
      return questions;
    } catch (err) {
      console.error("Error parsing Excel file:", err);
      throw new Error(err instanceof Error ? err.message : "Unexpected error while parsing Excel");
    }
  }
  
  private parseQuestionType(raw?: string): QuestionType | null {
    if (!raw) return null;
    const t = raw.toLowerCase().trim();
    if (["yes_no", "checkbox"].includes(t)) return "checkbox";
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

  // A fájl többi metódusa (extractTemplateInfo, populateTemplate, formatAnswerForExcel)
  // érintetlen maradhat, mivel azok a `parseQuestionsFromExcel`-től függetlenek
  // és valószínűleg helyesek, ha más kódrészletek használják őket.
}

export const excelParserService = new ExcelParserService();