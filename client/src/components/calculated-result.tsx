import { memo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { evaluateFormula } from '@/lib/measurement-examples';
import type { Question } from '@shared/schema';

interface CalculatedResultProps {
  question: Question;
  measurementValues: Record<string, number>;
  onChange: (value: number | undefined) => void;
}

export const CalculatedResult = memo(function CalculatedResult({
  question,
  measurementValues,
  onChange
}: CalculatedResultProps) {
  const { language } = useLanguage();
  const [result, setResult] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  const title = language === 'de' && question.titleDe ? question.titleDe : question.title;
  const unit = question.unit || 'mm';

  useEffect(() => {
    if (!question.calculationFormula || !question.calculationInputs) {
      setError(language === 'hu' ? 'Hiányzó számítási konfiguráció' : 'Fehlende Berechnungskonfiguration');
      return;
    }

    const inputIds = question.calculationInputs.split(',').map((id: string) => id.trim());
    const values: Record<string, number> = {};
    
    // Collect values for calculation
    let missingInputs: string[] = [];
    for (const inputId of inputIds) {
      if (measurementValues[inputId] !== undefined && !isNaN(measurementValues[inputId])) {
        values[inputId] = measurementValues[inputId];
      } else {
        missingInputs.push(inputId);
      }
    }

    if (missingInputs.length > 0) {
      setResult(undefined);
      setError(undefined);
      // Only call onChange if result actually changed
      if (result !== undefined) {
        onChange(undefined);
      }
      return;
    }

    // Perform calculation
    const calculation = evaluateFormula(question.calculationFormula, values);
    
    if (calculation.error) {
      setError(calculation.error);
      setResult(undefined);
      // Only call onChange if result actually changed
      if (result !== undefined) {
        onChange(undefined);
      }
    } else if (calculation.result !== null) {
      const newResult = calculation.result;
      setResult(newResult);
      setError(undefined);
      
      // Only call onChange if result actually changed
      if (newResult !== result) {
        onChange(newResult);
      }

      // Check if result is within valid range
      const outOfRange = (
        (question.minValue !== undefined && calculation.result < question.minValue) ||
        (question.maxValue !== undefined && calculation.result > question.maxValue)
      );
      setIsOutOfRange(outOfRange);
    }
  }, [question.calculationFormula, question.calculationInputs, question.minValue, question.maxValue, question.id, measurementValues, language]); // Removed onChange from deps to prevent infinite loop

  const getValidationIcon = () => {
    if (result === undefined) return null;
    
    if (error || isOutOfRange) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getRangeDisplay = () => {
    if (question.minValue !== undefined && question.maxValue !== undefined) {
      return `${question.minValue} - ${question.maxValue} ${unit}`;
    } else if (question.minValue !== undefined) {
      return `≥ ${question.minValue} ${unit}`;
    } else if (question.maxValue !== undefined) {
      return `≤ ${question.maxValue} ${unit}`;
    }
    return null;
  };

  const getFormulaDisplay = () => {
    if (!question.calculationFormula || !question.calculationInputs) return '';
    
    let displayFormula = question.calculationFormula;
    const inputIds = question.calculationInputs.split(',').map((id: string) => id.trim());
    
    // Replace IDs with values for display
    for (const inputId of inputIds) {
      const value = measurementValues[inputId];
      if (value !== undefined) {
        displayFormula = displayFormula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
      }
    }
    
    return displayFormula;
  };

  return (
    <Card className={`border-l-4 ${!error && !isOutOfRange ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title and Icon */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-5">
                {title}
              </span>
            </div>
            {getValidationIcon()}
          </div>

          {/* Range Display */}
          {getRangeDisplay() && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {language === 'hu' ? 'Határérték' : 'Grenzwert'}: {getRangeDisplay()}
              </Badge>
            </div>
          )}

          {/* Formula Display */}
          {question.calculationFormula && (
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm font-mono">
              <span className="text-gray-600 dark:text-gray-400">
                {language === 'hu' ? 'Képlet' : 'Formel'}: 
              </span>
              <span className="ml-2">{getFormulaDisplay()}</span>
            </div>
          )}

          {/* Result Display */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
            {result !== undefined ? (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {result} {unit}
                </span>
                {isOutOfRange && (
                  <Badge variant="destructive" className="text-xs">
                    {language === 'hu' ? 'Határon kívül' : 'Außerhalb der Grenze'}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 italic">
                {language === 'hu' ? 'Várakozás mérési adatokra...' : 'Warten auf Messdaten...'}
              </span>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Out of Range Warning */}
          {!error && result !== undefined && isOutOfRange && (
            <div className="flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {language === 'hu' 
                  ? 'Az számított érték nem felel meg az OTIS előírásoknak'
                  : 'Der berechnete Wert entspricht nicht den OTIS-Vorschriften'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});