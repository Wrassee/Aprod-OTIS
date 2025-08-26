import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeasurementQuestion, getAllMeasurementValues } from './measurement-question';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguageContext } from '@/components/language-provider';
import { MeasurementCalculator } from '@/lib/measurement-calculator';

interface MeasurementBlockProps {
  questions: Question[];
  onCompleted: () => void;
  onAddError: (error: any) => void;
}

export function clearAllCalculatedValues() {
  // No-op for compatibility
}

export function MeasurementBlock({ questions, onCompleted, onAddError }: MeasurementBlockProps) {
  const { language } = useLanguageContext();
  const [measurementValues, setMeasurementValues] = useState<Record<string, number>>({});
  const [calculatedValues, setCalculatedValues] = useState<Record<string, number>>({});
  const [outOfRangeValues, setOutOfRangeValues] = useState<Set<string>>(new Set());

  // Split questions by type
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  const updateCalculations = useCallback(() => {
    const currentMeasurements = getAllMeasurementValues();
    const newOutOfRange = new Set<string>();

    // Calculate values using the measurement calculator
    const calculationResults = MeasurementCalculator.calculateAll(questions, currentMeasurements);
    const newCalculated: Record<string, number> = {};

    // Process calculation results
    Object.values(calculationResults).forEach(result => {
      if (result.isValid && result.value !== null) {
        newCalculated[result.questionId] = result.value;
        
        if (!result.isWithinLimits) {
          newOutOfRange.add(result.questionId);
        }
      }
    });

    // Check range for measurement values
    measurementQuestions.forEach(question => {
      const value = currentMeasurements[question.id];
      if (value !== undefined && question.minValue !== undefined && question.maxValue !== undefined) {
        if (value < question.minValue || value > question.maxValue) {
          newOutOfRange.add(question.id);
        }
      }
    });

    setMeasurementValues(currentMeasurements);
    setCalculatedValues(newCalculated);
    setOutOfRangeValues(newOutOfRange);
  }, [measurementQuestions, calculatedQuestions, questions]);

  // Listen for measurement changes
  useEffect(() => {
    const handleMeasurementChange = () => {
      updateCalculations();
    };

    window.addEventListener('measurement-change', handleMeasurementChange);
    window.addEventListener('button-check', handleMeasurementChange);
    
    // Initial calculation
    updateCalculations();

    return () => {
      window.removeEventListener('measurement-change', handleMeasurementChange);
      window.removeEventListener('button-check', handleMeasurementChange);
    };
  }, [updateCalculations]);

  const handleMeasurementChange = (questionId: string, value: number) => {
    // Values are stored in global cache, just trigger update
    updateCalculations();
  };

  const isComplete = () => {
    // Check if all required measurements are filled
    const hasAllMeasurements = measurementQuestions
      .filter(q => q.required)
      .every(q => measurementValues[q.id] !== undefined && !isNaN(measurementValues[q.id]));
    
    // Check if all calculated values are computed
    const hasAllCalculated = calculatedQuestions.every(q => calculatedValues[q.id] !== undefined);
    
    return hasAllMeasurements && hasAllCalculated;
  };

  const hasErrors = outOfRangeValues.size > 0;

  return (
    <div className="space-y-6">
      {/* Measurement Questions */}
      {measurementQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'de' ? 'Messungen' : 'Mérések'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {measurementQuestions.map((question) => (
                <MeasurementQuestion
                  key={question.id}
                  question={question}
                  value={measurementValues[question.id]}
                  onChange={(value) => handleMeasurementChange(question.id, value)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculated Values */}
      {calculatedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'de' ? 'Berechnete Werte' : 'Számított értékek'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculatedQuestions.map((question) => {
                const value = calculatedValues[question.id];
                const isOutOfRange = outOfRangeValues.has(question.id);
                const title = language === 'de' && question.titleDe ? question.titleDe : 
                             language === 'hu' && question.titleHu ? question.titleHu : 
                             question.title;

                return (
                  <div
                    key={question.id}
                    className="flex items-center justify-between w-full py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1 pr-6">
                      <div className="text-lg font-medium text-gray-800">
                        {title}
                      </div>
                      <div className="mt-1 text-base text-gray-500">
                        {question.unit && <span>{question.unit}</span>}
                        {question.minValue !== undefined && question.maxValue !== undefined && (
                          <span className="ml-2 text-sm">
                            ({question.minValue} - {question.maxValue} {question.unit})
                          </span>
                        )}
                        {isOutOfRange && (
                          <span className="ml-2 text-red-500 font-medium">
                            ⚠️ Tartományon kívül
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-20 text-center font-mono text-lg px-3 py-2 rounded border ${
                        isOutOfRange ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 bg-gray-50'
                      }`}>
                        {value !== undefined ? value.toFixed(0) : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status and Action */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {isComplete() ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-green-700 font-medium">
                {language === 'de' ? 'Alle Messungen vollständig' : 'Minden mérés kész'}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-yellow-700 font-medium">
                {language === 'de' ? 'Messungen unvollständig' : 'Mérések hiányosak'}
              </span>
            </>
          )}
          
          {hasErrors && (
            <span className="ml-4 text-red-600 font-medium">
              {language === 'de' ? 'Fehler erkannt' : 'Hibák észlelve'}
            </span>
          )}
        </div>

        <Button
          onClick={onCompleted}
          disabled={!isComplete()}
          variant={isComplete() ? 'default' : 'secondary'}
        >
          {language === 'de' ? 'Weiter' : 'Tovább'}
        </Button>
      </div>
    </div>
  );
}

export default MeasurementBlock;