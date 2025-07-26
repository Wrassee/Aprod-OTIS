import { useState, memo } from 'react';
import { Question, AnswerValue, QuestionType } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Camera, Image } from 'lucide-react';
import { useLanguageContext } from './language-provider';
import { UltraStableInput } from './ultra-stable-input';

interface QuestionBlockProps {
  question: Question;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onImageUpload?: (files: File[]) => void;
  images?: string[];
}

const QuestionBlockComponent = ({ 
  question, 
  value, 
  onChange, 
  onImageUpload,
  images = [] 
}: QuestionBlockProps) => {
  const { t } = useLanguageContext();
  const [showImagePreview, setShowImagePreview] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onImageUpload) {
      onImageUpload(files);
      setShowImagePreview(true);
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case 'yes_no_na':
        return (
          <RadioGroup
            value={value?.toString() || ''}
            onValueChange={onChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
              <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">
                {t.yes}
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="no" id={`${question.id}-no`} />
              <Label htmlFor={`${question.id}-no`} className="cursor-pointer">
                {t.no}
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="na" id={`${question.id}-na`} />
              <Label htmlFor={`${question.id}-na`} className="cursor-pointer">
                {t.notApplicable}
              </Label>
            </div>
          </RadioGroup>
        );

      case 'number':
        return (
          <UltraStableInput
            type="number"
            placeholder={question.placeholder || "Enter number"}
            value={value || ''}
            onChange={onChange}
            className="w-full text-lg py-3 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-otis-blue focus:border-otis-blue"
            style={{ fontSize: '16px' }}
          />
        );

      case 'text':
        return (
          <UltraStableInput
            placeholder={question.placeholder || "Enter text"}
            value={value || ''}
            onChange={onChange}
            multiline={true}
            className="w-full resize-none px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-otis-blue focus:border-otis-blue"
            style={{ fontSize: '16px' }}
            rows={4}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {question.title}
          </h3>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-otis-blue"
              onClick={() => document.getElementById(`image-upload-${question.id}`)?.click()}
            >
              <Camera className="h-5 w-5" />
            </Button>
            <input
              id={`image-upload-${question.id}`}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {renderInput()}

        {/* Image Preview */}
        {(showImagePreview || images.length > 0) && (
          <div className="mt-4">
            <div className="flex space-x-2">
              {images.map((image, index) => (
                <div key={index} className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
                </div>
              ))}
              {images.length === 0 && (
                <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Image className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const QuestionBlock = memo(QuestionBlockComponent);
