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
  const isOutOfRange = currentValue !== undefined && 
                      question.minValue !== undefined && 
                      question.maxValue !== undefined &&
                      (currentValue < question.minValue || currentValue > question.maxValue);

  return (
    <div className="flex items-center justify-between w-full py-3 border-b border-gray-100 last:border-b-0">
      {/* Question Title - Left Column */}
      <div className="flex-1 pr-6">
        <Label className="text-lg font-medium text-gray-800 leading-relaxed block">
          {getTitle()}
        </Label>
        <div className="mt-1 text-base text-gray-500">
          {question.unit && <span>{question.unit}</span>}
          {question.minValue !== undefined && question.maxValue !== undefined && (
            <span className="ml-2 text-sm">
              ({question.minValue} - {question.maxValue} {question.unit})
            </span>
          )}
          {isOutOfRange && (
            <span className="ml-2 text-red-500 font-medium">
              ⚠️ Tartományon kívül
            </span>
          )}
        </div>
      </div>
      
      {/* Input Field - Right Column */}
      <div className="flex-shrink-0">
        <StableInput
          questionId={question.id}
          initialValue={value?.toString() || ''}
          onChange={handleValueChange}
          placeholder="0"
          className={`w-20 text-center font-mono text-lg ${
            isOutOfRange ? 'border-red-500 bg-red-50' : ''
          }`}
          maxLength={5}
          pattern="[0-9]*"
          inputMode="numeric"
        />
      </div>
    </div>
  );
}