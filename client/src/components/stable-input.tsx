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
      // Restore value from cache first
      const cachedValue = (window as any).stableInputValues?.[questionId] ||
                         (window as any).measurementValues?.[questionId] || 
                         initialValue || '';
      
      if (cachedValue) {
        inputRef.current.value = cachedValue;
        console.log(`StableInput restored: ${questionId} = ${cachedValue}`);
      }
      mountedRef.current = true;
    }
  }, [questionId, initialValue]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    
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
    
    // NO EVENTS during typing to prevent UI refresh!
    // window.dispatchEvent(new CustomEvent('input-change'));
  };
  
  const handleBlur = () => {
    // Only call onValueChange when user finishes typing
    const currentValue = (window as any).stableInputValues?.[questionId] || '';
    if (onValueChange && currentValue) {
      console.log(`Stable input blur sync: ${questionId} = ${currentValue}`);
      
      // Use setTimeout to avoid immediate UI updates that cause refresh
      setTimeout(() => {
        onValueChange(currentValue);
        
        // Only trigger events on blur, not during typing
        window.dispatchEvent(new CustomEvent('input-change'));
      }, 50);
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      onInput={handleInput}
      onBlur={handleBlur}
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
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-otis-blue focus:border-transparent ${className || ''}`}
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