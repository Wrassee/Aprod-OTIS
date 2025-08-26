import { memo } from 'react';

interface DirectRadioProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export const DirectRadio = memo(({ questionId, value, onChange, options }: DirectRadioProps) => {
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
              checked={value === option.value}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange(option.value);
                }
              }}
              className="w-5 h-5 text-otis-blue bg-gray-100 border-gray-300 focus:ring-otis-blue focus:ring-2"
            />
            <label 
              htmlFor={inputId}
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
            >
              {option.label}
            </label>
          </div>
        );
      })}
    </div>
  );
});

DirectRadio.displayName = 'DirectRadio';