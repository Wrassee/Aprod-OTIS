import * as XLSX from "xlsx";
import * as fs from "fs"; // A csillag (*) fontos az fs modulnál
import { QuestionType } from "../../shared/schema.js";
import { CellValueType } from '../../shared/types.js';

// Ezt a függvényt a fájl nem használja, de itt hagyom, ha később kellene.
function determineCellType(value?: any): CellValueType {
  if (!value) return null;
  const stringValue = value.toString().toLowerCase().trim();
  if (['yes', 'no', 'igen', 'nem'].includes(stringValue)) return "checkbox";
  if (['true', 'false', 'igaz', 'hamis'].includes(stringValue)) return "radio";
  if (!isNaN(parseFloat(stringValue))) return "number";
  if (/^\d+(\.\d+)?\s*(mm|cm|m|kg|g|v|a|w)$/i.test(stringValue)) return "measurement";
  if (stringValue.startsWith('=')) return "calculated";
  return "text";
}

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

      // === EZ A JAVÍTÁS ===
      // A fájl tartalmát beolvassuk egy "buffer"-be,
      // majd a memóriában lévő adatot dolgozzuk fel.
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      // =======================

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
          const i = header.findIndex((c) => typeof c === "string" && c.toLowerCase().includes(a));
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
      const cellRefIdx = colIndex(["cell_reference"]);
      const multiCellIdx = colIndex(["multicell"]);
      const groupNameIdx = colIndex(["group_name"]);
      const groupNameDeIdx = colIndex(["group_name_de"]);
      const groupOrderIdx = colIndex(["order"]);
      const unitIdx = colIndex(["unit"]);
      const minIdx = colIndex(["min"]);
      const maxIdx = colIndex(["max"]);
      const sheetNameIdx = colIndex(["sheet"]);
      const calcFormulaIdx = colIndex(["calculation_formula"]);
      const calcInputsIdx = colIndex(["calculation_inputs"]);

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

  async extractTemplateInfo(buffer: Buffer): Promise<{ sheets: string[]; cellReferences: string[] }> {
    try {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheets = wb.SheetNames;
      const refs: string[] = [];
      sheets.forEach((name) => {
        const ws = wb.Sheets[name];
        const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1:Z100");
        for (let r = range.s.r; r <= Math.min(range.e.r, 50); r++) {
          for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (ws[addr]?.v) {
              refs.push(`${name}!${addr}`);
            }
          }
        }
      });
      return { sheets, cellReferences: refs.slice(0, 100) };
    } catch (err) {
      console.error("Error extracting template info:", err);
      throw new Error("Failed to read template information");
    }
  }

  async populateTemplate(templateBuffer: Buffer, answers: Record<string, any>, configs: ParsedQuestion[]): Promise<Buffer> {
    try {
      const wb = XLSX.read(templateBuffer, { type: "buffer" });
      configs.forEach((cfg) => {
        const answer = answers[cfg.questionId];
        if (cfg.cellReference && answer !== undefined) {
          const [sheetName, cellRef] = cfg.cellReference.includes("!")
            ? cfg.cellReference.split("!")
            : [cfg.sheetName || wb.SheetNames[0], cfg.cellReference];
          const ws = wb.Sheets[sheetName];
          if (!ws) return;
          const value = this.formatAnswerForExcel(answer, cfg.type);
          XLSX.utils.sheet_add_aoa(ws, [[value]], { origin: XLSX.utils.decode_cell(cellRef) });
        }
      });
      return XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
    } catch (err) {
      console.error("Error populating template:", err);
      throw new Error("Failed to fill Excel template");
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

  private formatAnswerForExcel(answer: any, type: QuestionType): any {
    switch (type) {
      case "checkbox":
        return answer === "yes" || answer === true ? "Yes" : "No";
      case "radio":
        return answer === "true" || answer === true ? "X" : "-";
      case "number":
      case "measurement":
      case "calculated":
        const num = parseFloat(answer);
        return isNaN(num) ? "" : num;
      default:
        return answer?.toString() ?? "";
    }
  }
}

export const excelParserService = new ExcelParserService();