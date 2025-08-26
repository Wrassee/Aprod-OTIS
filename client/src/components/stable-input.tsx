import React, { useEffect, useRef } from 'react';

interface StableInputProps {
  questionId: string;
  type?: 'text' | 'number' | 'email';
  initialValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;  
  step?: string | number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
  pattern?: string;
  inputMode?: string;
}

export function StableInput({ 
  questionId, 
  type = 'text', 
  placeholder, 
  initialValue, 
  onChange, 
  className, 
  min, 
  max, 
  step, 
  onKeyDown,
  maxLength,
  pattern,
  inputMode
}: StableInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (inputRef.current && !mountedRef.current) {
      // Load saved value from cache if available
      const cachedValue = questionId && questionId.startsWith('m') 
        ? ((window as any).measurementValues?.[questionId] || (window as any).stableInputValues?.[questionId])
        : (window as any).stableInputValues?.[questionId];
      
      const valueToSet = cachedValue || initialValue || '';
      
      // Set the value in the input field
      if (valueToSet) {
        inputRef.current.value = valueToSet.toString();
        
        // Also store it back in the cache to ensure consistency
        if (!(window as any).stableInputValues) {
          (window as any).stableInputValues = {};
        }
        (window as any).stableInputValues[questionId] = valueToSet.toString();
        
        if (questionId && questionId.startsWith('m')) {
          if (!(window as any).measurementValues) {
            (window as any).measurementValues = {};
          }
          (window as any).measurementValues[questionId] = valueToSet.toString();
        }
      }
      
      mountedRef.current = true;
    }
  }, [initialValue, questionId]);

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
    
    // Call onChange if provided
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      onChange={handleChange}
      onKeyDown={(e) => {
        // For number inputs, filter character input
        if (type === 'number' || (questionId && questionId.startsWith('m'))) {
          const allowedKeys = [
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Clear', 'Copy', 'Paste'
          ];
          
          if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
            // Allow numbers, decimal point, and minus sign
            if (!/[0-9.-]/.test(e.key)) {
              e.preventDefault();
            }
          }
        }
        
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      placeholder={placeholder}
      className={className || 'w-full px-3 py-2 border border-gray-300 rounded-md'}
      min={min}
      max={max}
      step={step}
      maxLength={maxLength}
      pattern={pattern}
      inputMode={inputMode}
    />
  );
}

// Global helper function for compatibility
export function getAllStableInputValues(): Record<string, string> {
  const stableInputValues = (window as any).stableInputValues || {};
  const measurementValues = (window as any).measurementValues || {};
  
  // Combine both caches
  return { ...stableInputValues, ...measurementValues };
}