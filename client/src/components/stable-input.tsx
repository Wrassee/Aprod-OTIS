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
    
    // MEASUREMENT VALIDATION - Only allow numbers and decimal point for measurement questions
    if (questionId && questionId.startsWith('m')) {
      // Remove all non-numeric characters except decimal point and minus sign
      value = value.replace(/[^0-9.-]/g, '');
      
      // Ensure only one decimal point
      const decimalCount = (value.match(/\./g) || []).length;
      if (decimalCount > 1) {
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) + value.substring(firstDecimalIndex + 1).replace(/\./g, '');
      }
      
      // Ensure only one minus sign at the beginning
      if (value.includes('-')) {
        const minusCount = (value.match(/-/g) || []).length;
        if (minusCount > 1 || value.indexOf('-') !== 0) {
          value = value.replace(/-/g, '');
          if (value.charAt(0) !== '-' && e.target.value.charAt(0) === '-') {
            value = '-' + value;
          }
        }
      }
      
      // STRICT 5 character limit for measurement inputs
      if (value.length > 5) {
        value = value.slice(0, 5);
      }
      
      // Update the input field with cleaned value
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
        
        // Additional prevention for measurement fields - block non-numeric keys
        if (questionId && questionId.startsWith('m')) {
          const allowedKeys = [
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End', 'Minus'
          ];
          
          const isNumber = /^[0-9]$/.test(e.key);
          const isDecimal = e.key === '.';
          const isMinus = e.key === '-';
          const isAllowed = allowedKeys.includes(e.key);
          const isCtrlA = e.ctrlKey && e.key === 'a';
          const isCtrlC = e.ctrlKey && e.key === 'c';
          const isCtrlV = e.ctrlKey && e.key === 'v';
          const isCtrlX = e.ctrlKey && e.key === 'x';
          const isCtrlZ = e.ctrlKey && e.key === 'z';
          
          if (!isNumber && !isDecimal && !isMinus && !isAllowed && !isCtrlA && !isCtrlC && !isCtrlV && !isCtrlX && !isCtrlZ) {
            e.preventDefault();
            return false;
          }
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
        ...(questionId?.startsWith('m') ? { width: '70px', textAlign: 'center' } : {})
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