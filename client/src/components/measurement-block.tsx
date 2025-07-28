import React, { useState, useEffect, useMemo } from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { Calculator, Ruler } from 'lucide-react';
import { Question } from '@shared/schema';
import { getAllMeasurementValues } from './measurement-question';

interface MeasurementBlockProps {
  questions: Question[]; // All measurement and calculated questions
  values: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
}

export function MeasurementBlock({ questions, values, onChange }: MeasurementBlockProps) {
  const { language } = useLanguageContext();
  const [measurementTrigger, setMeasurementTrigger] = useState(0);

  // Get current measurement values with proper trigger updates
  const currentMeasurementValues = useMemo(() => {
    const cached = getAllMeasurementValues();
    const stableCache = (window as any).stableInputValues || {};
    
    const combined: Record<string, number> = {};
    
    // Combine all sources - prioritize stableInputValues (most recent)
    Object.keys(cached).forEach((key: string) => {
      const value = parseFloat(cached[key].toString());
      if (!isNaN(value)) {
        combined[key] = value;
      }
    });
    
    Object.keys(stableCache).forEach((key: string) => {
      const value = parseFloat(stableCache[key]);
      if (!isNaN(value)) {
        combined[key] = value;
      }
    });

    return combined;
  }, [measurementTrigger]);

  // Separate measurement and calculated questions
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  // Get current measurement values for calculations - simplified without real-time updates
  const getCurrentMeasurementValues = (): Record<string, number> => {
    const cached = getAllMeasurementValues();
    const stableCache = (window as any).stableInputValues || {};
    
    const combined: Record<string, number> = {};
    
    // Combine all sources - prioritize stableInputValues (most recent)
    Object.keys(cached).forEach((key: string) => {
      const value = parseFloat(cached[key].toString());
      if (!isNaN(value)) {
        combined[key] = value;
      }
    });
    
    Object.keys(stableCache).forEach((key: string) => {
      const value = parseFloat(stableCache[key]);
      if (!isNaN(value)) {
        combined[key] = value;
      }
    });

    return combined;
  };

  // Calculate values for calculated questions
  const calculateValue = (question: Question): number | null => {
    if (!question.calculationFormula || !question.calculationInputs) {
      return null;
    }

    try {
      const inputIds = question.calculationInputs.split(',').map((id: string) => id.trim());
      let formula = question.calculationFormula;
      let hasAllInputs = true;

      // Replace input references with actual values
      inputIds.forEach((inputId: string) => {
        const value = currentMeasurementValues[inputId];
        if (value !== undefined) {
          // Replace both 'inputX' and 'X' patterns in formula
          formula = formula.replace(new RegExp(`input${inputId}`, 'g'), value.toString());
          formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
        } else {
          hasAllInputs = false;
        }
      });

      if (!hasAllInputs) {
        return null;
      }

      // Safely evaluate the formula
      const result = Function(`"use strict"; return (${formula})`)();
      return typeof result === 'number' && !isNaN(result) ? Math.round(result * 100) / 100 : null;
    } catch (error) {
      return null;
    }
  };

  // Remove handleMeasurementChange as we now use StableInput with onValueChange

  const translations = {
    hu: {
      measurementTitle: 'Mérési Adatok',
      calculatedTitle: 'Számított Értékek'
    },
    de: {
      measurementTitle: 'Messdaten',
      calculatedTitle: 'Berechnete Werte'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.hu;

  return (
    <div className="space-y-6">
      {/* Measurement Questions Table */}
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
                    <input
                      type="number"
                      placeholder="0"
                      className="w-20 text-center font-mono border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={question.minValue}
                      max={question.maxValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log(`Direct measurement input: ${question.id} = ${value}`);
                        
                        // Store in measurement cache immediately - NO REACT STATE UPDATES!
                        if (!(window as any).measurementValues) {
                          (window as any).measurementValues = {};
                        }
                        
                        // Store as both string and number for compatibility
                        if (!(window as any).stableInputValues) {
                          (window as any).stableInputValues = {};
                        }
                        (window as any).stableInputValues[question.id] = value;
                        
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          (window as any).measurementValues[question.id] = numValue;
                          
                          // Use debounced calculation updates to prevent excessive re-renders
                          clearTimeout((window as any)[`calc-timeout-${question.id}`]);
                          (window as any)[`calc-timeout-${question.id}`] = setTimeout(() => {
                            // Trigger calculation update after 200ms of no typing
                            setMeasurementTrigger(prev => prev + 1);
                          }, 200);
                        }
                        
                        // DO NOT call onChange during typing - it causes React re-renders!
                        // onChange(question.id, numValue);
                      }}
                      style={{ 
                        fontSize: '16px',
                        backgroundColor: 'white',
                        color: '#000'
                      }}
                    />
                    {question.unit && (
                      <span className="text-sm text-gray-500 w-8">{question.unit}</span>
                    )}
                  </div>
                </div>
              ))}
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
                  
                  // Don't call onChange during render - it causes React warnings
                  // onChange will be called during Save/Next button processing
                }

                return (
                  <div key={question.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 font-semibold rounded-full shrink-0">
                      {measurementQuestions.length + index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium text-gray-800 leading-relaxed">
                        {language === 'de' ? question.titleDe : question.title}
                      </p>
                      {question.unit && (
                        <p className="text-sm text-gray-500 mt-1">{question.unit}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 bg-gray-50 border rounded px-3 py-2 text-center">
                        <span className="font-mono text-sm">
                          {calculatedValue !== null ? calculatedValue.toFixed(2) : '—'}
                        </span>
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