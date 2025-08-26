import { memo, useState, useEffect } from 'react';

interface TrueFalseRadioProps {
  questionId: string;
  questionTitle: string;
  value: string;
  onChange: (value: string) => void;
}

// Global cache for true/false values - exact copy of CacheRadio pattern
const trueFalseCache = new Map<string, string>();

export const TrueFalseRadio = memo(({ questionId, questionTitle, value, onChange }: TrueFalseRadioProps) => {
  const [localValue, setLocalValue] = useState(() => {
    // Get from cache or use initial value
    return trueFalseCache.get(questionId) || value;
  });

  // Sync with initial value only if cache is empty
  useEffect(() => {
    if (!trueFalseCache.has(questionId) && value) {
      setLocalValue(value);
      trueFalseCache.set(questionId, value);
    }
  }, [questionId, value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    trueFalseCache.set(questionId, newValue);
    
    console.log(`True/False changed: ${questionId} = ${newValue}`);
    
    // Dispatch custom event for save button to pick up
    window.dispatchEvent(new CustomEvent('radio-change', {
      detail: { questionId, value: newValue }
    }));
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
            e.stopPropagation();
            if (e.target.checked) {
              handleChange('true');
            }
          }}
          className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2 cursor-pointer"
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
            e.stopPropagation();
            if (e.target.checked) {
              handleChange('false');
            }
          }}
          className="w-5 h-5 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2 cursor-pointer"
        />
      </div>
    </div>
  );
});

TrueFalseRadio.displayName = 'TrueFalseRadio';

// Export function to get all cached true/false values
export const getAllTrueFalseValues = (): Record<string, string> => {
  const result: Record<string, string> = {};
  trueFalseCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};