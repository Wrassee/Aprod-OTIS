import { Question } from "../../shared/schema.js";

/* -----------------------------------------------------------------
    Result object returned for each calculated question
----------------------------------------------------------------- */
export interface MeasurementCalculationResult {
  /** Question UUID */
  questionId: string;
  /** Calculated numeric value (null when not possible) */
  value: number | null;
  /** Formula could be evaluated without runtime errors */
  isValid: boolean;
  /** Value respects the min/max limits defined on the question */
  isWithinLimits: boolean;
  /** Human‑readable description when something went wrong */
  error?: string;
}

/* -----------------------------------------------------------------
    Core calculator – pure, testable, no side‑effects
----------------------------------------------------------------- */
export class MeasurementCalculator {
  /**
   * Run the calculation for **all** questions of type `calculated`.
   *
   * @param questions          All questions from the template (including measurement & calculated)
   * @param measurementValues Map of measurement‑question‑id → numeric value
   *
   * @returns Map of calculated‑question‑id → calculation result
   */
  static calculateAll(
    questions: Question[],
    measurementValues: Record<string, number>,
  ): Record<string, MeasurementCalculationResult> {
    const results: Record<string, MeasurementCalculationResult> = {};

    const calculated = questions.filter(
      (q) => q.type === "calculated",
    );

    for (const q of calculated) {
      results[q.id] = this.calculateSingle(q, measurementValues);
    }

    return results;
  }

  /**
   * Calculate a **single** calculated question.
   *
   * The function is deliberately defensive:
   * – missing formula / inputs → error
   * – missing measurement values → error
   * – illegal characters in the formula → error
   * – NaN / out‑of‑range → error
   *
   * @returns CalculationResult for the supplied question
   */
  static calculateSingle(
    question: Question,
    measurementValues: Record<string, number>,
  ): MeasurementCalculationResult {
    // ---------------------------------------------------------------
    // 1️⃣  Guard‑clauses: we need a formula and a list of input IDs
    // ---------------------------------------------------------------
    if (!question.calculation_formula || !question.calculation_inputs) {
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: "No calculation formula defined",
      };
    }

    // ---------------------------------------------------------------
    // 2️⃣  Prepare the expression – replace each input id with its value
    // ---------------------------------------------------------------
    const inputIds = typeof question.calculation_inputs === 'string' 
      ? question.calculation_inputs.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    let formula = question.calculation_formula;
    let allInputsAvailable = true;

    for (const id of inputIds) {
      const raw = measurementValues[id];
      const val = typeof raw === "number" ? raw : Number(raw);

      if (Number.isNaN(val)) {
        allInputsAvailable = false;
        continue;
      }

      // Escape the id for use inside a RegExp (e.g. if an id contains $)
      const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      formula = formula.replace(
        new RegExp(`\\b${escapedId}\\b`, "g"),
        val.toString(),
      );
    }

    if (!allInputsAvailable) {
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: "Missing input values",
      };
    }

    // ---------------------------------------------------------------
    // 3️⃣  Evaluate the numeric expression safely
    // ---------------------------------------------------------------
    let rawResult: number;

    try {
      rawResult = this.evaluateFormula(formula);
    } catch (e) {
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: (e as Error).message,
      };
    }

    if (Number.isNaN(rawResult)) {
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: "Invalid calculation result",
      };
    }

    // ---------------------------------------------------------------
    // 4️⃣  Round to two decimals (common UI expectation)
    // ---------------------------------------------------------------
    const rounded = Math.round(rawResult * 100) / 100;

    // ---------------------------------------------------------------
    // 5️⃣  Validate against min / max limits (if defined)
    // ---------------------------------------------------------------
    const withinLimits = this.checkLimits(
      rounded,
      question.min_value ?? undefined,
      question.max_value ?? undefined,
    );

    return {
      questionId: question.id,
      value: rounded,
      isValid: true,
      isWithinLimits: withinLimits,
      error: withinLimits
        ? undefined
        : this.getLimitError(
            rounded,
            question.min_value ?? undefined,
            question.max_value ?? undefined,
            question.unit ?? undefined,
          ),
    };
  }

  // -----------------------------------------------------------------
  //  Helper: safe evaluation of a math expression
  // -----------------------------------------------------------------
  private static evaluateFormula(formula: string): number {
    // Allow only numbers, decimal point, basic operators and parentheses
    if (!/^[0-9+\-*/().\s]+$/.test(formula)) {
      throw new Error("Invalid characters in formula");
    }

    // Function constructor is safer than eval because it runs in strict mode
    // and has no access to surrounding scope.
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${formula});`)();
  }

  // -----------------------------------------------------------------
  //  Helper: limit checking
  // -----------------------------------------------------------------
  private static checkLimits(
    value: number,
    minValue?: number,
    maxValue?: number,
  ): boolean {
    if (minValue !== undefined && value < minValue) return false;
    if (maxValue !== undefined && value > maxValue) return false;
    return true;
  }

  // -----------------------------------------------------------------
  //  Helper: user‑friendly limit violation message
  // -----------------------------------------------------------------
  private static getLimitError(
    value: number,
    minValue?: number,
    maxValue?: number,
    unit?: string,
  ): string {
    const u = unit ?? "";

    if (minValue !== undefined && value < minValue) {
      return `Value ${value}${u} is below the minimum limit ${minValue}${u}`;
    }

    if (maxValue !== undefined && value > maxValue) {
      return `Value ${value}${u} exceeds the maximum limit ${maxValue}${u}`;
    }

    return "Value is out of limits";
  }

  // -----------------------------------------------------------------
  //  Generate protocol‑error objects for out‑of‑range results
  // -----------------------------------------------------------------
  static generateProtocolErrors(
    calculations: Record<string, MeasurementCalculationResult>,
    questions: Question[],
    language: "hu" | "de" = "hu",
  ) {
    const errors: any[] = [];

    for (const calc of Object.values(calculations)) {
      if (calc.isValid && !calc.isWithinLimits) {
        const q = questions.find((qq) => qq.id === calc.questionId);
        if (!q) continue;

        const title =
          language === "de"
            ? q.title_de ?? q.title
            : q.title_hu ?? q.title;

        errors.push({
          id: `measurement-calc-${calc.questionId}-${Date.now()}`,
          title: `${title}: ${
            language === "de"
              ? "Wert außerhalb der Grenzwerte"
              : "Érték határértéken kívül"
          }`,
          description:
            calc.error ??
            (language === "de"
              ? "Der berechnete Wert entspricht nicht den Vorgaben."
              : "A számított érték nem felel meg a specifikációknak."),
          severity: "critical" as const,
          images: [] as string[],
        });
      }
    }

    return errors;
  }
}

/* Export a ready‑to‑use singleton (mirrors other services) */
export const measurementCalculator = new MeasurementCalculator();