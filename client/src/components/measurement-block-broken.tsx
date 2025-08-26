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
  const [calculatedValues, setCalculatedValues] = useState<Record<string, any>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  // Recalculate when measurements change
  useEffect(() => {
    const handleMeasurementChange = () => {
      console.log('🔄 Measurement change detected, recalculating...');
      
      // Get measurement values from global cache
      const measurementValues = (window as any).measurementValues || {};
      const stableInputValues = (window as any).stableInputValues || {};
      const combinedValues: Record<string, number> = {};
      
      // Combine and convert to numbers
      Object.keys({ ...measurementValues, ...stableInputValues }).forEach(key => {
        const value = measurementValues[key] || stableInputValues[key];
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(numValue)) {
          combinedValues[key] = numValue;
        }
      });
      
      console.log('📊 Combined measurement values:', combinedValues);
      
      // Calculate all calculated questions
      const newCalculatedValues: Record<string, any> = {};
      
      calculatedQuestions.forEach(question => {
        if (question.calculationFormula && question.calculationInputs) {
          try {
            let formula = question.calculationFormula;
            const inputIds = question.calculationInputs.split(',').map(id => id.trim());
            let hasAllInputs = true;
            
            console.log(`🧮 Calculating ${question.id} with formula: ${formula}`);
            console.log(`📋 Required inputs: ${inputIds.join(', ')}`);
            
            // Replace variables with values
            inputIds.forEach(inputId => {
              const value = combinedValues[inputId];
              if (value !== undefined && value !== null && !isNaN(value)) {
                formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
                console.log(`  ${inputId} = ${value} → formula: ${formula}`);
              } else {
                hasAllInputs = false;
                console.log(`  ❌ Missing value for ${inputId}`);
              }
            });
            
            if (hasAllInputs) {
              console.log(`🔢 Evaluating: ${formula}`);
              const result = Function(`"use strict"; return (${formula})`)();
              const roundedResult = Math.round(result);
              console.log(`✅ Result: ${roundedResult}`);
              
              newCalculatedValues[question.id] = {
                value: roundedResult,
                isValid: true,
                formula: question.calculationFormula,
                inputs: inputIds
              };
              
              // Update form value
              onChange(question.id, roundedResult);
            } else {
              console.log(`⏳ Waiting for all inputs for ${question.id}`);
              newCalculatedValues[question.id] = {
                value: null,
                isValid: false,
                error: 'Missing input values'
              };
            }
          } catch (error) {
            console.error(`❌ Calculation error for ${question.id}:`, error);
            newCalculatedValues[question.id] = {
              value: null,
              isValid: false,
              error: error.message
            };
          }
        }
      });
      
      setCalculatedValues(newCalculatedValues);
    };
    
    // Initial calculation
    handleMeasurementChange();
    
    // Listen for measurement changes
    window.addEventListener('measurement-change', handleMeasurementChange);
    
    return () => {
      window.removeEventListener('measurement-change', handleMeasurementChange);
    };
  }, [questions, calculatedQuestions, onChange]);

  const renderCalculatedValue = (question: Question) => {
    const result = calculatedValues[question.id];
    const displayValue = result?.isValid && result.value !== null 
      ? result.value.toString()
      : '-';
    
    const getTitle = () => {
      if (language === 'de' && question.titleDe) return question.titleDe;
      if (language === 'hu' && question.titleHu) return question.titleHu;
      return question.title;
    };
    
    const isOutOfRange = result?.isValid && (
      (question.minValue !== undefined && result.value < question.minValue) ||
      (question.maxValue !== undefined && result.value > question.maxValue)
    );

    return (
      <div key={question.id} className="space-y-2">
        <div className="flex items-center gap-4">
          <label className="text-xl font-bold text-gray-900 flex-1 leading-relaxed">
            {getTitle()}
            {question.unit && (
              <span className="ml-2 text-gray-700 font-medium">({question.unit})</span>
            )}
          </label>
          
          <div 
            className={`flex-shrink-0 w-20 px-3 py-2 text-center font-bold text-lg rounded-lg border-2 ${
              isOutOfRange ? 'border-red-500 bg-red-50 text-red-700' : 'border-green-500 bg-green-50 text-green-700'
            }`}
          >
            {displayValue}
          </div>
        </div>
        
        {question.minValue !== undefined && question.maxValue !== undefined && (
          <p className="text-xs text-gray-500 ml-1">
            {language === 'de' ? 'Bereich' : 'Tartomány'}: {question.minValue} - {question.maxValue} {question.unit || ''}
          </p>
        )}
        
        {isOutOfRange && result?.error && (
          <p className="text-xs text-red-500 ml-1">
            {language === 'de' 
              ? 'Wert außerhalb des zulässigen Bereichs' 
              : 'Az érték a megengedett tartományon kívül esik'
            }
          </p>
        )}
        
        {process.env.NODE_ENV === 'development' && result && (
          <p className="text-xs text-gray-400 ml-1">
            Debug: {result.formula} = {result.value} (Valid: {result.isValid ? 'Yes' : 'No'})
          </p>
        )}
      </div>
    );
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
                const result = calculatedValues[question.id];
                const calculatedValue = result?.isValid && result.value !== null ? result.value : null;
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