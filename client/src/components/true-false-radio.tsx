import { memo, useState, useEffect } from 'react';
import { useLanguageContext } from './language-provider';

interface TrueFalseRadioProps {
  questionId: string;
  questionTitle: string;
  value: string;
  onChange: (value: string) => void;
}

export const TrueFalseRadio = memo(({ questionId, questionTitle, value, onChange }: TrueFalseRadioProps) => {
  const { t } = useLanguageContext();
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="grid grid-cols-[1fr_100px_100px] gap-4 items-center py-2 border-b border-gray-100 last:border-b-0">
      {/* Question Title - Left Column */}
      <div className="text-sm font-medium text-gray-800 pr-4">
        {questionTitle}
      </div>
      
      {/* True Option - Middle Column */}
      <div className="flex justify-center">
        <input
          type="radio"
          id={`${questionId}-true`}
          name={questionId}
          value="true"
          checked={localValue === 'true'}
          onChange={(e) => {
            if (e.target.checked) {
              handleChange('true');
            }
          }}
          className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
        />
      </div>
      
      {/* False Option - Right Column */}
      <div className="flex justify-center">
        <input
          type="radio"
          id={`${questionId}-false`}
          name={questionId}
          value="false"
          checked={localValue === 'false'}
          onChange={(e) => {
            if (e.target.checked) {
              handleChange('false');
            }
          }}
          className="w-5 h-5 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2"
        />
      </div>
    </div>
  );
});

TrueFalseRadio.displayName = 'TrueFalseRadio';