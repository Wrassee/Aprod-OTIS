import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Ruler, Calculator, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { MeasurementQuestion } from './measurement-question';
import { CalculatedResult } from './calculated-result';
import { validateMeasurement } from '@/lib/measurement-examples';
import type { Question, ProtocolError } from '@shared/schema';

interface MeasurementBlockProps {
  questions: Question[];
  measurementValues: Record<string, number>;
  calculatedResults: Record<string, any>;
  onMeasurementChange: (questionId: string, value: number | undefined) => void;
  onCalculatedChange: (questionId: string, value: number | undefined) => void;
  onErrorsChange: (errors: ProtocolError[]) => void;
}

export const MeasurementBlock = memo(function MeasurementBlock({
  questions,
  measurementValues,
  calculatedResults,
  onMeasurementChange,
  onCalculatedChange,
  onErrorsChange
}: MeasurementBlockProps) {
  const { language, t } = useLanguage();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Helper function to validate measurement values
  const validateMeasurement = (value: number, minValue?: number, maxValue?: number) => {
    if (minValue !== undefined && value < minValue) {
      return { isValid: false, error: `Minimum: ${minValue}` };
    }
    if (maxValue !== undefined && value > maxValue) {
      return { isValid: false, error: `Maximum: ${maxValue}` };
    }
    return { isValid: true };
  };

  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  // Validate measurement values and update errors
  useEffect(() => {
    const errors: Record<string, string> = {};
    const protocolErrors: ProtocolError[] = [];

    // Validate measurement questions
    measurementQuestions.forEach(question => {
      const value = measurementValues[question.id];
      if (value !== undefined) {
        const validation = validateMeasurement(value, question.minValue, question.maxValue);
        if (!validation.isValid && validation.error) {
          errors[question.id] = validation.error;
          
          // Add to protocol errors if out of range
          protocolErrors.push({
            id: `measurement-${question.id}`,
            title: language === 'hu' 
              ? `Mérési hiba: ${question.title}`
              : `Messfehler: ${question.titleDe || question.title}`,
            description: language === 'hu'
              ? `A mért érték (${value} ${question.unit}) nem felel meg a határértékeknek.`
              : `Der gemessene Wert (${value} ${question.unit}) entspricht nicht den Grenzwerten.`,
            severity: 'medium' as const,
            images: []
          });
        }
      }
    });

    // Validate calculated questions
    calculatedQuestions.forEach(question => {
      const value = calculatedResults[question.id];
      if (value !== undefined) {
        const validation = validateMeasurement(value, question.minValue, question.maxValue);
        if (!validation.isValid && validation.error) {
          errors[question.id] = validation.error;
          
          // Add to protocol errors if out of range
          protocolErrors.push({
            id: `calculated-${question.id}`,
            title: language === 'hu' 
              ? `Számítási hiba: ${question.title}`
              : `Berechnungsfehler: ${question.titleDe || question.title}`,
            description: language === 'hu'
              ? `A számított érték (${value} ${question.unit}) nem felel meg az OTIS előírásoknak.`
              : `Der berechnete Wert (${value} ${question.unit}) entspricht nicht den OTIS-Vorschriften.`,
            severity: 'critical' as const,
            images: []
          });
        }
      }
    });

    setValidationErrors(errors);
    onErrorsChange(protocolErrors);
  }, [measurementValues, calculatedResults, measurementQuestions, calculatedQuestions, language, onErrorsChange]);

  const handleMeasurementChange = useCallback((questionId: string, value: number | undefined) => {
    onMeasurementChange(questionId, value);
  }, [onMeasurementChange]);

  const handleCalculatedChange = useCallback((questionId: string, value: number | undefined) => {
    onCalculatedChange(questionId, value);
  }, [onCalculatedChange]);

  if (measurementQuestions.length === 0 && calculatedQuestions.length === 0) {
    return null;
  }

  const getTotalErrors = () => {
    return Object.keys(validationErrors).length;
  };

  return (
    <div className="space-y-6">
      {/* Header with blue background */}
      <div className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-3 rounded-lg">
        <span className="text-lg font-semibold">
          {language === 'hu' ? 'Mérési adatok' : 'Messdaten'}
        </span>
      </div>

      {/* Measurement Questions - Simple numbered list */}
      <div className="space-y-4">
        {measurementQuestions.map((question, index) => {
          const value = measurementValues[question.id];
          const unit = question.unit || 'mm';
          const title = language === 'de' && question.titleDe ? question.titleDe : question.title;
          
          return (
            <div key={question.id} className="flex items-center space-x-4 py-3 border-b border-gray-200">
              {/* Question number */}
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>
              
              {/* Question text */}
              <div className="flex-1">
                <span className="text-gray-800 font-medium">{title}</span>
              </div>
              
              {/* Input field */}
              <div className="w-32">
                <input
                  type="number"
                  step="0.01"
                  value={value !== undefined ? value.toString() : ''}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === '') {
                      handleMeasurementChange(question.id, undefined);
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue)) {
                        handleMeasurementChange(question.id, numValue);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center font-mono"
                  placeholder="2837"
                />
              </div>
              
              {/* Unit */}
              <div className="w-8 text-gray-500 text-sm">
                {unit}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calculated Results Section */}
      {calculatedQuestions.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center space-x-2 bg-green-500 text-white px-4 py-3 rounded-lg">
            <Calculator className="h-5 w-5" />
            <span className="text-lg font-semibold">
              {language === 'hu' ? 'Számított értékek' : 'Berechnete Werte'}
            </span>
          </div>
          
          {calculatedQuestions.map((question, index) => {
            // Calculate value directly
            const calculatedValue = useMemo(() => {
              if (!question.calculationInputs) return undefined;
              
              const inputs = question.calculationInputs.split(',').map(id => id.trim());
              let sum = 0;
              let hasAllValues = true;
              
              for (const inputId of inputs) {
                const value = measurementValues[inputId];
                if (value === undefined || value === null) {
                  hasAllValues = false;
                  break;
                }
                sum += value;
              }
              
              return hasAllValues ? sum : undefined;
            }, [question.calculationInputs, measurementValues]);

            // Update calculated results when value changes
            useEffect(() => {
              if (calculatedValue !== calculatedResults[question.id]) {
                handleCalculatedChange(question.id, calculatedValue);
              }
            }, [calculatedValue, question.id, calculatedResults, handleCalculatedChange]);

            const value = calculatedValue;
            const unit = question.unit || 'mm';
            const title = language === 'de' && question.titleDe ? question.titleDe : question.title;
            const validation = validateMeasurement(value || 0, question.minValue, question.maxValue);
            const isOutOfRange = value !== undefined && !validation.isValid;
            
            return (
              <div key={question.id} className="flex items-center space-x-4 py-3 border-b border-gray-200">
                {/* Result number */}
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                
                {/* Question/result text */}
                <div className="flex-1">
                  <span className="text-gray-800 font-medium">{title}</span>
                </div>
                
                {/* Calculated value display */}
                <div className={`w-32 px-3 py-2 rounded-md text-center font-mono ${
                  isOutOfRange ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  {value !== undefined ? value.toFixed(0) : '---'}
                </div>
                
                {/* Unit */}
                <div className="w-8 text-gray-500 text-sm">
                  {unit}
                </div>
                
                {/* Warning icon for out of range */}
                {isOutOfRange && (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});