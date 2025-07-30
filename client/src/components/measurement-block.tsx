import { useState, useEffect, useMemo } from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { ProtocolError } from '@shared/schema';

interface MeasurementInput {
  id: string;
  title: string;
  titleHu?: string;
  titleDe?: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
}

interface MeasurementCalculation {
  id: string;
  name: string;
  nameHu?: string;
  nameDe?: string;
  formula: string; // e.g., "m1 + m2 - m3"
  inputIds: string[]; // References to measurement input IDs
  minValue?: number;
  maxValue?: number;
  unit: string;
  targetCellReference?: string;
  sheetName?: string;
}

interface MeasurementBlockProps {
  measurements: MeasurementInput[];
  calculations: MeasurementCalculation[];
  values: Record<string, number>;
  onValuesChange: (values: Record<string, number>) => void;
  onErrorsChange: (errors: ProtocolError[]) => void;
  groupName: string;
}

export function MeasurementBlock({
  measurements,
  calculations,
  values,
  onValuesChange,
  onErrorsChange,
  groupName
}: MeasurementBlockProps) {
  const { t, language } = useLanguageContext();
  const [calculatedValues, setCalculatedValues] = useState<Record<string, number>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Get localized title
  const getLocalizedTitle = (item: MeasurementInput | MeasurementCalculation) => {
    if (language === 'de' && 'titleDe' in item && item.titleDe) return item.titleDe;
    if (language === 'hu' && 'titleHu' in item && item.titleHu) return item.titleHu;
    return item.title || (item as any).name;
  };

  // Calculate derived values
  const calculateValues = useMemo(() => {
    const results: Record<string, number> = {};
    const errors: Record<string, string> = {};

    calculations.forEach(calc => {
      try {
        // Replace variable names in formula with actual values
        let formula = calc.formula;
        let hasAllInputs = true;

        calc.inputIds.forEach(inputId => {
          const value = values[inputId];
          if (value === undefined || value === null || isNaN(value)) {
            hasAllInputs = false;
            return;
          }
          // Replace variable name with actual value
          formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
        });

        if (hasAllInputs) {
          // Evaluate the mathematical expression
          const result = Function(`"use strict"; return (${formula})`)();
          
          if (isNaN(result)) {
            errors[calc.id] = language === 'de' ? 'Ungültige Berechnung' : 'Érvénytelen számítás';
          } else {
            results[calc.id] = Math.round(result * 100) / 100; // Round to 2 decimal places
            
            // Check if result is within acceptable range
            if (calc.minValue !== undefined && result < calc.minValue) {
              errors[calc.id] = language === 'de' 
                ? `Wert zu niedrig (min: ${calc.minValue}${calc.unit})`
                : `Érték túl alacsony (min: ${calc.minValue}${calc.unit})`;
            } else if (calc.maxValue !== undefined && result > calc.maxValue) {
              errors[calc.id] = language === 'de'
                ? `Wert zu hoch (max: ${calc.maxValue}${calc.unit})`
                : `Érték túl magas (max: ${calc.maxValue}${calc.unit})`;
            }
          }
        }
      } catch (error) {
        errors[calc.id] = language === 'de' ? 'Berechnungsfehler' : 'Számítási hiba';
      }
    });

    return { results, errors };
  }, [values, calculations, language]);

  // Update calculated values and validation errors
  useEffect(() => {
    setCalculatedValues(calculateValues.results);
    setValidationErrors(calculateValues.errors);
  }, [calculateValues]);

  // Generate protocol errors for out-of-range values
  useEffect(() => {
    const protocolErrors: ProtocolError[] = [];
    
    Object.entries(validationErrors).forEach(([calcId, errorMessage]) => {
      const calculation = calculations.find(c => c.id === calcId);
      if (calculation) {
        protocolErrors.push({
          id: `measurement-${calcId}-${Date.now()}`,
          title: `${getLocalizedTitle(calculation)}: ${errorMessage}`,
          description: language === 'de' 
            ? `Berechneter Wert entspricht nicht den Spezifikationen`
            : `A számított érték nem felel meg a specifikációknak`,
          severity: 'critical' as const,
          images: []
        });
      }
    });

    onErrorsChange(protocolErrors);
  }, [validationErrors, calculations, language, onErrorsChange]);

  const handleInputChange = (measurementId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newValues = { ...values, [measurementId]: numValue };
    onValuesChange(newValues);
  };

  const translations = {
    hu: {
      measurements: 'Mérési adatok',
      calculations: 'Számítások',
      enterValue: 'Adja meg az értéket',
      result: 'Eredmény',
      withinLimits: 'Határértéken belül',
      outOfLimits: 'Határértéken kívül'
    },
    de: {
      measurements: 'Messdaten',
      calculations: 'Berechnungen',
      enterValue: 'Wert eingeben',
      result: 'Ergebnis',
      withinLimits: 'Innerhalb der Grenzwerte',
      outOfLimits: 'Außerhalb der Grenzwerte'
    }
  };

  const currentT = translations[language] || translations.hu;

  return (
    <div className="space-y-6">
      {/* Measurement Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {currentT.measurements} - {groupName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {measurements.map(measurement => (
              <div key={measurement.id} className="space-y-2">
                <Label htmlFor={measurement.id}>
                  {getLocalizedTitle(measurement)}
                  <span className="text-sm text-gray-500 ml-2">({measurement.unit})</span>
                </Label>
                <Input
                  id={measurement.id}
                  type="number"
                  value={values[measurement.id]?.toString() || ''}
                  onChange={(e) => handleInputChange(measurement.id, e.target.value)}
                  placeholder={measurement.placeholder || currentT.enterValue}
                  className="w-full"
                  min={measurement.minValue}
                  max={measurement.maxValue}
                />
                {measurement.minValue !== undefined && measurement.maxValue !== undefined && (
                  <p className="text-xs text-gray-500">
                    {language === 'de' ? 'Bereich' : 'Tartomány'}: {measurement.minValue} - {measurement.maxValue} {measurement.unit}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calculations Results */}
      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {currentT.calculations}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calculations.map(calc => {
                const result = calculatedValues[calc.id];
                const error = validationErrors[calc.id];
                const hasResult = result !== undefined && !isNaN(result);
                const isValid = hasResult && !error;

                return (
                  <div key={calc.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{getLocalizedTitle(calc)}</h4>
                      <Badge variant={isValid ? "default" : "destructive"}>
                        {isValid ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {isValid ? currentT.withinLimits : currentT.outOfLimits}
                      </Badge>
                    </div>
                    
                    <div className="text-lg font-mono bg-gray-50 p-2 rounded">
                      {hasResult ? `${result} ${calc.unit}` : '-- ' + calc.unit}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {calc.formula}
                    </p>
                    
                    {error && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {calc.minValue !== undefined && calc.maxValue !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'de' ? 'Zulässig' : 'Megengedett'}: {calc.minValue} - {calc.maxValue} {calc.unit}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}