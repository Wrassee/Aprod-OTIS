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
}

const UltraStableInputComponent = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className,
  style,
  rows = 4,
  multiline = false
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
    const newValue = e.target.value;
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
    setIsFocused(false);
    // Immediate sync on blur
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    let finalValue: string | number;
    if (type === 'number') {
      const numVal = parseFloat(localValue);
      finalValue = isNaN(numVal) ? '' : numVal;
    } else {
      finalValue = localValue;
    }
    
    lastValueRef.current = finalValue;
    onChange(finalValue);
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
      type={type}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      style={{ ...style, fontSize: '16px' }}
      autoComplete="off"
      spellCheck={false}
    />
  );
};

export const UltraStableInput = memo(UltraStableInputComponent);