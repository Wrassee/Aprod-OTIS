import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Ruler, AlertTriangle } from 'lucide-react';
import { StableInput } from './stable-input';
import { MeasurementCache } from '@/utils/measurement-cache';
import { useLanguage } from '@/hooks/use-language';

interface Question {
  id: string;
  title: string;
  titleDe?: string;
  type: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  calculationFormula?: string;
  calculationInputs?: string[];
}

interface MeasurementBlockProps {
  questions: Question[];
  onChange: (questionId: string, value: string | number) => void;
  onAddError?: (error: { title: string; description: string; severity: 'low' | 'medium' | 'critical' }) => void;
}

export function MeasurementBlock({ questions, onChange, onAddError }: MeasurementBlockProps) {
  const { language } = useLanguage();
  const [measurementTrigger, setMeasurementTrigger] = useState(0);
  
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');
  
  const t = {
    measurementTitle: language === 'de' ? 'Messdaten' : 'Mérési adatok',
    calculatedTitle: language === 'de' ? 'Berechnete Werte' : 'Számított értékek',
    calculateButton: language === 'de' ? '🧮 Berechnung durchführen' : '🧮 Számítás elvégzése'
  };

  // Restore cached values on component mount
  useEffect(() => {
    MeasurementCache.restoreFromStorage();
    console.log('MeasurementCache: Restored from storage');
  }, []);

  // Calculation function for evaluated formulas
  const calculateValue = (question: Question): number | null => {
    if (!question.calculationFormula || !question.calculationInputs) {
      return null;
    }

    try {
      // Get current measurement values from cache
      const measurementValues = (window as any).measurementValues || {};
      
      let formula = question.calculationFormula;
      
      // Parse calculationInputs - it can be a string or array
      const inputIds = Array.isArray(question.calculationInputs) 
        ? question.calculationInputs 
        : question.calculationInputs.split(',').map(id => id.trim());
      
      console.log(`Calculating ${question.id}: formula="${formula}", inputs=[${inputIds.join(',')}]`);
      console.log('Available measurement values:', measurementValues);
      
      // Replace input variables with actual values
      for (const inputId of inputIds) {
        const value = measurementValues[inputId];
        console.log(`  Input ${inputId}: ${value}`);
        
        if (value !== undefined && value !== null && value !== '') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          if (!isNaN(numValue)) {
            formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), numValue.toString());
          } else {
            console.log(`  -> Invalid numeric value for ${inputId}: ${value}`);
            return null; // Invalid input value
          }
        } else {
          console.log(`  -> Missing value for ${inputId}`);
          return null; // Missing input value
        }
      }
      
      console.log(`  Final formula: ${formula}`);
      
      // Safely evaluate the formula
      try {
        // Simple evaluation for basic arithmetic
        const result = Function(`"use strict"; return (${formula})`)();
        const roundedResult = typeof result === 'number' && !isNaN(result) ? Math.round(result) : null;
        console.log(`  Result: ${result} -> ${roundedResult}`);
        return roundedResult;
      } catch (evalError) {
        console.error('Formula evaluation error:', evalError);
        return null;
      }
    } catch (error) {
      console.error('Calculation error for question', question.id, ':', error);
      return null;
    }
  };

  // Check if calculated value is within bounds
  const checkValueBounds = (question: Question, value: number): boolean => {
    if (question.minValue !== undefined && value < question.minValue) {
      return false;
    }
    if (question.maxValue !== undefined && value > question.maxValue) {
      return false;
    }
    return true;
  };

  // Add error for out-of-bounds calculated values
  const addCalculatedValueError = (question: Question, value: number) => {
    if (!onAddError) return;
    
    const questionTitle = language === 'de' ? question.titleDe : question.title;
    const errorTitle = language === 'de' 
      ? `Berechneter Wert außerhalb der Grenzen: ${questionTitle}`
      : `Határértéken kívüli számított érték: ${questionTitle}`;
    
    const errorDescription = language === 'de'
      ? `Der berechnete Wert ${value} ${question.unit} liegt außerhalb der zulässigen Grenzen (${question.minValue}-${question.maxValue} ${question.unit}). Bitte überprüfen Sie die Eingabewerte.`
      : `A számított érték ${value} ${question.unit} kívül esik a megengedett határokon (${question.minValue}-${question.maxValue} ${question.unit}). Kérjük, ellenőrizze a bemeneti értékeket.`;

    onAddError({
      title: errorTitle,
      description: errorDescription,
      severity: 'critical'
    });
  };

  if (measurementQuestions.length === 0 && calculatedQuestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Measurement Questions */}
      {measurementQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-600" />
              {t.measurementTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {measurementQuestions.map((question, index) => (
                <div key={question.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-semibold rounded-full shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-800 leading-relaxed">
                      {language === 'de' ? question.titleDe : question.title}
                    </p>
                    {question.unit && (
                      <p className="text-sm text-gray-500 mt-1">
                        {question.unit}
                        {question.minValue !== undefined && question.maxValue !== undefined && 
                          ` (${question.minValue}-${question.maxValue})`
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StableInput
                      questionId={question.id}
                      type="number"
                      placeholder="0"
                      className="w-20 text-center font-mono border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={question.minValue}
                      max={question.maxValue}
                    />
                    {question.unit && (
                      <span className="text-sm text-gray-500 w-8">{question.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Calculate Button */}
            <div className="flex justify-center pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  console.log('Manual calculation triggered');
                  setMeasurementTrigger(prev => prev + 1);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {t.calculateButton}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculated Questions Table */}
      {calculatedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              {t.calculatedTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculatedQuestions.map((question, index) => {
                const calculatedValue = calculateValue(question);
                
                // Store calculated value in global cache for form submission
                if (calculatedValue !== null && typeof calculatedValue === 'number') {
                  if (!(window as any).calculatedValues) {
                    (window as any).calculatedValues = {};
                  }
                  (window as any).calculatedValues[question.id] = calculatedValue;
                }

                const isOutOfBounds = calculatedValue !== null && !checkValueBounds(question, calculatedValue);

                return (
                  <div key={question.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 font-semibold rounded-full shrink-0">
                      {measurementQuestions.length + index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium text-gray-800 leading-relaxed">
                        {language === 'de' ? question.titleDe : question.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {question.unit}
                        {isOutOfBounds && (
                          <span className="ml-2 text-red-500 font-medium">
                            ⚠️ {calculatedValue} {question.unit} határértéken kívül ({question.minValue}-{question.maxValue} {question.unit})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`text-center font-mono text-lg font-bold px-3 py-2 rounded-md ${
                        isOutOfBounds ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600'
                      }`}>
                        {calculatedValue !== null ? calculatedValue.toFixed(0) : '-'}
                      </div>
                      {question.unit && (
                        <span className="text-sm text-gray-500 w-8">{question.unit}</span>
                      )}
                    </div>
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

// Helper function to get all calculated values
export function getAllCalculatedValues(): Record<string, number> {
  return (window as any).calculatedValues || {};
}

export function clearAllCalculatedValues() {
  (window as any).calculatedValues = {};
}