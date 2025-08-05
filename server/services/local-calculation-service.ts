import { Question } from '@shared/schema';

export interface CalculationResult {
  questionId: string;
  value: number | null;
  isValid: boolean;
  isWithinLimits: boolean;
  error?: string;
}

export class LocalCalculationService {
  /**
   * Calculate values for all calculated questions based on measurement inputs
   */
  static calculateAll(
    questions: Question[],
    measurementValues: Record<string, number>
  ): Record<string, CalculationResult> {
    const results: Record<string, CalculationResult> = {};
    
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
  ): CalculationResult {
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
      console.error(`Calculation error for question ${question.id}:`, error);
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: `Calculation error: ${error.message}`
      };
    }
  }

  /**
   * Safely evaluate mathematical formulas
   */
  private static evaluateFormula(formula: string): number {
    // Remove any non-mathematical characters for safety
    const cleanFormula = formula.replace(/[^0-9+\-*/().\s]/g, '');
    
    // Basic validation - ensure it's a safe mathematical expression
    if (!/^[0-9+\-*/().\s]+$/.test(cleanFormula)) {
      throw new Error('Invalid formula characters');
    }

    // Check for balanced parentheses
    let parenthesesCount = 0;
    for (const char of cleanFormula) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      if (parenthesesCount < 0) throw new Error('Unbalanced parentheses');
    }
    if (parenthesesCount !== 0) throw new Error('Unbalanced parentheses');

    try {
      // Use Function constructor for safe evaluation (safer than eval)
      const result = new Function(`"use strict"; return (${cleanFormula})`)();
      
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Formula did not return a valid number');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${error.message}`);
    }
  }

  /**
   * Check if a value is within specified limits
   */
  private static checkLimits(value: number, minValue?: number, maxValue?: number): boolean {
    if (minValue !== undefined && value < minValue) {
      return false;
    }
    if (maxValue !== undefined && value > maxValue) {
      return false;
    }
    return true;
  }

  /**
   * Generate error message for out-of-bounds values
   */
  private static getLimitError(value: number, minValue?: number, maxValue?: number, unit?: string): string {
    const unitStr = unit ? ` ${unit}` : '';
    
    if (minValue !== undefined && maxValue !== undefined) {
      return `Value ${value}${unitStr} is outside acceptable range (${minValue} - ${maxValue}${unitStr})`;
    } else if (minValue !== undefined) {
      return `Value ${value}${unitStr} is below minimum limit (${minValue}${unitStr})`;
    } else if (maxValue !== undefined) {
      return `Value ${value}${unitStr} is above maximum limit (${maxValue}${unitStr})`;
    }
    
    return 'Value is outside acceptable range';
  }

  /**
   * Generate protocol errors for out-of-bounds calculated values
   */
  static generateBoundaryErrors(
    calculations: Record<string, CalculationResult>,
    questions: Question[]
  ): Array<{title: string; description: string; severity: 'low' | 'medium' | 'critical'}> {
    const errors: Array<{title: string; description: string; severity: 'low' | 'medium' | 'critical'}> = [];
    
    Object.values(calculations).forEach(calc => {
      if (calc.isValid && !calc.isWithinLimits && calc.error) {
        const question = questions.find(q => q.id === calc.questionId);
        if (question) {
          errors.push({
            title: `${question.title} - Érték határon kívül`,
            description: calc.error,
            severity: 'medium'
          });
        }
      }
    });
    
    return errors;
  }
}