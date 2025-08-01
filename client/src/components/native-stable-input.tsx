import { useEffect, useRef, memo } from 'react';

interface NativeStableInputProps {
  rowId: string;
  field: string;
  initialValue: string | number;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  onValueChange: (rowId: string, field: string, value: string) => void;
}

// Global storage for native inputs - completely independent of React
const nativeStorage = new Map<string, string>();
const nativeTimeouts = new Map<string, NodeJS.Timeout>();
const nativeInputs = new Map<string, HTMLInputElement>();

export const NativeStableInput = memo(({ 
  rowId,
  field,
  initialValue, 
  type = 'text', 
  placeholder, 
  className,
  onValueChange 
}: NativeStableInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = `${rowId}_${field}`;
  
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Register this input globally
    nativeInputs.set(id, input);
    
    // Set initial value if not already stored
    const storedValue = nativeStorage.get(id);
    const valueToUse = storedValue !== undefined ? storedValue : (initialValue?.toString() || '');
    
    // Use direct DOM manipulation - bypass React completely
    input.value = valueToUse;
    nativeStorage.set(id, valueToUse);

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newValue = target.value;
      
      // Store immediately in native storage
      nativeStorage.set(id, newValue);
      
      // Clear existing timeout
      if (nativeTimeouts.has(id)) {
        clearTimeout(nativeTimeouts.get(id)!);
      }
      
      // Debounced callback to React
      const timeout = setTimeout(() => {
        onValueChange(rowId, field, newValue);
        nativeTimeouts.delete(id);
      }, 500); // Shorter timeout for better responsiveness
      
      nativeTimeouts.set(id, timeout);
    };

    const handleFocus = () => {
      // Mark input as focused in native storage
      nativeStorage.set(`${id}_focused`, 'true');
    };

    const handleBlur = () => {
      // Remove focus marker
      nativeStorage.delete(`${id}_focused`);
      
      // Immediate sync on blur
      if (nativeTimeouts.has(id)) {
        clearTimeout(nativeTimeouts.get(id)!);
        nativeTimeouts.delete(id);
      }
      
      const currentValue = input.value;
      nativeStorage.set(id, currentValue);
      onValueChange(rowId, field, currentValue);
    };

    // Add native event listeners
    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    
    // Cleanup function
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      
      // Clean up timeouts
      if (nativeTimeouts.has(id)) {
        clearTimeout(nativeTimeouts.get(id)!);
        nativeTimeouts.delete(id);
      }
      
      nativeInputs.delete(id);
    };
  }, [rowId, field, onValueChange]); // Only depend on stable props

  // Update value only if not focused and value actually changed
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    
    const isFocused = nativeStorage.has(`${id}_focused`);
    const currentValue = nativeStorage.get(id) || '';
    const newValue = initialValue?.toString() || '';
    
    // Only update if not focused and value is different
    if (!isFocused && newValue !== currentValue) {
      input.value = newValue;
      nativeStorage.set(id, newValue);
    }
  }, [initialValue, id]);

  return (
    <input
      ref={inputRef}
      type={type}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
      style={{ fontSize: '16px' }}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if essential props changed
  return (
    prevProps.rowId === nextProps.rowId &&
    prevProps.field === nextProps.field &&
    prevProps.type === nextProps.type &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.className === nextProps.className &&
    prevProps.onValueChange === nextProps.onValueChange
  );
});

NativeStableInput.displayName = 'NativeStableInput';

// Utility function to get all native input values
export const getNativeInputValues = (): Record<string, string> => {
  const values: Record<string, string> = {};
  nativeStorage.forEach((value, key) => {
    if (!key.endsWith('_focused')) {
      values[key] = value;
    }
  });
  return values;
};

// Utility function to clear all native input storage
export const clearNativeInputStorage = (): void => {
  nativeStorage.clear();
  nativeTimeouts.forEach(timeout => clearTimeout(timeout));
  nativeTimeouts.clear();
};