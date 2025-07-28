import { useMemo, useState, useEffect } from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { Question } from '@shared/schema';
import { getAllMeasurementValues } from './measurement-question';

interface CalculatedResultProps {
  question: Question; // This should be a 'calculated' type question
  inputValues: Record<string, number>; // All measurement input values
}

export function CalculatedResult({ question, inputValues }: CalculatedResultProps) {
  const { language } = useLanguageContext();
  const [measurementTrigger, setMeasurementTrigger] = useState(0);

  // Listen for measurement changes to recalculate
  useEffect(() => {
    const handleMeasurementChange = () => {
      setMeasurementTrigger(prev => prev + 1);
    };

    window.addEventListener('measurement-change', handleMeasurementChange);
    return () => window.removeEventListener('measurement-change', handleMeasurementChange);
  }, []);

  const calculationResult = useMemo(() => {
    if (!question.calculationFormula || !question.calculationInputs) {
      return { value: null, error: 'No calculation formula defined' };
    }

    try {
      const inputIds = question.calculationInputs.split(',').map(id => id.trim());
      let formula = question.calculationFormula;
      let hasAllInputs = true;

      // Get current measurement values from cache AND props
      const cachedMeasurements = getAllMeasurementValues();
      const allInputValues = { ...inputValues, ...cachedMeasurements };

      console.log(`[CalculatedResult ${question.id}] Input IDs:`, inputIds);
      console.log(`[CalculatedResult ${question.id}] All input values:`, allInputValues);
      console.log(`[CalculatedResult ${question.id}] Formula:`, formula);

      // Replace variable names in formula with actual values
      inputIds.forEach(inputId => {
        const value = allInputValues[inputId];
        if (value === undefined || value === null || isNaN(value)) {
          console.log(`[CalculatedResult ${question.id}] Missing value for ${inputId}:`, value);
          hasAllInputs = false;
          return;
        }
        formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
      });

      if (!hasAllInputs) {
        return { value: null, error: 'Missing input values' };
      }

      console.log(`[CalculatedResult ${question.id}] Final formula:`, formula);

      // Evaluate the mathematical expression safely
      const result = Function(`"use strict"; return (${formula})`)();
      
      if (isNaN(result)) {
        return { value: null, error: 'Invalid calculation result' };
      }

      const roundedResult = Math.round(result * 100) / 100;
      console.log(`[CalculatedResult ${question.id}] Result:`, roundedResult);

      return { value: roundedResult, error: null };
    } catch (error) {
      console.error(`[CalculatedResult ${question.id}] Calculation error:`, error);
      return { value: null, error: 'Calculation error' };
    }
  }, [question, inputValues, measurementTrigger]);

  const getTitle = () => {
    if (language === 'de' && question.titleDe) return question.titleDe;
    if (language === 'hu' && question.titleHu) return question.titleHu;
    return question.title;
  };

  const isValid = calculationResult.value !== null && !calculationResult.error;
  const isOutOfRange = isValid && calculationResult.value !== null && (
    (question.minValue !== undefined && calculationResult.value < question.minValue) ||
    (question.maxValue !== undefined && calculationResult.value > question.maxValue)
  );

  const getStatusBadge = () => {
    if (!isValid) {
      return (
        <Badge variant="secondary">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {language === 'de' ? 'Berechnung nicht möglich' : 'Számítás nem lehetséges'}
        </Badge>
      );
    }
    
    if (isOutOfRange) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {language === 'de' ? 'Außerhalb der Grenzwerte' : 'Határértéken kívül'}
        </Badge>
      );
    }

    return (
      <Badge variant="default">
        <CheckCircle className="h-3 w-3 mr-1" />
        {language === 'de' ? 'Innerhalb der Grenzwerte' : 'Határértéken belül'}
      </Badge>
    );
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <h4 className="font-medium">{getTitle()}</h4>
          </div>
          {getStatusBadge()}
        </div>

        <div className="text-2xl font-mono bg-gray-50 p-3 rounded-lg mb-3">
          {isValid && calculationResult.value !== null
            ? `${calculationResult.value} ${question.unit || ''}`
            : `-- ${question.unit || ''}`
          }
        </div>

        <div className="text-sm text-gray-600 mb-2">
          <strong>{language === 'de' ? 'Formel' : 'Képlet'}:</strong> {question.calculationFormula}
        </div>

        {question.minValue !== undefined && question.maxValue !== undefined && (
          <div className="text-xs text-gray-500 mb-2">
            {language === 'de' ? 'Zulässiger Bereich' : 'Megengedett tartomány'}: {question.minValue} - {question.maxValue} {question.unit || ''}
          </div>
        )}

        {calculationResult.error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {language === 'de' ? 'Berechnungsfehler' : 'Számítási hiba'}: {calculationResult.error}
            </AlertDescription>
          </Alert>
        )}

        {isOutOfRange && calculationResult.value !== null && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {language === 'de' 
                ? `Wert ${calculationResult.value} ${question.unit || ''} liegt außerhalb des zulässigen Bereichs`
                : `Az érték ${calculationResult.value} ${question.unit || ''} a megengedett tartományon kívül esik`
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}