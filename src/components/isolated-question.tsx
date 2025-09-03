import { memo, useCallback } from 'react';
import { Question, AnswerValue } from '../../shared/schema.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CacheRadio } from './cache-radio';
import { TrueFalseRadio } from './true-false-radio';
import { MeasurementQuestion } from './measurement-question';
import { Camera, Image } from 'lucide-react';
import { useLanguageContext } from './language-provider';
import { StableInput } from './stable-input';

interface IsolatedQuestionProps {
  question: Question;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onImageUpload?: (files: File[]) => void;
  images?: string[];
}

const IsolatedQuestionComponent = memo(({
  question,
  value,
  onChange,
  onImageUpload,
  images = []
}: IsolatedQuestionProps) => {
  const { t } = useLanguageContext();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onImageUpload) {
      onImageUpload(files);
    }
  }, [onImageUpload]);

  const renderInput = useCallback(() => {
    switch (question.type) {
      // JAVÍTÁS ITT: A 'yes_no_na' típust 'radio'-ra cseréltem,
      // hogy megfeleljen a szerver által küldött adatnak.
      case 'radio':
        const radioOptions = [
          { value: 'yes', label: t.yes, id: `${question.id}-yes` },
          { value: 'no', label: t.no, id: `${question.id}-no` },
          { value: 'na', label: t.notApplicable, id: `${question.id}-na` }
        ];
        
        return (
          <CacheRadio
            questionId={question.id}
            initialValue={value?.toString() || ''}
            options={radioOptions}
            onChange={onChange}
          />
        );
        
      case 'true_false':
        return (
          <TrueFalseRadio
            questionId={question.id}
            questionTitle={question.title}
            value={value?.toString() || ''}
            onChange={(newValue) => onChange(newValue as AnswerValue)}
          />
        );
        
      case 'number':
        return (
          <StableInput
            questionId={question.id}
            type="number"
            initialValue={value?.toString() || ''}
            // DISABLED onValueChange to prevent UI flicker
            // onValueChange={(newValue) => onChange(parseFloat(newValue) || 0)}
            placeholder={question.placeholder || '0'}
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // Find next focusable element
                const focusableElements = document.querySelectorAll(
                  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                const currentIndex = Array.from(focusableElements).indexOf(e.currentTarget);
                const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
                if (nextElement) {
                  nextElement.focus();
                  if (nextElement.tagName === 'INPUT') {
                    (nextElement as HTMLInputElement).select();
                  }
                }
              }
            }}
          />
        );
        
      case 'measurement':
        return (
          <MeasurementQuestion
            question={question}
            value={typeof value === 'number' ? value : undefined}
            onChange={(newValue) => onChange(newValue)}
          />
        );
        
      case 'calculated':
        // For calculated questions, we need access to all input values
        // This will be handled in the questionnaire component
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Számított mező - értéket automatikusan meghatározza
            </p>
          </div>
        );
        
      case 'text':
      default:
        return (
          <StableInput
            questionId={question.id}
            type="text"
            initialValue={value?.toString() || ''}
            // DISABLED onValueChange to prevent UI flicker
            // onValueChange={(newValue) => onChange(newValue)}
            placeholder={question.placeholder || t.enterText || 'Szöveg megadása'}
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // Find next focusable element
                const focusableElements = document.querySelectorAll(
                  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                const currentIndex = Array.from(focusableElements).indexOf(e.currentTarget);
                const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
                if (nextElement) {
                  nextElement.focus();
                  if (nextElement.tagName === 'INPUT') {
                    (nextElement as HTMLInputElement).select();
                  }
                }
              }
            }}
          />
        );
    }
  }, [question, value, onChange, t]);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              {question.title}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            
            {renderInput()}
          </div>
          
          {/* Image upload section */}
          {onImageUpload && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {t.attachPhotos || 'Fotók csatolása'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`file-${question.id}`)?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {t.selectFiles || 'Fájlok kiválasztása'}
                </Button>
              </div>
              
              <input
                id={`file-${question.id}`}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <div className="absolute top-1 right-1 bg-white rounded-full p-1">
                        <Image className="h-3 w-3 text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export const IsolatedQuestion = memo(IsolatedQuestionComponent);
IsolatedQuestion.displayName = 'IsolatedQuestion';