import { useState, useEffect, useRef, memo } from 'react';

interface UltraStableInputProps {
  type?: 'text' | 'number';
  placeholder?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  multiline?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const UltraStableInputComponent = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className,
  style,
  rows = 4,
  multiline = false,
  onKeyDown
}: UltraStableInputProps) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastValueRef = useRef(value);

  // Only update local value if external value genuinely changed and we're not focused
  useEffect(() => {
    const newValue = value?.toString() || '';
    if (!isFocused && newValue !== localValue && value !== lastValueRef.current) {
      setLocalValue(newValue);
      lastValueRef.current = value;
    }
  }, [value, isFocused, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // For number inputs, filter out invalid characters immediately
    if (type === 'number') {
      newValue = newValue.replace(/[^0-9.,\-]/g, '');
    }
    
    setLocalValue(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the onChange call - longer delay to prevent UI flicker
    timeoutRef.current = setTimeout(() => {
      if (type === 'number') {
        const numVal = parseFloat(newValue);
        const finalValue = isNaN(numVal) ? '' : numVal;
        lastValueRef.current = finalValue;
        onChange(finalValue);
      } else {
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    }, 800); // Extended to 800ms
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay setting focus to false to prevent race conditions
    setTimeout(() => {
      setIsFocused(false);
      
      // Only sync if value actually changed
      let finalValue: string | number;
      if (type === 'number') {
        const filteredValue = localValue.replace(/[^0-9.,\-]/g, '');
        const numVal = parseFloat(filteredValue);
        finalValue = isNaN(numVal) ? '' : numVal;
        setLocalValue(filteredValue); // Update displayed value to filtered version
      } else {
        finalValue = localValue;
      }
      
      // Only trigger onChange if value is different
      if (finalValue !== lastValueRef.current) {
        lastValueRef.current = finalValue;
        onChange(finalValue);
      }
    }, 100); // Small delay to prevent conflicts
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // For number inputs, prevent typing invalid characters
    if (type === 'number') {
      const allowedKeys = [
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Clear', 'Copy', 'Paste'
      ];
      const allowedChars = '0123456789.,\-';
      
      if (!allowedKeys.includes(e.key) && !allowedChars.includes(e.key)) {
        e.preventDefault();
        return;
      }
    }
    
    // Call parent onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        style={{ ...style, fontSize: '16px' }}
        autoComplete="off"
        spellCheck={false}
        rows={rows}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={type === 'number' ? 'numeric' : 'text'}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ ...style, fontSize: '16px' }}
      autoComplete="off"
      spellCheck={false}
    />
  );
};

export const UltraStableInput = memo(UltraStableInputComponent);