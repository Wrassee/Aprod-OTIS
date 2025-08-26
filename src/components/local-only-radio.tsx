import { memo, useState, useEffect } from 'react';

interface LocalOnlyRadioProps {
  questionId: string;
  initialValue: string;
  onLocalChange: (questionId: string, value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export const LocalOnlyRadio = memo(({ questionId, initialValue, onLocalChange, options }: LocalOnlyRadioProps) => {
  const [localValue, setLocalValue] = useState(initialValue);

  // Sync with initial value changes
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    // Store in local cache immediately but don't trigger parent re-render
    onLocalChange(questionId, newValue);
  };

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const inputId = `${questionId}-${option.value}`;
        return (
          <div key={option.value} className="flex items-center space-x-3">
            <input
              type="radio"
              id={inputId}
              name={questionId}
              value={option.value}
              checked={localValue === option.value}
              onChange={(e) => {
                e.stopPropagation();
                if (e.target.checked) {
                  handleChange(option.value);
                }
              }}
              className="w-5 h-5 text-otis-blue bg-gray-100 border-gray-300 focus:ring-otis-blue focus:ring-2"
            />
            <label 
              htmlFor={inputId}
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleChange(option.value);
              }}
            >
              {option.label}
            </label>
          </div>
        );
      })}
    </div>
  );
});

LocalOnlyRadio.displayName = 'LocalOnlyRadio';