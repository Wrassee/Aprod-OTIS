import { memo, useState, useEffect, useRef, useCallback } from 'react';

interface CacheInputProps {
  questionId: string;
  initialValue: string;
  type?: 'text' | 'number';
  placeholder?: string;
}

// Global cache for input values to prevent parent updates
const inputCache = new Map<string, string>();

export const CacheInput = memo(({ questionId, initialValue, type = 'text', placeholder }: CacheInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use ref for stable value access
  const currentValueRef = useRef(inputCache.get(questionId) || initialValue || '');
  
  // Initialize cache if needed
  useEffect(() => {
    if (!inputCache.has(questionId) && initialValue) {
      inputCache.set(questionId, initialValue);
      currentValueRef.current = initialValue;
      if (inputRef.current) {
        inputRef.current.value = initialValue;
      }
    }
  }, [questionId, initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`Input typing: ${questionId} = ${newValue}`);
    
    // Update cache and ref immediately
    inputCache.set(questionId, newValue);
    currentValueRef.current = newValue;
    
    // Dispatch event for validation (debounced)
    clearTimeout((window as any)[`input-timeout-${questionId}`]);
    (window as any)[`input-timeout-${questionId}`] = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('input-change', {
        detail: { questionId, value: newValue }
      }));
    }, 300);
  }, [questionId]);

  return (
    <input
      ref={inputRef}
      type={type}
      defaultValue={currentValueRef.current}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-otis-blue focus:border-transparent"
      style={{ fontSize: '16px' }} // Prevent zoom on mobile
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