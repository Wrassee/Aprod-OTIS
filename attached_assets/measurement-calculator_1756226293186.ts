import { Question } from '../shared/schema.js';

export interface MeasurementCalculationResult {
  questionId: string;
  value: number | null;
  isValid: boolean;
  isWithinLimits: boolean;
  error?: string;
}

export class MeasurementCalculator {
  /**
   * Calculate values for all calculated questions based on measurement inputs
   */
  static calculateAll(
    questions: Question[],
    measurementValues: Record<string, number>
  ): Record<string, MeasurementCalculationResult> {
    const results: Record<string, MeasurementCalculationResult> = {};
    
    const calculatedQuestions = questions.filter(q => q.type === 'calculated');
    
    calculatedQuestions.forEach(question => {
      results[question.id] = this.calculateSingle(question, measurementValues);
    });
    
    return results;
  }

  /**
   * Calculate value for a single calculated question
   */
  static calculateSingle(
    question: Question,
    measurementValues: Record<string, number>
  ): MeasurementCalculationResult {
    if (!question.calculationFormula || !question.calculationInputs) {
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: 'No calculation formula defined'
      };
    }

    try {
      const inputIds = question.calculationInputs.split(',').map(id => id.trim());
      let formula = question.calculationFormula;
      let hasAllInputs = true;

      // Replace variable names in formula with actual values
      inputIds.forEach(inputId => {
        const value = measurementValues[inputId];
        if (value === undefined || value === null || isNaN(value)) {
          hasAllInputs = false;
          return;
        }
        // Replace variable name with actual value - ensure we match whole words only
        formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
      });

      if (!hasAllInputs) {
        return {
          questionId: question.id,
          value: null,
          isValid: false,
          isWithinLimits: false,
          error: 'Missing input values'
        };
      }

      // Evaluate the mathematical expression safely
      const result = this.evaluateFormula(formula);
      
      if (isNaN(result)) {
        return {
          questionId: question.id,
          value: null,
          isValid: false,
          isWithinLimits: false,
          error: 'Invalid calculation result'
        };
      }

      const roundedResult = Math.round(result * 100) / 100; // Round to 2 decimal places
      
      // Check if result is within acceptable range
      const isWithinLimits = this.checkLimits(roundedResult, question.minValue, question.maxValue);

      return {
        questionId: question.id,
        value: roundedResult,
        isValid: true,
        isWithinLimits,
        error: isWithinLimits ? undefined : this.getLimitError(roundedResult, question.minValue, question.maxValue, question.unit)
      };

    } catch (error) {
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: 'Calculation error: ' + (error as Error).message
      };
    }
  }

  /**
   * Safely evaluate mathematical formula
   */
  private static evaluateFormula(formula: string): number {
    // Basic security: only allow numbers, operators, parentheses, and decimal points
    if (!/^[0-9+\-*/.() ]+$/.test(formula)) {
      throw new Error('Invalid characters in formula');
    }
    
    // Use Function constructor for safer evaluation than eval
    return Function(`"use strict"; return (${formula})`)();
  }

  /**
   * Check if value is within specified limits
   */
  private static checkLimits(value: number, minValue?: number, maxValue?: number): boolean {
    if (minValue !== undefined && value < minValue) return false;
    if (maxValue !== undefined && value > maxValue) return false;
    return true;
  }

  /**
   * Generate error message for out-of-limits values
   */
  private static getLimitError(value: number, minValue?: number, maxValue?: number, unit?: string): string {
    const unitStr = unit || '';
    
    if (minValue !== undefined && value < minValue) {
      return `Value ${value}${unitStr} is below minimum limit ${minValue}${unitStr}`;
    }
    
    if (maxValue !== undefined && value > maxValue) {
      return `Value ${value}${unitStr} is above maximum limit ${maxValue}${unitStr}`;
    }
    
    return 'Value is out of limits';
  }

  /**
   * Generate protocol errors for out-of-range calculated values
   */
  static generateProtocolErrors(
    calculations: Record<string, MeasurementCalculationResult>,
    questions: Question[],
    language: 'hu' | 'de' = 'hu'
  ) {
    const errors: any[] = [];
    
    Object.values(calculations).forEach(calc => {
      if (calc.isValid && !calc.isWithinLimits) {
        const question = questions.find(q => q.id === calc.questionId);
        if (question) {
          const title = language === 'de' ? (question.titleDe || question.title) : (question.titleHu || question.title);
          
          errors.push({
            id: `measurement-calc-${calc.questionId}-${Date.now()}`,
            title: `${title}: ${language === 'de' ? 'Wert außerhalb der Grenzwerte' : 'Érték határértéken kívül'}`,
            description: calc.error || (language === 'de' 
              ? 'Der berechnete Wert entspricht nicht den Spezifikationen'
              : 'A számított érték nem felel meg a specifikációknak'),
            severity: 'critical' as const,
            images: []
          });
        }
      }
    });
    
    return errors;
  }
}