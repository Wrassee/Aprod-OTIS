import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface UltraStableRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; id: string }>;
  className?: string;
}

const UltraStableRadioComponent = ({ 
  value, 
  onChange, 
  options,
  className = "space-y-3"
}: UltraStableRadioProps) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isChanging, setIsChanging] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastValueRef = useRef(value);

  // Only update local value when external value changes and we're not currently changing
  useEffect(() => {
    if (!isChanging && value !== localValue && value !== lastValueRef.current) {
      setLocalValue(value || '');
      lastValueRef.current = value;
    }
  }, [value, isChanging, localValue]);

  const handleValueChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    setIsChanging(true);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Longer delay to prevent UI flickering and page switching
    timeoutRef.current = setTimeout(() => {
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        onChange(newValue);
      }
      setIsChanging(false);
    }, 800); // Longer delay to prevent flickering
  }, [onChange]);

  // Prevent event bubbling and prevent focus/blur issues
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const handleLabelClick = useCallback((e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    handleValueChange(optionValue);
  }, [handleValueChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={className} onClick={handleContainerClick}>
      <RadioGroup
        value={localValue}
        onValueChange={handleValueChange}
        className="space-y-3"
      >
        {options.map((option) => (
          <div 
            key={option.value} 
            className="flex items-center space-x-3" 
            onClick={handleContainerClick}
          >
            <RadioGroupItem 
              value={option.value} 
              id={option.id}
              onClick={(e) => {
                e.stopPropagation();
                handleValueChange(option.value);
              }}
            />
            <Label 
              htmlFor={option.id} 
              className="cursor-pointer select-none"
              onClick={(e) => handleLabelClick(e, option.value)}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export const UltraStableRadio = memo(UltraStableRadioComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.options === nextProps.options &&
    prevProps.className === nextProps.className
  );
});