import { useEffect, useRef } from 'react';

interface StableInputProps {
  questionId: string;
  type: 'text' | 'number';
  placeholder?: string;
  initialValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function StableInput({ questionId, type, placeholder, initialValue, onValueChange, className }: StableInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (inputRef.current && !mountedRef.current) {
      // Set initial value only once on mount
      if (initialValue) {
        inputRef.current.value = initialValue;
      }
      mountedRef.current = true;
    }
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log(`Stable input typing: ${questionId} = ${value}`);
    
    // Store in global cache immediately (no React state update!)
    if (!(window as any).stableInputValues) {
      (window as any).stableInputValues = {};
    }
    (window as any).stableInputValues[questionId] = value;
    
    // Trigger custom event for cache update
    window.dispatchEvent(new CustomEvent('input-change'));
    
    // DON'T call onValueChange during typing - it causes page refresh!
    // Only save to localStorage directly during validation and sync
    // clearTimeout((window as any)[`stable-timeout-${questionId}`]);
    // (window as any)[`stable-timeout-${questionId}`] = setTimeout(() => {
    //   if (onValueChange) {
    //     onValueChange(value);
    //   }
    // }, 500);
  };

  return (
    <input
      ref={inputRef}
      type={type}
      onChange={handleChange}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-otis-blue focus:border-transparent"
      style={{ 
        fontSize: '16px',
        backgroundColor: 'white',
        color: '#000'
      }}
    />
  );
}

// Helper function to get all stable input values
export function getAllStableInputValues(): Record<string, string> {
  return (window as any).stableInputValues || {};
}

// Helper function to clear all stable input values
export function clearAllStableInputValues() {
  (window as any).stableInputValues = {};
}