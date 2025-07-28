import { useState, useEffect } from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Question } from '@shared/schema';

interface MeasurementQuestionProps {
  question: Question;
  value: number | undefined;
  onChange: (value: number) => void;
}

export function MeasurementQuestion({ question, value, onChange }: MeasurementQuestionProps) {
  const { language } = useLanguageContext();
  const [localValue, setLocalValue] = useState<string>(value?.toString() || '');

  useEffect(() => {
    setLocalValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);
    
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const getTitle = () => {
    if (language === 'de' && question.titleDe) return question.titleDe;
    if (language === 'hu' && question.titleHu) return question.titleHu;
    return question.title;
  };

  const isOutOfRange = value !== undefined && (
    (question.minValue !== undefined && value < question.minValue) ||
    (question.maxValue !== undefined && value > question.maxValue)
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
      
      <Input
        id={question.id}
        type="number"
        value={localValue}
        onChange={handleChange}
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