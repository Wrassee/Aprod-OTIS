import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguageContext } from '@/components/language-provider';
import { Question, ProtocolError } from '@shared/schema';
import { MeasurementQuestion, getAllMeasurementValues } from './measurement-question-working';
import { MeasurementService, MeasurementCalculationResult } from '../services/measurement-service';

interface MeasurementBlockProps {
  questions: Question[];
  values: Record<string, any>;
  onChange: (questionId: string, value: number) => void;
  onAddError?: (error: ProtocolError) => void;
}

export function MeasurementBlock({ questions, values, onChange, onAddError }: MeasurementBlockProps) {
  const { language, t } = useLanguageContext();
  const [calculatedValues, setCalculatedValues] = useState<Record<string, MeasurementCalculationResult>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const measurementQuestions = questions.filter(q => q.type === 'measurement');
  const calculatedQuestions = questions.filter(q => q.type === 'calculated');

  // Recalculate when measurements change
  useEffect(() => {
    const handleMeasurementChange = () => {
      console.log('🔄 Measurement change detected, recalculating...');
      
      const measurementValues = getAllMeasurementValues();
      console.log('📊 Current measurement values:', measurementValues);
      
      const newCalculatedValues = MeasurementService.calculateAll(questions, measurementValues);
      console.log('🧮 New calculated values:', newCalculatedValues);
      
      setCalculatedValues(newCalculatedValues);
      
      // Update the form with calculated values
      Object.values(newCalculatedValues).forEach(result => {
        if (result.isValid && result.value !== null) {
          console.log(`✅ Setting calculated value ${result.questionId} = ${result.value}`);
          onChange(result.questionId, result.value);
        }
      });
      
      // Generate protocol errors for out-of-range values
      if (onAddError) {
        const protocolErrors = MeasurementService.generateProtocolErrors(newCalculatedValues, questions, language);
        protocolErrors.forEach(error => onAddError(error));
      }
    };
    
    // Initial calculation
    handleMeasurementChange();
    
    // Listen for measurement changes
    window.addEventListener('measurement-change', handleMeasurementChange);
    
    return () => {
      window.removeEventListener('measurement-change', handleMeasurementChange);
    };
  }, [questions, onChange, onAddError, language, refreshTrigger]);

  // Force refresh when questions change
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [questions.length]);

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
    
    const isOutOfRange = result?.isValid && !result.isWithinLimits;

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
            }: {result.error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Measurement Questions */}
      {measurementQuestions.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {language === 'de' ? 'Messungen' : 'Mérések'}
          </h2>
          
          <div className="space-y-6">
            {measurementQuestions.map(question => (
              <MeasurementQuestion
                key={question.id}
                question={question}
                value={typeof values[question.id] === 'number' ? values[question.id] : undefined}
                onChange={(value) => onChange(question.id, value)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Calculated Questions */}
      {calculatedQuestions.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {language === 'de' ? 'Berechnete Werte' : 'Számított értékek'}
          </h2>
          
          <div className="space-y-6">
            {calculatedQuestions.map(question => renderCalculatedValue(question))}
          </div>
        </section>
      )}

      {/* Debug Button (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <h3 className="font-bold mb-2">Debug Info</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const measurementValues = getAllMeasurementValues();
              console.log('🔍 Debug - All measurement values:', measurementValues);
              console.log('🔍 Debug - Calculated values:', calculatedValues);
              console.log('🔍 Debug - Questions with formulas:', questions.filter(q => q.calculationFormula));
            }}
          >
            Log Debug Info
          </Button>
        </div>
      )}
    </div>
  );
}