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

  // Listen for measurement changes to recalculate
  useEffect(() => {
    const handleMeasurementChange = () => {
      setMeasurementTrigger(prev => prev + 1);
    };

    const handleInputChange = () => {
      setMeasurementTrigger(prev => prev + 1);
    };

    window.addEventListener('measurement-change', handleMeasurementChange);
    window.addEventListener('input-change', handleInputChange);
    
    return () => {
      window.removeEventListener('measurement-change', handleMeasurementChange);
      window.removeEventListener('input-change', handleInputChange);
    };
  }, []);

  // Separate measurement and calculated questions
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  // Get current measurement values for calculations
  const currentMeasurementValues = useMemo(() => {
    const cached = getAllMeasurementValues();
    const stableCache = (window as any).stableInputValues || {};
    
    const combined: Record<string, number> = {};
    
    // Combine all sources
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

  const handleMeasurementChange = (questionId: string, value: string) => {
    // Store in both caches for compatibility
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[questionId] = value;
    
    if (!(window as any).stableInputValues) {
      (window as any).stableInputValues = {};
    }
    (window as any).stableInputValues[questionId] = value;
    
    // Trigger measurement change event for calculations
    window.dispatchEvent(new CustomEvent('measurement-change'));
    
    // Call parent onChange
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange(questionId, numValue);
    }
  };

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
                    <Input
                      type="number"
                      value={currentMeasurementValues[question.id] || ''}
                      onChange={(e) => handleMeasurementChange(question.id, e.target.value)}
                      placeholder="0"
                      className="w-20 text-center font-mono"
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
                  
                  // Also call onChange to update parent state
                  onChange(question.id, calculatedValue);
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