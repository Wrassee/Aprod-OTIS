import { useEffect, useRef } from 'react';

interface StableInputProps {
  questionId: string;
  type?: 'text' | 'number' | 'email';
  initialValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;  
  step?: string | number;
}

export function StableInput({ questionId, type = 'text', placeholder, initialValue, onValueChange, className, min, max, step }: StableInputProps) {
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
    let value = e.target.value;
    
    // STRICT 5 character limit for measurement inputs
    if (questionId && questionId.startsWith('m') && value.length > 5) {
      value = value.slice(0, 5);
      e.target.value = value;
    }
    
    console.log(`Stable input typing: ${questionId} = ${value}`);
    
    // Store in global cache immediately (no React state update!)
    if (!(window as any).stableInputValues) {
      (window as any).stableInputValues = {};
    }
    (window as any).stableInputValues[questionId] = value;
    
    // ALSO store in measurement cache if this is a measurement question
    if (questionId && questionId.startsWith('m')) {
      if (!(window as any).measurementValues) {
        (window as any).measurementValues = {};
      }
      (window as any).measurementValues[questionId] = value;
    }
    
    // Trigger ONLY button-check event for validation - no UI re-render
    window.dispatchEvent(new CustomEvent('button-check'));
    
    // DISABLED: onValueChange callback causes UI flicker and re-renders
    // Values are stored in cache and will be picked up during save/submit
    // if (onValueChange) {
    //   clearTimeout((window as any)[`stable-timeout-${questionId}`]);
    //   (window as any)[`stable-timeout-${questionId}`] = setTimeout(() => {
    //     onValueChange(value);
    //   }, 500); // Debounced callback
    // }
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
      min={min}
      max={max}
      step={step}
      className={`${questionId?.startsWith('m') ? 'w-auto' : 'w-full'} px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-otis-blue focus:border-transparent ${className || ''}`}
      style={{ 
        fontSize: '16px',
        backgroundColor: 'white',
        color: '#000',
        ...(questionId?.startsWith('m') ? { width: '50px', textAlign: 'center' } : {})
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