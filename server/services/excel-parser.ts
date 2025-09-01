import * as XLSX from "xlsx";
import fs from "fs";
import { QuestionType } from "../../shared/schema.js";

/*--------------------------------------------------------------
  Interface – a single parsed question definition
--------------------------------------------------------------*/
export interface ParsedQuestion {
  questionId: string;
  title: string;
  titleHu?: string;
  titleDe?: string;
  /** union‑type defined in shared/schema */
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

/*--------------------------------------------------------------
  Service – Excel parsing / template handling
--------------------------------------------------------------*/
export class ExcelParserService {
  /*------------------- 1️⃣  Parse questions from an Excel file -------------------*/
  async parseQuestionsFromExcel(filePath: string): Promise<ParsedQuestion[]> {
    try {
      console.log(`🔍 Parsing questions from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      /*--- read workbook ------------------------------------------------------*/
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];

      /*--- transform to a 2‑dimensional array (rows × columns) --------------*/
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (!rows.length) {
        throw new Error("Excel file is empty");
      }

      const header = rows[0];
      if (!header || header.length < 3) {
        throw new Error(
          "Invalid Excel format – need at least ID, Title and Type columns",
        );
      }

      /*--- flexible column index lookup --------------------------------------*/
      const colIndex = (aliases: string[]) => {
        for (const a of aliases) {
          const i = header.findIndex(
            (c) => typeof c === "string" && c.toLowerCase().includes(a),
          );
          if (i !== -1) return i;
        }
        return -1;
      };

      const idIdx = colIndex(["id", "question_id", "questionid"]);
      const titleIdx = colIndex(["title", "title_en", "question"]);
      const titleHuIdx = colIndex([
        "title_hun",
        "title_hu",
        "hungarian",
        "magyar",
      ]);
      const titleDeIdx = colIndex([
        "title_de",
        "german",
        "deutsch",
        "title_deu",
      ]);
      const typeIdx = colIndex(["type", "input_type", "field_type"]);
      const requiredIdx = colIndex([
        "required",
        "mandatory",
        "kötelező",
        "kell",
      ]);
      const placeholderIdx = colIndex([
        "placeholder",
        "hint",
        "example",
        "cél",
        "leírás",
      ]);
      const cellRefIdx = colIndex([
        "cell_reference",
        "cellreference",
        "cell",
        "reference",
      ]);
      const multiCellIdx = colIndex(["multicell", "multi_cell", "multi"]);
      const groupNameIdx = colIndex([
        "group",
        "blokk",
        "group_name",
        "blokk neve hu",
      ]);
      const groupNameDeIdx = colIndex([
        "group_de",
        "blokk neve de",
        "group_name_de",
      ]);
      const groupOrderIdx = colIndex(["order", "sort", "sorrend"]);
      const unitIdx = colIndex(["unit", "egység"]);
      const minIdx = colIndex(["min", "min_value", "minimum"]);
      const maxIdx = colIndex(["max", "max_value", "maximum"]);
      const sheetNameIdx = colIndex([
        "sheet",
        "munkalap",
        "munkalap neve",
      ]);
      const calcFormulaIdx = colIndex([
        "calculation_formula",
        "formula",
        "képlet",
        "formel",
      ]);
      const calcInputsIdx = colIndex([
        "calculation_inputs",
        "inputs",
        "bemenet",
        "eingabe",
        "bemenetek",
        "eingaben",
      ]);

      /*--- sanity check ------------------------------------------------------*/
      if (idIdx === -1 || titleIdx === -1 || typeIdx === -1) {
        throw new Error(
          `Missing required columns. Header: ${JSON.stringify(header)}`,
        );
      }

      /*--- iterate over data rows -------------------------------------------*/
      const questions: ParsedQuestion[] = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[idIdx] || !row[titleIdx]) continue;

        const type = this.parseQuestionType(
          row[typeIdx]?.toString(),
        );
        if (!type) continue; // unknown/unsupported type → skip

        const q: ParsedQuestion = {
          questionId: row[idIdx].toString(),
          title: row[titleIdx].toString(),
          titleHu:
            titleHuIdx !== -1
              ? row[titleHuIdx]?.toString()
              : undefined,
          titleDe:
            titleDeIdx !== -1
              ? row[titleDeIdx]?.toString()
              : undefined,
          type,
          required:
            requiredIdx !== -1
              ? this.parseBoolean(row[requiredIdx])
              : false, // default to false (safer than true)
          placeholder:
            placeholderIdx !== -1
              ? row[placeholderIdx]?.toString()
              : undefined,
          cellReference:
            cellRefIdx !== -1
              ? row[cellRefIdx]?.toString()
              : undefined,
          sheetName:
            sheetNameIdx !== -1
              ? row[sheetNameIdx]?.toString()
              : firstSheetName,
          multiCell:
            multiCellIdx !== -1
              ? this.parseBoolean(row[multiCellIdx])
              : false,
          groupName:
            groupNameIdx !== -1
              ? row[groupNameIdx]?.toString()
              : undefined,
          groupNameDe:
            groupNameDeIdx !== -1
              ? row[groupNameDeIdx]?.toString()
              : undefined,
          groupOrder:
            groupOrderIdx !== -1
              ? parseInt(row[groupOrderIdx]?.toString() ?? "0", 10)
              : 0,
          unit:
            unitIdx !== -1 ? row[unitIdx]?.toString() : undefined,
          minValue:
            minIdx !== -1
              ? parseFloat(row[minIdx]?.toString())
              : undefined,
          maxValue:
            maxIdx !== -1
              ? parseFloat(row[maxIdx]?.toString())
              : undefined,
          calculationFormula:
            calcFormulaIdx !== -1
              ? row[calcFormulaIdx]?.toString()
              : undefined,
          calculationInputs:
            calcInputsIdx !== -1
              ? row[calcInputsIdx]?.toString()
              : undefined,
        };

        questions.push(q);
      }

      return questions;
    } catch (err) {
      console.error("Error parsing Excel file:", err);
      throw new Error(
        err instanceof Error
          ? err.message
          : "Unexpected error while parsing Excel",
      );
    }
  }

  /*------------------- 2️⃣  Extract basic template info -------------------*/
  async extractTemplateInfo(
    buffer: Buffer,
  ): Promise<{ sheets: string[]; cellReferences: string[] }> {
    try {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheets = wb.SheetNames;
      const refs: string[] = [];

      sheets.forEach((name) => {
        const ws = wb.Sheets[name];
        const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1:Z100");
        const maxRow = Math.min(range.e.r, 50);
        const maxCol = Math.min(range.e.c, 25);

        for (let r = range.s.r; r <= maxRow; r++) {
          for (let c = range.s.c; c <= maxCol; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[addr];
            if (cell?.v) {
              refs.push(`${name}!${addr}`);
            }
          }
        }
      });

      return {
        sheets,
        cellReferences: refs.slice(0, 100), // cap for safety
      };
    } catch (err) {
      console.error("Error extracting template info:", err);
      throw new Error("Failed to read template information");
    }
  }

  /*------------------- 3️⃣  Populate a template with answers ---------------*/
  async populateTemplate(
    templateBuffer: Buffer,
    answers: Record<string, any>,
    configs: ParsedQuestion[],
  ): Promise<Buffer> {
    try {
      const wb = XLSX.read(templateBuffer, { type: "buffer" });

      configs.forEach((cfg) => {
        const answer = answers[cfg.questionId];
        if (cfg.cellReference && answer !== undefined) {
          const [sheetName, cellRef] = cfg.cellReference.includes("!")
            ? cfg.cellReference.split("!")
            : [
                cfg.sheetName || wb.SheetNames[0],
                cfg.cellReference,
              ];
          const ws = wb.Sheets[sheetName];
          if (!ws) return;

          const value = this.formatAnswerForExcel(answer, cfg.type);
          const { r, c } = XLSX.utils.decode_cell(cellRef);
          XLSX.utils.sheet_add_aoa(ws, [[value]], {
            origin: { r, c },
          });
        }
      });

      return XLSX.write(wb, {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
      });
    } catch (err) {
      console.error("Error populating template:", err);
      throw new Error("Failed to fill Excel template");
    }
  }

  /*------------------- Helper: map raw type string → QuestionType --------*/
  private parseQuestionType(
    raw?: string,
  ): QuestionType | null {
    if (!raw) return null;
    const t = raw.toLowerCase().trim();

    // Adjusted to match the literals defined in shared/schema
    if (["yes_no", "yesno", "bool", "boolean"].includes(t))
      return "yes_no";
    if (["true_false", "truefalse", "binary", "tf"].includes(t))
      return "true_false";
    if (
      [
        "measurement",
        "measure",
        "numeric_with_unit",
        "mérés",
        "messung",
      ].includes(t)
    )
      return "measurement";
    if (
      ["calculated", "calc", "computed", "számított", "berechnet"].includes(
        t,
      )
    )
      return "calculated";
    if (["number", "numeric", "int", "integer", "float", "decimal"].includes(t))
      return "number";
    if (["text", "string", "str", "textarea", "memo"].includes(t))
      return "text";

    return null;
  }

  /*------------------- Helper: boolean parsing ---------------------------*/
  private parseBoolean(value: any): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const lv = value.toLowerCase().trim();
      return ["true", "yes", "igen", "ja", "1", "x"].includes(lv);
    }
    return false;
  }

  /*------------------- Helper: format answer for Excel -------------------*/
  private formatAnswerForExcel(answer: any, type: QuestionType): any {
    switch (type) {
      case "yes_no":
        if (answer === "yes" || answer === true) return "Yes";
        if (answer === "no" || answer === false) return "No";
        return answer?.toString() ?? "";
      case "true_false":
        if (answer === "true") return "X";
        if (answer === "false") return "-";
        return answer?.toString() ?? "";
      case "measurement":
      case "calculated":
      case "number":
        const num = parseFloat(answer);
        return isNaN(num) ? "" : num;
      case "text":
      default:
        return answer?.toString?.() ?? "";
    }
  }
}

/*--------------------------------------------------------------
  Export a singleton – same usage as before (e.g. in routes)
--------------------------------------------------------------*/
export const excelParserService = new ExcelParserService();