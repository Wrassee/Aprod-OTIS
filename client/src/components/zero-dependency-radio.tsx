import { memo, useRef, useEffect } from 'react';

interface ZeroDependencyRadioProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export const ZeroDependencyRadio = memo(({ questionId, value, onChange, options }: ZeroDependencyRadioProps) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const handleChange = (newValue: string) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Delay the onChange to prevent rapid re-renders
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 500); // 500ms delay
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
              defaultChecked={value === option.value}
              onChange={(e) => {
                if (e.target.checked) {
                  handleChange(option.value);
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

ZeroDependencyRadio.displayName = 'ZeroDependencyRadio';