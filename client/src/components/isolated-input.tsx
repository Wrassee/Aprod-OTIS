import { useState, useEffect, useRef, memo } from 'react';

interface IsolatedInputProps {
  rowId: string;
  field: string;
  initialValue: string | number;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  onValueChange: (rowId: string, field: string, value: string) => void;
}

// Global storage for isolated input values
const inputStorage = new Map<string, string>();
const inputTimeouts = new Map<string, NodeJS.Timeout>();

export const IsolatedInput = memo(({ 
  rowId,
  field,
  initialValue, 
  type = 'text', 
  placeholder, 
  className,
  onValueChange 
}: IsolatedInputProps) => {
  const id = `${rowId}_${field}`;
  
  // Use stored value or initial value
  const [localValue, setLocalValue] = useState(() => {
    const stored = inputStorage.get(id);
    return stored !== undefined ? stored : (initialValue?.toString() || '');
  });
  
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSyncedValue = useRef(localValue);

  // Only sync external changes when not focused and value actually changed
  useEffect(() => {
    const newValue = initialValue?.toString() || '';
    if (!isFocused && newValue !== lastSyncedValue.current) {
      setLocalValue(newValue);
      inputStorage.set(id, newValue);
      lastSyncedValue.current = newValue;
    }
  }, [initialValue, isFocused, rowId, field]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    inputStorage.set(id, newValue);
    
    // Clear existing timeout
    if (inputTimeouts.has(id)) {
      clearTimeout(inputTimeouts.get(id)!);
    }
    
    // Debounced update to parent
    const timeout = setTimeout(() => {
      onValueChange(rowId, field, newValue);
      lastSyncedValue.current = newValue;
      inputTimeouts.delete(id);
    }, 800); // Shorter debounce for better responsiveness
    
    inputTimeouts.set(id, timeout);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if we're moving to another element in the same row
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('tr') === inputRef.current?.closest('tr')) {
      // Still in same row, keep some focus state
      setTimeout(() => setIsFocused(false), 100);
    } else {
      setIsFocused(false);
    }
    
    // Immediately sync on blur
    if (inputTimeouts.has(id)) {
      clearTimeout(inputTimeouts.get(id)!);
      inputTimeouts.delete(id);
    }
    
    onValueChange(rowId, field, localValue);
    lastSyncedValue.current = localValue;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inputTimeouts.has(id)) {
        clearTimeout(inputTimeouts.get(id)!);
        inputTimeouts.delete(id);
      }
    };
  }, [rowId, field]);

  return (
    <input
      ref={inputRef}
      type={type}
      value={localValue}
      placeholder={placeholder}
      className={className}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      autoComplete="off"
      style={{ fontSize: '16px' }} // Prevent zoom on mobile
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if key props actually changed
  return (
    prevProps.rowId === nextProps.rowId &&
    prevProps.field === nextProps.field &&
    prevProps.initialValue === nextProps.initialValue &&
    prevProps.type === nextProps.type &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.className === nextProps.className &&
    prevProps.onValueChange === nextProps.onValueChange
  );
});

IsolatedInput.displayName = 'IsolatedInput';