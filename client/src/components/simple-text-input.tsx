import React, { useState } from 'react';

interface SimpleTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SimpleTextInput({ 
  value, 
  onChange, 
  placeholder, 
  className,
  style 
}: SimpleTextInputProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  // Update local value when prop changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      style={style}
      autoComplete="off"
    />
  );
}