import { Question } from '@shared/schema';

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
      
      if (result === null) {
        return {
          questionId: question.id,
          value: null,
          isValid: false,
          isWithinLimits: false,
          error: 'Invalid formula'
        };
      }

      // Check if within limits
      const isWithinLimits = this.checkLimits(result, question.minValue, question.maxValue);

      return {
        questionId: question.id,
        value: result,
        isValid: true,
        isWithinLimits,
        error: isWithinLimits ? undefined : 'Value out of range'
      };

    } catch (error) {
      return {
        questionId: question.id,
        value: null,
        isValid: false,
        isWithinLimits: false,
        error: error instanceof Error ? error.message : 'Calculation error'
      };
    }
  }

  /**
   * Safely evaluate a mathematical formula
   */
  private static evaluateFormula(formula: string): number | null {
    try {
      // Simple safety check - only allow basic math operations
      if (!/^[0-9+\-*/.() ]+$/.test(formula)) {
        console.warn('Formula contains invalid characters:', formula);
        return null;
      }

      // Use Function constructor for safe evaluation
      const result = new Function(`return ${formula}`)();
      
      if (typeof result !== 'number' || isNaN(result)) {
        return null;
      }

      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return null;
    }
  }

  /**
   * Check if value is within specified limits
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
}