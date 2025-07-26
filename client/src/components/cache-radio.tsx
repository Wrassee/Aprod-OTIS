import { memo, useState, useEffect } from 'react';

interface CacheRadioProps {
  questionId: string;
  initialValue: string;
  options: Array<{ value: string; label: string }>;
}

// Global cache for radio values to prevent parent updates
const radioCache = new Map<string, string>();

export const CacheRadio = memo(({ questionId, initialValue, options }: CacheRadioProps) => {
  const [localValue, setLocalValue] = useState(() => {
    // Get from cache or use initial value
    return radioCache.get(questionId) || initialValue;
  });

  // Sync with initial value only if cache is empty
  useEffect(() => {
    if (!radioCache.has(questionId) && initialValue) {
      setLocalValue(initialValue);
      radioCache.set(questionId, initialValue);
    }
  }, [questionId, initialValue]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    radioCache.set(questionId, newValue);
    
    // Dispatch custom event for save button to pick up
    window.dispatchEvent(new CustomEvent('radio-change', {
      detail: { questionId, value: newValue }
    }));
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
            >
              {option.label}
            </label>
          </div>
        );
      })}
    </div>
  );
});

CacheRadio.displayName = 'CacheRadio';

// Export function to get all cached values
export const getAllCachedValues = (): Record<string, string> => {
  const result: Record<string, string> = {};
  radioCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};