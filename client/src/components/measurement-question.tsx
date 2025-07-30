import { memo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { Question } from '@shared/schema';

interface MeasurementQuestionProps {
  question: Question;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;
  isValid?: boolean;
}

export const MeasurementQuestion = memo(function MeasurementQuestion({
  question,
  value,
  onChange,
  error,
  isValid = true
}: MeasurementQuestionProps) {
  const { language, t } = useLanguage();
  
  const title = language === 'de' && question.titleDe ? question.titleDe : question.title;
  const unit = question.unit || 'mm';
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const inputValue = e.target.value;
    // console.log('MeasurementQuestion handleChange:', question.id, 'input:', inputValue);
    
    if (inputValue === '') {
      // console.log('Empty input, calling onChange with undefined');
      onChange(undefined);
    } else {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        // console.log('Valid number, calling onChange with:', numValue);
        onChange(numValue);
      } else {
        // console.log('Invalid number, ignoring input');
      }
    }
  }, [question.id, onChange]);

  const getValidationIcon = () => {
    if (value === undefined) return null;
    
    if (error || !isValid) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getRangeDisplay = () => {
    if (question.minValue !== undefined && question.maxValue !== undefined) {
      return `${question.minValue} - ${question.maxValue} ${unit}`;
    } else if (question.minValue !== undefined) {
      return `≥ ${question.minValue} ${unit}`;
    } else if (question.maxValue !== undefined) {
      return `≤ ${question.maxValue} ${unit}`;
    }
    return null;
  };

  return (
    <Card className={`border-l-4 ${isValid && !error ? 'border-l-blue-500' : 'border-l-red-500'}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Question Title */}
          <div className="flex items-start justify-between">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-5">
              {title}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {getValidationIcon()}
          </div>

          {/* Range Display */}
          {getRangeDisplay() && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {language === 'hu' ? 'Határérték' : 'Grenzwert'}: {getRangeDisplay()}
              </Badge>
            </div>
          )}

          {/* Input Field - Using native input to avoid re-render issues */}
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              defaultValue={value !== undefined ? value.toString() : ''}
              onChange={handleChange}
              placeholder={question.placeholder || (language === 'hu' ? `Mérés ${unit}-ben` : `Messung in ${unit}`)}
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-12 ${error || !isValid ? 'border-red-500' : 'border-input bg-background'}`}
              autoComplete="off"
              onFocus={(e) => {
                // Select text on focus for better UX
                setTimeout(() => e.target.select(), 0);
              }}
              onKeyDown={(e) => {
                // Allow numbers, decimal point, backspace, delete, tab, escape, enter, arrow keys
                if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {unit}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Validation Info */}
          {!error && value !== undefined && !isValid && (
            <div className="text-sm text-amber-600 dark:text-amber-400">
              {language === 'hu' 
                ? 'Az érték kívül esik a megengedett tartományon'
                : 'Der Wert liegt außerhalb des zulässigen Bereichs'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});