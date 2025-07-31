import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Ruler, AlertTriangle } from 'lucide-react';
// import { StableInput } from './stable-input'; // DISABLED - using custom input with character limit
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
      severity: 'critical',
      images: []
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
                    <input
                      type="text"
                      placeholder="0"
                      className="text-center font-mono border border-gray-300 rounded-md px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        width: "50px",
                        fontSize: "12px"
                      }}
                      maxLength={5}
                      onInput={(e) => {
                        const input = e.target as HTMLInputElement;
                        let val = input.value;
                        
                        // STRICT 5 character limit FIRST
                        if (val.length > 5) {
                          val = val.slice(0, 5);
                          input.value = val;
                        }
                        
                        // Store in measurement cache
                        if (!(window as any).measurementValues) {
                          (window as any).measurementValues = {};
                        }
                        (window as any).measurementValues[question.id] = val;
                        
                        console.log(`MeasurementBlock input ${question.id}: "${val}" (length: ${val.length})`);
                        
                        // Call onChange for parent component
                        const numValue = parseFloat(val);
                        if (!isNaN(numValue)) {
                          onChange(question.id, numValue);
                        }
                        
                        // Trigger calculation update
                        window.dispatchEvent(new CustomEvent('measurement-change'));
                      }}
                    />
                    {question.unit && (
                      <span className="text-sm text-gray-500 w-8">{question.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Boundary Error Information - No button needed */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                {language === 'de' 
                  ? 'Berechnete Werte werden automatisch validiert. Werte außerhalb der Grenzen werden rot angezeigt.'
                  : 'A számított értékek automatikusan validálva vannak. A határértéken kívüli értékek pirossal jelennek meg.'
                }
              </div>
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
                            ⚠️ Határértéken kívül ({question.minValue}-{question.maxValue} {question.unit})
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
                        <button
                          onClick={async (e) => {
                            e.preventDefault(); 
                            e.stopPropagation();
                            
                            const questionTitle = language === 'de' ? question.titleDe : question.title;
                            const errorTitle = language === 'de' 
                              ? `Berechneter Wert außerhalb der Grenzen: ${questionTitle}`
                              : `Határértéken kívüli számított érték: ${questionTitle}`;
                            
                            const errorDescription = language === 'de'
                              ? `Der berechnete Wert ${calculatedValue} ${question.unit} liegt außerhalb der zulässigen Grenzen (${question.minValue}-${question.maxValue} ${question.unit}). Bitte überprüfen Sie die Eingabewerte.`
                              : `A számított érték ${calculatedValue} ${question.unit} kívül esik a megengedett határokon (${question.minValue}-${question.maxValue} ${question.unit}). Kérjük, ellenőrizze a bemeneti értékeket.`;

                            // BYPASS REACT - Add error directly to localStorage errors list instead of calling onAddError
                            const currentErrors = JSON.parse(localStorage.getItem('protocol-errors') || '[]');
                            const newError = {
                              id: `boundary-${question.id}-${Date.now()}`,
                              title: errorTitle,
                              description: errorDescription,
                              severity: 'critical',
                              images: []
                            };
                            currentErrors.push(newError);
                            localStorage.setItem('protocol-errors', JSON.stringify(currentErrors));
                            
                            console.log('✅ Error saved to localStorage without React render:', newError);
                            
                            // Force error list refresh via custom event
                            window.dispatchEvent(new CustomEvent('protocol-error-added', { 
                              detail: { error: newError } 
                            }));
                            
                            // Show confirmation without triggering React re-render
                            const confirmMsg = language === 'de' 
                              ? 'Fehler zur Fehlerliste hinzugefügt!'
                              : 'Hiba hozzáadva a hibalistához!';
                            
                            // Create a temporary toast instead of alert to avoid blocking
                            const toast = document.createElement('div');
                            toast.textContent = confirmMsg;
                            toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:500;';
                            document.body.appendChild(toast);
                            setTimeout(() => document.body.removeChild(toast), 2000);
                          }}
                          className="ml-2 p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title={language === 'de' ? 'Fehler zur Liste hinzufügen' : 'Hiba hozzáadása a listához'}
                        >
                          <AlertTriangle className="h-6 w-6" />
                        </button>
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