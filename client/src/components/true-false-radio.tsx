import { memo } from 'react';

interface TrueFalseRadioProps {
  questionId: string;
  questionTitle: string;
  value: string;
  onChange: (value: string) => void;
}

// Global cache for true/false values - same pattern as CacheRadio
const trueFalseCache = new Map<string, string>();

export const TrueFalseRadio = memo(({ questionId, questionTitle, value, onChange }: TrueFalseRadioProps) => {
  // Initialize cache if needed
  if (!trueFalseCache.has(questionId) && value) {
    trueFalseCache.set(questionId, value);
  }

  const currentValue = trueFalseCache.get(questionId) || value || '';

  const handleClick = (newValue: string) => {
    // Update cache immediately
    trueFalseCache.set(questionId, newValue);
    
    // Update DOM directly
    const trueRadio = document.getElementById(`${questionId}-true`) as HTMLInputElement;
    const falseRadio = document.getElementById(`${questionId}-false`) as HTMLInputElement;
    
    if (trueRadio && falseRadio) {
      trueRadio.checked = newValue === 'true';
      falseRadio.checked = newValue === 'false';
    }
    
    // Notify parent
    onChange(newValue);
    
    // Dispatch event for validation
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
          defaultChecked={currentValue === 'true'}
          onClick={() => handleClick('true')}
          onChange={() => {}} // Prevent React warnings
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
          defaultChecked={currentValue === 'false'}
          onClick={() => handleClick('false')}
          onChange={() => {}} // Prevent React warnings
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