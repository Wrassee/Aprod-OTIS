import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Ruler, AlertTriangle } from 'lucide-react';
import { StableInput } from './stable-input';
import { MeasurementCache } from '@/utils/measurement-cache';
import { useLanguageContext } from '@/components/language-provider';

interface Question {
  id: string;
  title: string;
  titleDe?: string;
  type: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  calculationFormula?: string;
  calculationInputs?: string | string[];
}

interface MeasurementBlockProps {
  questions: Question[];
  values?: Record<string, any>;
  onChange: (questionId: string, value: string | number) => void;
  onAddError?: (error: { title: string; description: string; severity: 'low' | 'medium' | 'critical' }) => void;
}

export function MeasurementBlock({ questions, values, onChange, onAddError }: MeasurementBlockProps) {
  const { language, t } = useLanguageContext();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  useEffect(() => {
    MeasurementCache.restoreFromStorage();
    
    // Listen for measurement value changes to trigger recalculation
    const handleMeasurementChange = () => {
      console.log('Measurement values changed, triggering recalculation');
      setRefreshTrigger(prev => prev + 1);
    };
    
    const handleCalculationUpdate = () => {
      console.log('Calculation update triggered');
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener('measurement-change', handleMeasurementChange);
    window.addEventListener('calculation-update', handleCalculationUpdate);
    
    return () => {
      window.removeEventListener('measurement-change', handleMeasurementChange);
      window.removeEventListener('calculation-update', handleCalculationUpdate);
    };
  }, []);

  const calculateValue = (question: Question): number | null => {
    if (!question.calculationFormula || !question.calculationInputs) {
      return null;
    }

    try {
      // Get fresh measurement values from cache
      const measurementValues = (window as any).measurementValues || {};
      const stableInputValues = (window as any).stableInputValues || {};
      
      let formula = question.calculationFormula;
      const inputIds = Array.isArray(question.calculationInputs) 
        ? question.calculationInputs 
        : question.calculationInputs.split(',').map((id: string) => id.trim());
      
      console.log(`🧮 Calculating ${question.id} with formula: ${formula}`);
      console.log('📊 Available values:', { measurementValues, stableInputValues });
      
      for (const inputId of inputIds) {
        let value = measurementValues[inputId] || stableInputValues[inputId];
        
        // Try parsing as number if it's a string
        if (typeof value === 'string') {
          value = parseFloat(value);
        }
        
        console.log(`  ${inputId} = ${value}`);
        
        if (value !== undefined && value !== null && !isNaN(value)) {
          formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
        } else {
          console.log(`❌ Missing or invalid value for ${inputId}`);
          return null;
        }
      }
      
      console.log(`🔄 Final formula: ${formula}`);
      
      try {
        const result = Function(`"use strict"; return (${formula})`)();
        const roundedResult = Math.round(result);
        console.log(`✅ Result: ${roundedResult}`);
        return roundedResult;
      } catch (evalError) {
        console.error('❌ Formula evaluation error:', evalError);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Calculation error:', error);
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {measurementQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-600" />
              {t.measurementData}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {measurementQuestions.map((question, index) => (
                <div key={question.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-semibold rounded-full shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-lg font-medium text-gray-800 leading-relaxed">
                      {language === 'de' ? question.titleDe : question.title}
                    </p>
                    {question.unit && (
                      <p className="text-base text-gray-500 mt-1">
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
                      className="text-center font-mono border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                      min={question.minValue}
                      max={question.maxValue}
                      onValueChange={(value) => {
                        // Update measurement values immediately
                        MeasurementCache.setValue(question.id, value);
                        onChange(question.id, parseFloat(value) || 0);
                        
                        // Trigger measurement change event for calculated fields
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('measurement-change'));
                        }, 100);
                      }}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Find next focusable element
                          const focusableElements = document.querySelectorAll(
                            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                          );
                          const currentIndex = Array.from(focusableElements).indexOf(e.currentTarget);
                          const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
                          if (nextElement) {
                            nextElement.focus();
                            if (nextElement.tagName === 'INPUT') {
                              (nextElement as HTMLInputElement).select();
                            }
                          }
                        }
                      }}
                      initialValue={(() => {
                        const cachedValue = (window as any).measurementValues?.[question.id] || 
                                          (window as any).stableInputValues?.[question.id];
                        const savedFormData = JSON.parse(localStorage.getItem('otis-protocol-form-data') || '{"answers":{}}');
                        const savedValue = savedFormData.answers?.[question.id];
                        return cachedValue || savedValue || '';
                      })()}
                    />
                    {question.unit && (
                      <span className="text-sm text-gray-500 w-8">{question.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                {t.calculatedValuesValidated}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {calculatedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              {t.calculatedValues}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculatedQuestions.map((question, index) => {
                const calculatedValue = calculateValue(question);
                const isOutOfBounds = calculatedValue !== null && question.minValue !== undefined && question.maxValue !== undefined &&
                  (calculatedValue < question.minValue || calculatedValue > question.maxValue);
                
                // Auto-save calculated value
                if (calculatedValue !== null) {
                  onChange(question.id, calculatedValue);
                }

                return (
                  <div key={question.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 font-semibold rounded-full shrink-0">
                      {measurementQuestions.length + index + 1}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-lg font-medium text-gray-800 leading-relaxed">
                        {language === 'de' ? question.titleDe : question.title}
                      </p>
                      <p className="text-base text-gray-500 mt-1">
                        {question.unit}
                        {isOutOfBounds && (
                          <span className="ml-2 text-red-500 font-medium">
                            ⚠️ {t.outOfRange}
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
                      {isOutOfBounds && onAddError && (
                        <div className="ml-2 text-center">
                          <button
                            onClick={(e) => {
                              e.preventDefault(); 
                              e.stopPropagation();
                              
                              const currentErrors = JSON.parse(localStorage.getItem('protocol-errors') || '[]');
                              
                              const newError = {
                                id: `boundary-${question.id}-${Date.now()}`,
                                title: language === 'de' 
                                  ? `Berechneter Wert außerhalb der Grenzen: ${question.titleDe || question.title}`
                                  : `Határértéken kívüli számított érték: ${question.title}`,
                                description: language === 'de'
                                  ? `Der berechnete Wert ${calculatedValue} ${question.unit} liegt außerhalb der zulässigen Grenzen (${question.minValue}-${question.maxValue} ${question.unit}).`
                                  : `A számított érték ${calculatedValue} ${question.unit} kívül esik a megengedett határokon (${question.minValue}-${question.maxValue} ${question.unit}).`,
                                severity: 'critical' as const
                              };
                              currentErrors.push(newError);
                              localStorage.setItem('protocol-errors', JSON.stringify(currentErrors));
                              
                              // Dispatch custom event to notify ErrorList component
                              window.dispatchEvent(new CustomEvent('protocol-error-added'));
                              
                              const toast = document.createElement('div');
                              toast.textContent = language === 'de' 
                                ? 'Fehler zur Fehlerliste hinzugefügt!'
                                : 'Hiba hozzáadva a hibalistához!';
                              toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:500;';
                              document.body.appendChild(toast);
                              setTimeout(() => document.body.removeChild(toast), 2000);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors block"
                          >
                            <AlertTriangle className="h-6 w-6" />
                          </button>
                          <p className="text-xs text-red-600 font-medium mt-1">
                            {t.errorRecordingRequired}
                          </p>
                        </div>
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

export const clearAllCalculatedValues = () => {
  const calculatedQuestionIds = Object.keys(MeasurementCache.getAllValues()).filter(id => 
    id.includes('calculation') || id.includes('calculated')
  );
  calculatedQuestionIds.forEach(id => MeasurementCache.clearValue(id));
};

// Export function to get all calculated values for external use
export const getAllCalculatedValues = (): Record<string, any> => {
  return (window as any).calculatedValues || {};
};