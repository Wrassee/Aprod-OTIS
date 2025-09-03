import * as XLSX from "xlsx";
import * as fs from "fs";

export type QuestionType =
  | "yes_no_na"
  | "true_false"
  | "measurement"
  | "calculated"
  | "number"
  | "text";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
}

export interface Section {
  name: string;
  questions: Question[];
}

export interface ParsedTemplate {
  sections: Section[];
}

export class ExcelParser {
  parse(file: ArrayBuffer): ParsedTemplate {
    const workbook = XLSX.read(file, { type: "array" });
    return this.extractQuestions(workbook);
  }

  /**
   * ✅ Új metódus: fájl útvonalról vagy ArrayBufferből is tud olvasni
   */
  parseQuestionsFromExcel(file: ArrayBuffer | string): ParsedTemplate {
    let workbook;

    if (typeof file === "string") {
      // Ha fájl útvonalat kap
      const buffer = fs.readFileSync(file);
      workbook = XLSX.read(buffer, { type: "buffer" });
    } else {
      // Ha ArrayBuffer-t kap
      workbook = XLSX.read(file, { type: "array" });
    }

    return this.extractQuestions(workbook);
  }

  private extractQuestions(workbook: XLSX.WorkBook): ParsedTemplate {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const sections: Section[] = [];
    let currentSection: Section | null = null;

    rows.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return;

      const firstCell = String(row[0] || "").trim();

      // SECTION
      if (firstCell.toLowerCase().startsWith("section")) {
        if (currentSection) sections.push(currentSection);
        currentSection = { name: row[1] || `Section ${sections.length + 1}`, questions: [] };
        return;
      }

      // QUESTION
      if (rowIndex > 0 && currentSection) {
        const id = String(row[0] || "").trim();
        const text = String(row[1] || "").trim();
        const rawType = String(row[2] || "").trim();
        const options = row[3] ? String(row[3]).split(";").map((s) => s.trim()) : undefined;

        const type = this.parseQuestionType(rawType);
        if (!type) {
          console.warn(`⚠️ Ismeretlen kérdéstípus a(z) "${id}" kérdésnél: "${rawType}"`);
          return;
        }

        currentSection.questions.push({ id, text, type, options });
      }
    });

    if (currentSection) sections.push(currentSection);

    return { sections };
  }

  private parseQuestionType(raw?: string): QuestionType | null {
    if (!raw) return null;
    const t = raw.toLowerCase().trim();

    if (["yes_no", "yes_no_na", "yesno", "boolean", "bool"].includes(t)) return "yes_no_na";
    if (["true_false", "truefalse", "true/false", "binary"].includes(t)) return "true_false";
    if (["measurement", "measure", "mérés", "messung", "numeric_with_unit"].includes(t)) return "measurement";
    if (["calculated", "calc", "számított", "berechnet", "computed"].includes(t)) return "calculated";
    if (["number", "numeric", "num", "int", "integer", "float"].includes(t)) return "number";
    if (["text", "string", "str", "textarea", "memo"].includes(t)) return "text";

    console.log(`⚠️ Unknown question type: "${t}"`);
    return null;
  }

  /**
   * Nyelvfüggő válasz formázás Excelhez
   */
  formatAnswerForExcel(type: QuestionType, answer: any, language: "hu" | "de" | "en" = "en"): string {
    if (answer === null || answer === undefined) return "";

    switch (type) {
      case "yes_no_na":
        if (typeof answer === "boolean") {
          if (language === "hu") return answer ? "Igen" : "Nem";
          if (language === "de") return answer ? "Ja" : "Nein";
          return answer ? "Yes" : "No";
        }
        if (typeof answer === "string") {
          return this.mapYesNoNa(answer, language);
        }
        return String(answer);

      case "true_false":
        if (typeof answer === "boolean") {
          if (language === "hu") return answer ? "Igaz" : "Hamis";
          if (language === "de") return answer ? "Wahr" : "Falsch";
          return answer ? "True" : "False";
        }
        if (typeof answer === "string") {
          return this.mapTrueFalse(answer, language);
        }
        return String(answer);

      case "measurement":
        return typeof answer === "object" && answer.value !== undefined && answer.unit
          ? `${answer.value} ${answer.unit}`
          : String(answer);

      case "calculated":
      case "number":
        return String(answer);

      case "text":
        return `"${String(answer)}"`;

      default:
        return String(answer);
    }
  }

  private mapYesNoNa(value: string, language: "hu" | "de" | "en"): string {
    const v = value.toLowerCase();
    if (["yes", "igen", "ja", "y"].includes(v)) {
      return language === "hu" ? "Igen" : language === "de" ? "Ja" : "Yes";
    }
    if (["no", "nem", "nein", "n"].includes(v)) {
      return language === "hu" ? "Nem" : language === "de" ? "Nein" : "No";
    }
    if (["na", "n/a", "-", "null"].includes(v)) {
      return "N/A";
    }
    return value;
  }

  private mapTrueFalse(value: string, language: "hu" | "de" | "en"): string {
    const v = value.toLowerCase();
    if (["true", "igaz", "wahr", "t"].includes(v)) {
      return language === "hu" ? "Igaz" : language === "de" ? "Wahr" : "True";
    }
    if (["false", "hamis", "falsch", "f"].includes(v)) {
      return language === "hu" ? "Hamis" : language === "de" ? "Falsch" : "False";
    }
    return value;
  }
}

export const excelParserService = new ExcelParser();
