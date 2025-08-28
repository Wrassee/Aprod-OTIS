import { memo, useState, useRef, useCallback } from 'react';

interface FinalRadioProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export const FinalRadio = memo(({ questionId, value, onChange, options }: FinalRadioProps) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const handleChange = useCallback((newValue: string) => {
    // Update local state immediately for UI responsiveness
    setLocalValue(newValue);
    
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Delay the parent onChange to prevent component remounting
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 1000); // 1 second delay to prevent navigation
  }, [onChange]);

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
                e.preventDefault();
                if (e.target.checked) {
                  handleChange(option.value);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
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

FinalRadio.displayName = 'FinalRadio';