import { memo } from 'react';
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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(undefined);
    } else {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

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

          {/* Input Field */}
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              value={value !== undefined ? value.toString() : ''}
              onChange={handleChange}
              placeholder={question.placeholder || (language === 'hu' ? `Mérés ${unit}-ben` : `Messung in ${unit}`)}
              className={`pr-12 ${error || !isValid ? 'border-red-500' : ''}`}
              autoComplete="off"
              onFocus={(e) => {
                // Select text on focus for better UX
                setTimeout(() => e.target.select(), 0);
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