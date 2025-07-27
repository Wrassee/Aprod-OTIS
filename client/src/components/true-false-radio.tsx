import { memo, useRef, useCallback } from 'react';

interface TrueFalseRadioProps {
  questionId: string;
  questionTitle: string;
  value: string;
  onChange: (value: string) => void;
}

// Global cache for true/false values to prevent re-renders
const trueFalseCache = new Map<string, string>();

export const TrueFalseRadio = memo(({ questionId, questionTitle, value, onChange }: TrueFalseRadioProps) => {
  const trueRadioRef = useRef<HTMLInputElement>(null);
  const falseRadioRef = useRef<HTMLInputElement>(null);

  // Initialize cache if empty
  if (!trueFalseCache.has(questionId) && value) {
    trueFalseCache.set(questionId, value);
  }

  const currentValue = trueFalseCache.get(questionId) || value || '';

  const handleChange = useCallback((newValue: string, event: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent any default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Update cache immediately
    trueFalseCache.set(questionId, newValue);
    
    // Update DOM directly to prevent re-renders
    if (trueRadioRef.current && falseRadioRef.current) {
      trueRadioRef.current.checked = newValue === 'true';
      falseRadioRef.current.checked = newValue === 'false';
    }
    
    // Notify parent component asynchronously to prevent re-render cycles
    setTimeout(() => {
      onChange(newValue);
      
      // Dispatch custom event to trigger validation check
      window.dispatchEvent(new CustomEvent('radio-change', { 
        detail: { questionId, value: newValue }
      }));
    }, 0);
  }, [questionId, onChange]);

  return (
    <div className="grid grid-cols-[1fr_100px_100px] gap-4 items-center py-2 border-b border-gray-100 last:border-b-0">
      {/* Question Title - Left Column */}
      <div className="text-sm font-medium text-gray-800 pr-4">
        {questionTitle}
      </div>
      
      {/* True Option - Middle Column */}
      <div className="flex justify-center">
        <input
          ref={trueRadioRef}
          type="radio"
          id={`${questionId}-true`}
          name={questionId}
          value="true"
          defaultChecked={currentValue === 'true'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!trueRadioRef.current?.checked) {
              handleChange('true', e as any);
            }
          }}
          onChange={() => {}} // Empty onChange to prevent React warnings
          className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
        />
      </div>
      
      {/* False Option - Right Column */}
      <div className="flex justify-center">
        <input
          ref={falseRadioRef}
          type="radio"
          id={`${questionId}-false`}
          name={questionId}
          value="false"
          defaultChecked={currentValue === 'false'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!falseRadioRef.current?.checked) {
              handleChange('false', e as any);
            }
          }}
          onChange={() => {}} // Empty onChange to prevent React warnings
          className="w-5 h-5 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2"
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