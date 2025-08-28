import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface StableRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; id: string }>;
  className?: string;
}

// Teljesen izolált rádiógomb komponens független state kezeléssel
const StableRadioComponent = ({ 
  value, 
  onChange, 
  options,
  className = "space-y-3"
}: StableRadioProps) => {
  
  // Helyi state hogy elkerüljük a parent re-render triggereket
  const [internalValue, setInternalValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedValueRef = useRef(value);
  
  // Szinkronizáljuk a prop értékkel, de csak ha nem éppen frissítünk
  useEffect(() => {
    if (!isUpdating && value !== internalValue) {
      setInternalValue(value);
      lastReportedValueRef.current = value;
    }
  }, [value, isUpdating, internalValue]);

  const handleSelection = useCallback((newValue: string) => {
    // Azonnal frissítjük a helyi state-et a UI responsiveness érdekében
    setInternalValue(newValue);
    setIsUpdating(true);
    
    // Töröljük a korábbi timeout-ot
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Csak akkor jelentsük a parent-nek, ha tényleg változott az érték
    updateTimeoutRef.current = setTimeout(() => {
      if (newValue !== lastReportedValueRef.current) {
        lastReportedValueRef.current = newValue;
        onChange(newValue);
      }
      setIsUpdating(false);
    }, 200); // Rövid de elegendő késleltetés
  }, [onChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Teljes event elszigetelés
  const handleRadioClick = useCallback((e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    handleSelection(optionValue);
  }, [handleSelection]);

  const handleLabelClick = useCallback((e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    handleSelection(optionValue);
  }, [handleSelection]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      className={`stable-radio-container ${className}`} 
      onClick={handleContainerClick}
    >
      <RadioGroup
        value={internalValue}
        onValueChange={handleSelection}
        className="space-y-3"
      >
        {options.map((option) => (
          <div 
            key={option.value} 
            className="flex items-center space-x-3 stable-radio-item" 
            onClick={handleContainerClick}
          >
            <RadioGroupItem 
              value={option.value} 
              id={option.id}
              onClick={(e) => handleRadioClick(e, option.value)}
              className="stable-radio-input"
            />
            <Label 
              htmlFor={option.id} 
              className="cursor-pointer select-none stable-radio-label"
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

export const StableRadio = memo(StableRadioComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.options === nextProps.options &&
    prevProps.className === nextProps.className
  );
});