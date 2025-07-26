import { memo, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface CacheInputProps {
  questionId: string;
  initialValue: string;
  type?: 'text' | 'number';
  placeholder?: string;
}

// Global cache for input values to prevent parent updates
const inputCache = new Map<string, string>();

export const CacheInput = memo(({ questionId, initialValue, type = 'text', placeholder }: CacheInputProps) => {
  const [localValue, setLocalValue] = useState(() => {
    // Get from cache or use initial value
    return inputCache.get(questionId) || initialValue;
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with initial value only if cache is empty
  useEffect(() => {
    if (!inputCache.has(questionId) && initialValue) {
      setLocalValue(initialValue);
      inputCache.set(questionId, initialValue);
    }
  }, [questionId, initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`Input change event: ${questionId} = ${newValue}`);
    
    setLocalValue(newValue);
    inputCache.set(questionId, newValue);
    
    // Dispatch custom event for validation to pick up
    window.dispatchEvent(new CustomEvent('input-change', {
      detail: { questionId, value: newValue }
    }));
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-otis-blue focus:border-transparent"
    />
  );
});

CacheInput.displayName = 'CacheInput';

// Export function to get all cached input values
export const getAllCachedInputValues = (): Record<string, string> => {
  const result: Record<string, string> = {};
  inputCache.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};