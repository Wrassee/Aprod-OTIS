import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Ruler, AlertTriangle } from 'lucide-react';
import { MeasurementQuestion, getAllMeasurementValues } from './measurement-question';
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
  
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  // No initialization needed - using global cache

  const calculateValue = (question: Question): number | null => {
    if (!question.calculationFormula || !question.calculationInputs) {
      return null;
    }

    try {
      const measurementValues = getAllMeasurementValues();
      let formula = question.calculationFormula;
      
      const inputIds = Array.isArray(question.calculationInputs) 
        ? question.calculationInputs 
        : question.calculationInputs.split(',').map((id: string) => id.trim());
      
      for (const inputId of inputIds) {
        const value = measurementValues[inputId];
        
        if (value !== undefined && value !== null && !isNaN(value)) {
          formula = formula.replace(new RegExp(`\\b${inputId}\\b`, 'g'), value.toString());
        } else {
          return null;
        }
      }
      
      try {
        const result = Function(`"use strict"; return (${formula})`)();
        const roundedResult = typeof result === 'number' && !isNaN(result) ? Math.round(result) : null;
        return roundedResult;
      } catch (evalError) {
        return null;
      }
      
    } catch (error) {
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
                    <MeasurementQuestion
                      question={question}
                      value={typeof values?.[question.id] === 'number' ? values[question.id] : undefined}
                      onChange={(value) => onChange(question.id, value)}
                    />
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
  // Clear calculated values from global cache
  if ((window as any).calculatedValues) {
    (window as any).calculatedValues = {};
  }
};

// Export function to get all calculated values for external use
export const getAllCalculatedValues = (): Record<string, any> => {
  return (window as any).calculatedValues || {};
};