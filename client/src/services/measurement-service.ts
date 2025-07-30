import type { Question, ProtocolError } from '@shared/schema';

export class MeasurementService {
  private static instance: MeasurementService;
  
  private constructor() {}
  
  public static getInstance(): MeasurementService {
    if (!MeasurementService.instance) {
      MeasurementService.instance = new MeasurementService();
    }
    return MeasurementService.instance;
  }

  /**
   * Validates a measurement value against defined limits
   */
  public validateMeasurement(
    value: number, 
    minValue?: number, 
    maxValue?: number
  ): { isValid: boolean; error?: string } {
    if (isNaN(value)) {
      return { isValid: false, error: 'Invalid numeric value' };
    }
    
    if (minValue !== undefined && value < minValue) {
      return { isValid: false, error: `Value ${value} is below minimum ${minValue}` };
    }
    
    if (maxValue !== undefined && value > maxValue) {
      return { isValid: false, error: `Value ${value} is above maximum ${maxValue}` };
    }
    
    return { isValid: true };
  }

  /**
   * Safely evaluates a calculation formula with given values
   */
  public evaluateFormula(
    formula: string, 
    values: Record<string, number>
  ): { result: number | null; error?: string } {
    try {
      console.log(`Calculating ${formula}: formula="${formula}", inputs=[${Object.keys(values).join(',')}]`);
      
      // Replace variable names with values
      let processedFormula = formula;
      for (const [key, value] of Object.entries(values)) {
        if (isNaN(value)) {
          console.log(`  Missing or invalid value for ${key}`);
          return { result: null, error: `Missing or invalid value for ${key}` };
        }
        console.log(`  Input ${key}: ${value}`);
        processedFormula = processedFormula.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString());
      }
      
      console.log(`  Final formula: ${processedFormula}`);
      
      // Basic security check - only allow numbers, operators, parentheses
      if (!/^[0-9+\-*/.() ]+$/.test(processedFormula)) {
        return { result: null, error: 'Invalid characters in formula' };
      }
      
      // Evaluate safely
      const result = Function(`"use strict"; return (${processedFormula})`)();
      
      if (isNaN(result)) {
        return { result: null, error: 'Calculation resulted in NaN' };
      }
      
      const roundedResult = Math.round(result * 100) / 100; // Round to 2 decimal places
      console.log(`  Result: ${result} -> ${roundedResult}`);
      
      return { result: roundedResult };
    } catch (error) {
      console.error(`Calculation error: ${(error as Error).message}`);
      return { result: null, error: `Calculation error: ${(error as Error).message}` };
    }
  }

  /**
   * Processes all measurement and calculated values, generates errors for out-of-range values
   */
  public processAllMeasurements(
    questions: Question[],
    measurementValues: Record<string, number>,
    calculatedResults: Record<string, any>,
    language: string
  ): ProtocolError[] {
    const errors: ProtocolError[] = [];

    // Process measurement questions
    const measurementQuestions = questions.filter(q => q.type === 'measurement');
    measurementQuestions.forEach(question => {
      const value = measurementValues[question.id];
      if (value !== undefined) {
        const validation = this.validateMeasurement(value, question.minValue, question.maxValue);
        if (!validation.isValid) {
          errors.push({
            id: `measurement-${question.id}`,
            title: language === 'hu' 
              ? `Mérési hiba: ${question.title}`
              : `Messfehler: ${question.titleDe || question.title}`,
            description: language === 'hu'
              ? `A mért érték (${value} ${question.unit || 'mm'}) nem felel meg a határértékeknek.`
              : `Der gemessene Wert (${value} ${question.unit || 'mm'}) entspricht nicht den Grenzwerten.`,
            severity: 'medium' as const,
            images: []
          });
        }
      }
    });

    // Process calculated questions
    const calculatedQuestions = questions.filter(q => q.type === 'calculated');
    calculatedQuestions.forEach(question => {
      const value = calculatedResults[question.id];
      if (value !== undefined) {
        const validation = this.validateMeasurement(value, question.minValue, question.maxValue);
        if (!validation.isValid) {
          errors.push({
            id: `calculated-${question.id}`,
            title: language === 'hu' 
              ? `Számítási hiba: ${question.title}`
              : `Berechnungsfehler: ${question.titleDe || question.title}`,
            description: language === 'hu'
              ? `A számított érték (${value} ${question.unit || 'mm'}) nem felel meg az OTIS előírásoknak.`
              : `Der berechnete Wert (${value} ${question.unit || 'mm'}) entspricht nicht den OTIS-Vorschriften.`,
            severity: 'critical' as const,
            images: []
          });
        }
      }
    });

    return errors;
  }

  /**
   * Calculates all derived values based on measurement inputs
   */
  public calculateDerivedValues(
    questions: Question[],
    measurementValues: Record<string, number>
  ): Record<string, number> {
    const results: Record<string, number> = {};
    
    const calculatedQuestions = questions.filter(q => q.type === 'calculated');
    
    for (const question of calculatedQuestions) {
      if (!question.calculationFormula || !question.calculationInputs) {
        continue;
      }

      const inputIds = question.calculationInputs.split(',').map((id: string) => id.trim());
      const values: Record<string, number> = {};
      
      // Collect values for calculation (including previously calculated values)
      let allInputsAvailable = true;
      for (const inputId of inputIds) {
        if (measurementValues[inputId] !== undefined) {
          values[inputId] = measurementValues[inputId];
        } else if (results[inputId] !== undefined) {
          values[inputId] = results[inputId];
        } else {
          allInputsAvailable = false;
          break;
        }
      }

      if (allInputsAvailable) {
        const calculation = this.evaluateFormula(question.calculationFormula, values);
        if (calculation.result !== null) {
          results[question.id] = calculation.result;
        }
      }
    }

    return results;
  }

  /**
   * Gets all measurement and calculated values formatted for Excel export
   */
  public getFormattedValues(
    questions: Question[],
    measurementValues: Record<string, number>,
    calculatedResults: Record<string, any>
  ): Record<string, string> {
    const formatted: Record<string, string> = {};

    // Format measurement values
    questions.filter(q => q.type === 'measurement').forEach(question => {
      const value = measurementValues[question.id];
      if (value !== undefined) {
        const unit = question.unit || 'mm';
        formatted[question.id] = `${value} ${unit}`;
      }
    });

    // Format calculated values
    questions.filter(q => q.type === 'calculated').forEach(question => {
      const value = calculatedResults[question.id];
      if (value !== undefined) {
        const unit = question.unit || 'mm';
        formatted[question.id] = `${value} ${unit}`;
      }
    });

    return formatted;
  }
}

// Export singleton instance
export const measurementService = MeasurementService.getInstance();