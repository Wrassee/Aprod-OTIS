// Example measurement questions that can be added to Excel templates
export const measurementExamples = {
  hungarian: [
    {
      id: 'm1',
      title: 'Távolság az aknatető és a kabintető között',
      titleHu: 'Távolság az aknatető és a kabintető között',
      titleDe: 'Abstand zwischen Schachtkopf und Kabinendach',
      type: 'measurement' as const,
      required: true,
      unit: 'mm',
      minValue: 500,
      maxValue: 3000,
      cellReference: 'D25',
      placeholder: 'Adja meg a mérést mm-ben'
    },
    {
      id: 'm2', 
      title: 'Távolság a legfelső ajtóküszöb és a kabinküszöb között',
      titleHu: 'Távolság a legfelső ajtóküszöb és a kabinküszöb között',
      titleDe: 'Abstand zwischen oberster Türschwelle und Kabinenschwelle',
      type: 'measurement' as const,
      required: true,
      unit: 'mm',
      minValue: 0,
      maxValue: 50,
      cellReference: 'D26',
      placeholder: 'Adja meg a mérést mm-ben'
    },
    {
      id: 'm3',
      title: 'Távolság az ellensúly puffer és a süllyeszték között',
      titleHu: 'Távolság az ellensúly puffer és a süllyeszték között', 
      titleDe: 'Abstand zwischen Gegengewichtpuffer und Grube',
      type: 'measurement' as const,
      required: true,
      unit: 'mm',
      minValue: 100,
      maxValue: 1000,
      cellReference: 'D27',
      placeholder: 'Adja meg a mérést mm-ben'
    }
  ],
  calculated: [
    {
      id: 'c1',
      title: 'Szabadmagasság összesen',
      titleHu: 'Szabadmagasság összesen',
      titleDe: 'Gesamte Kopfhöhe',
      type: 'calculated' as const,
      required: false,
      unit: 'mm',
      minValue: 2500,
      maxValue: 5000,
      cellReference: 'D28',
      calculationFormula: 'm1 + m2',
      calculationInputs: 'm1,m2',
      placeholder: 'Automatikusan számolt érték'
    },
    {
      id: 'c2', 
      title: 'Biztonsági távolság',
      titleHu: 'Biztonsági távolság',
      titleDe: 'Sicherheitsabstand',
      type: 'calculated' as const,
      required: false,
      unit: 'mm',
      minValue: 150,
      maxValue: 800,
      cellReference: 'D29',
      calculationFormula: 'm3 - 100',
      calculationInputs: 'm3',
      placeholder: 'Automatikusan számolt érték'
    },
    {
      id: 'c3',
      title: 'Teljes szükséges magasság',
      titleHu: 'Teljes szükséges magasság', 
      titleDe: 'Erforderliche Gesamthöhe',
      type: 'calculated' as const,
      required: false,
      unit: 'mm',
      minValue: 3000,
      maxValue: 8000,
      cellReference: 'D30',
      calculationFormula: 'c1 + c2',
      calculationInputs: 'c1,c2',
      placeholder: 'Automatikusan számolt érték'
    }
  ]
};

// Template Excel header for measurement section
export const measurementSectionTemplate = {
  hungarian: {
    sectionTitle: 'Mérési adatok és számítások',
    headers: {
      measurement: 'Mérés',
      value: 'Érték',
      unit: 'Egység',
      limits: 'Határértékek',
      result: 'Eredmény'
    }
  },
  german: {
    sectionTitle: 'Messdaten und Berechnungen',
    headers: {
      measurement: 'Messung',
      value: 'Wert', 
      unit: 'Einheit',
      limits: 'Grenzwerte',
      result: 'Ergebnis'
    }
  }
};

// Helper function to validate measurement values
export function validateMeasurement(value: number, minValue?: number, maxValue?: number): { isValid: boolean; error?: string } {
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

// Helper function to evaluate calculation formulas safely
export function evaluateFormula(formula: string, values: Record<string, number>): { result: number | null; error?: string } {
  try {
    // Replace variable names with values
    let processedFormula = formula;
    for (const [key, value] of Object.entries(values)) {
      if (isNaN(value)) {
        return { result: null, error: `Missing or invalid value for ${key}` };
      }
      processedFormula = processedFormula.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString());
    }
    
    // Basic security check - only allow numbers, operators, parentheses
    if (!/^[0-9+\-*/.() ]+$/.test(processedFormula)) {
      return { result: null, error: 'Invalid characters in formula' };
    }
    
    // Evaluate safely
    const result = Function(`"use strict"; return (${processedFormula})`)();
    
    if (isNaN(result)) {
      return { result: null, error: 'Calculation resulted in NaN' };
    }
    
    return { result: Math.round(result * 100) / 100 }; // Round to 2 decimal places
  } catch (error) {
    return { result: null, error: `Calculation error: ${(error as Error).message}` };
  }
}