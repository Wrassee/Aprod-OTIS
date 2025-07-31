import React, { useRef, useEffect } from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { Label } from '@/components/ui/label';
import { Question } from '@shared/schema';

interface MeasurementQuestionProps {
  question: Question;
  value: number | undefined;
  onChange: (value: number) => void;
}

// Global helper functions for measurement values
export function getAllMeasurementValues(): Record<string, number> {
  const measurementCached = (window as any).measurementValues || {};
  const result: Record<string, number> = {};
  
  Object.keys(measurementCached).forEach(key => {
    const value = parseFloat(measurementCached[key]);
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleValueChange = (newValue: string) => {
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[question.id] = newValue;
    
    window.dispatchEvent(new CustomEvent('measurement-change'));
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const getTitle = () => {
    if (language === 'de' && question.titleDe) return question.titleDe;
    if (language === 'hu' && question.titleHu) return question.titleHu;
    return question.title;
  };

  const currentValue = (window as any).measurementValues?.[question.id] || value?.toString() || '';
  const isOutOfRange = value !== undefined && !isNaN(value) && (
    (question.minValue !== undefined && value < question.minValue) ||
    (question.maxValue !== undefined && value > question.maxValue)
  );

  useEffect(() => {
    if (inputRef.current && currentValue) {
      inputRef.current.value = currentValue;
    }
  }, [currentValue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-xl font-bold text-gray-900 flex-1 leading-relaxed">
          {getTitle()}
          {question.unit && (
            <span className="ml-2 text-gray-700 font-medium">({question.unit})</span>
          )}
          {question.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </Label>
        
        <input
          ref={inputRef}
          key={`measurement-q-${question.id}`}
          type="text"
          defaultValue={currentValue}
          onChange={(e) => {
            const input = e.target as HTMLInputElement;
            let val = input.value;
            
            // STRICT 5 character limit FIRST
            if (val.length > 5) {
              val = val.slice(0, 5);
              input.value = val;
            }
            
            console.log(`Measurement input ${question.id}: "${val}" (length: ${val.length})`);
            
            // Debounced value change to prevent UI flicker
            clearTimeout((window as any)[`measurement-q-timeout-${question.id}`]);
            (window as any)[`measurement-q-timeout-${question.id}`] = setTimeout(() => {
              handleValueChange(val);
            }, 300);
          }}
          placeholder="0"
          className={`text-center border-2 rounded-lg py-1 px-1 ${isOutOfRange ? 'border-red-500' : 'border-gray-200'}`}
          maxLength={5}
          style={{
            width: "50px",
            fontSize: "12px",
            fontFamily: "monospace"
          }}
        />
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