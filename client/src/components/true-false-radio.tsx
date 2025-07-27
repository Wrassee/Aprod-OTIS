import { memo, useState, useEffect } from 'react';
import { useLanguageContext } from './language-provider';

interface TrueFalseRadioProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  groupSize?: number; // How many true/false pairs in this group
}

export const TrueFalseRadio = memo(({ questionId, value, onChange, groupSize = 1 }: TrueFalseRadioProps) => {
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
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* True Option */}
        <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
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
          <label 
            htmlFor={`${questionId}-true`}
            className="text-sm font-medium text-gray-700 cursor-pointer select-none flex items-center"
          >
            <span className="text-green-600 font-bold mr-2">✓</span>
            Igaz / Wahr
          </label>
        </div>
        
        {/* False Option */}
        <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
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
          <label 
            htmlFor={`${questionId}-false`}
            className="text-sm font-medium text-gray-700 cursor-pointer select-none flex items-center"
          >
            <span className="text-red-600 font-bold mr-2">✗</span>
            Hamis / Falsch
          </label>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        Igaz = "X" az Excel cellában, Hamis = "-" az Excel cellában
      </div>
    </div>
  );
});

TrueFalseRadio.displayName = 'TrueFalseRadio';