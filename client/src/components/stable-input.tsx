import { useState, useEffect, useRef } from 'react';

interface StableInputProps {
  type?: 'text' | 'number';
  placeholder?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  multiline?: boolean;
}

export function StableInput({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className,
  style,
  rows = 4,
  multiline = false
}: StableInputProps) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Update local value when external value changes (but not when focused)
  useEffect(() => {
    const newValue = value?.toString() || '';
    if (!isFocused && newValue !== localValue) {
      setLocalValue(newValue);
    }
  }, [value, isFocused, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the onChange call
    timeoutRef.current = setTimeout(() => {
      if (type === 'number') {
        const numVal = parseFloat(newValue);
        onChange(isNaN(numVal) ? '' : numVal);
      } else {
        onChange(newValue);
      }
    }, 300); // 300ms debounce
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
    if (type === 'number') {
      const numVal = parseFloat(localValue);
      onChange(isNaN(numVal) ? '' : numVal);
    } else {
      onChange(localValue);
    }
  };

  if (multiline) {
    return (
      <textarea
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
        style={style}
        rows={rows}
      />
    );
  }

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      style={style}
    />
  );
}