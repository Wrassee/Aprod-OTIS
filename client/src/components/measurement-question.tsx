import React from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { Label } from '@/components/ui/label';
import { Question } from '@shared/schema';
import { StableInput } from './stable-input';

interface MeasurementQuestionProps {
  question: Question;
  value: number | undefined;
  onChange: (value: number) => void;
}

// Global helper functions for measurement values
export function getAllMeasurementValues(): Record<string, number> {
  // Check both caches for measurement values
  const measurementCached = (window as any).measurementValues || {};
  const stableInputCached = (window as any).stableInputValues || {};
  const combined = { ...measurementCached, ...stableInputCached };
  
  const result: Record<string, number> = {};
  
  Object.keys(combined).forEach(key => {
    const value = parseFloat(combined[key]);
    if (!isNaN(value)) {
      result[key] = value;
    }
  });
  
  return result;
}

export function clearAllMeasurementValues() {
  (window as any).measurementValues = {};
}

export function MeasurementQuestion({ question, value, onChange }: MeasurementQuestionProps) {
  const { language } = useLanguageContext();

  const handleValueChange = (newValue: string) => {
    // Store values PERSISTENTLY in dual cache system
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[question.id] = newValue;
    
    // ALSO store in stableInputValues for StableInput compatibility
    if (!(window as any).stableInputValues) {
      (window as any).stableInputValues = {};
    }
    (window as any).stableInputValues[question.id] = newValue;
    
    // Mark this value as protected from clearing
    if (!(window as any).protectedMeasurements) {
      (window as any).protectedMeasurements = new Set();
    }
    (window as any).protectedMeasurements.add(question.id);
    
    // Trigger measurement change event for calculations
    window.dispatchEvent(new CustomEvent('measurement-change'));
    
    // DON'T call onChange immediately to avoid React state conflicts
    // Values will be picked up from cache during form submission
  };

  const getTitle = () => {
    if (language === 'de' && question.titleDe) return question.titleDe;
    if (language === 'hu' && question.titleHu) return question.titleHu;
    return question.title;
  };

  // Check range from cached value to avoid re-renders
  const getCachedValue = () => {
    const cached = (window as any).measurementValues?.[question.id];
    return cached ? parseFloat(cached) : value;
  };
  
  const currentValue = getCachedValue();
  const isOutOfRange = currentValue !== undefined && !isNaN(currentValue) && (
    (question.minValue !== undefined && currentValue < question.minValue) ||
    (question.maxValue !== undefined && currentValue > question.maxValue)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label htmlFor={question.id} className="text-xl font-bold text-gray-900 flex-1 leading-relaxed">
          {getTitle()}
          {question.unit && (
            <span className="ml-2 text-gray-700 font-medium">({question.unit})</span>
          )}
          {question.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </Label>
        
        <div className="flex-shrink-0" style={{width: "200px"}}>
          <input
            id={question.id}
            type="text"
            defaultValue={value?.toString() || ''}
            onInput={(e) => {
              const input = e.target as HTMLInputElement;
              let val = input.value;
              
              // Only allow numbers and decimal point
              val = val.replace(/[^0-9.]/g, '');
              
              // Limit to 5 characters maximum - STRICT ENFORCEMENT
              if (val.length > 5) {
                val = val.slice(0, 5);
                input.value = val;
              }
              
              // Clear old cache to prevent interference
              if ((window as any).stableInputValues) {
                delete (window as any).stableInputValues[question.id];
              }
              
              // Store in measurement cache
              if (!(window as any).measurementValues) {
                (window as any).measurementValues = {};
              }
              (window as any).measurementValues[question.id] = val;
              
              console.log(`Measurement input ${question.id}: ${val} (length: ${val.length})`);
              
              handleValueChange(val);
            }}
            placeholder="0"
            className={`text-center text-lg px-3 border-2 rounded-lg py-3 ${isOutOfRange ? 'border-red-500' : 'border-gray-200'}`}
            maxLength={5}
            style={{width: "200px", fontSize: "16px", minWidth: "200px", maxWidth: "200px"}}
          />
        </div>
      </div>
      
      {question.minValue !== undefined && question.maxValue !== undefined && (
        <p className="text-xs text-gray-500 ml-1">
          {language === 'de' ? 'Bereich' : 'Tartomány'}: {question.minValue} - {question.maxValue} {question.unit || ''}
        </p>
      )}
      
      {isOutOfRange && (
        <p className="text-xs text-red-500 ml-1">
          {language === 'de' 
            ? 'Wert außerhalb des zulässigen Bereichs' 
            : 'Az érték a megengedett tartományon kívül esik'
          }
        </p>
      )}
    </div>
  );
}