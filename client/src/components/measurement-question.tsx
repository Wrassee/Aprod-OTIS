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
    // Store in BOTH caches for compatibility
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[question.id] = newValue;
    
    // ALSO store in stableInputValues since StableInput uses that cache
    if (!(window as any).stableInputValues) {
      (window as any).stableInputValues = {};
    }
    (window as any).stableInputValues[question.id] = newValue;
    
    // Trigger measurement change event for calculations
    window.dispatchEvent(new CustomEvent('measurement-change'));
    
    // Only call onChange for valid numbers without triggering React re-renders
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      // Use timeout to avoid immediate re-render
      setTimeout(() => onChange(numValue), 0);
    }
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
    <div className="space-y-2">
      <Label htmlFor={question.id} className="flex items-center gap-2">
        {getTitle()}
        {question.unit && (
          <span className="text-sm text-gray-500">({question.unit})</span>
        )}
        {question.required && (
          <span className="text-red-500">*</span>
        )}
      </Label>
      
      <StableInput
        questionId={question.id}
        type="number"
        initialValue={value?.toString() || ''}
        onValueChange={handleValueChange}
        placeholder={question.placeholder || (language === 'de' ? 'Wert eingeben' : 'Érték megadása')}
        className={`w-full ${isOutOfRange ? 'border-red-500' : ''}`}
        min={question.minValue}
        max={question.maxValue}
        step="0.1"
      />
      
      {question.minValue !== undefined && question.maxValue !== undefined && (
        <p className="text-xs text-gray-500">
          {language === 'de' ? 'Bereich' : 'Tartomány'}: {question.minValue} - {question.maxValue} {question.unit || ''}
        </p>
      )}
      
      {isOutOfRange && (
        <p className="text-xs text-red-500">
          {language === 'de' 
            ? 'Wert außerhalb des zulässigen Bereichs' 
            : 'Az érték a megengedett tartományon kívül esik'
          }
        </p>
      )}
    </div>
  );
}