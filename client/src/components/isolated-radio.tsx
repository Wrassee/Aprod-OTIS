import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface IsolatedRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; id: string }>;
  className?: string;
}

// Teljes izolációval működő rádiógomb komponens
const IsolatedRadioComponent = ({ 
  value, 
  onChange, 
  options,
  className = "space-y-3"
}: IsolatedRadioProps) => {
  
  // Teljesen helyi state management
  const [localValue, setLocalValue] = useState(value);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentValueRef = useRef(value);
  
  // Szinkronizáljuk a value proppal, de csak ha nem dolgozunk
  useEffect(() => {
    if (!isProcessing && value !== localValue) {
      setLocalValue(value);
      lastSentValueRef.current = value;
    }
  }, [value, isProcessing, localValue]);

  // Teljesen izolált value változás kezelés
  const handleRadioSelection = useCallback((newValue: string) => {
    // Azonnal frissítjük a helyi értéket
    setLocalValue(newValue);
    setIsProcessing(true);
    
    // Töröljük az előző timeout-ot
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    
    // Késleltetett parent értesítés - csak ha tényleg változott
    processingTimeoutRef.current = setTimeout(() => {
      if (newValue !== lastSentValueRef.current) {
        lastSentValueRef.current = newValue;
        // Wrapper function hogy megelőzzük a direct callback hívást
        requestAnimationFrame(() => {
          onChange(newValue);
        });
      }
      setIsProcessing(false);
    }, 150);
  }, [onChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Minden esemény teljes blokkolása
  const preventNavigation = useCallback((e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.stopImmediatePropagation();
  }, []);

  const handleContainerInteraction = useCallback((e: React.MouseEvent) => {
    preventNavigation(e);
  }, [preventNavigation]);

  const handleItemClick = useCallback((e: React.MouseEvent, optionValue: string) => {
    preventNavigation(e);
    handleRadioSelection(optionValue);
  }, [preventNavigation, handleRadioSelection]);

  const handleLabelClick = useCallback((e: React.MouseEvent, optionValue: string) => {
    preventNavigation(e);
    handleRadioSelection(optionValue);
  }, [preventNavigation, handleRadioSelection]);

  return (
    <div 
      className={`isolated-radio-wrapper ${className}`} 
      onClick={handleContainerInteraction}
      onMouseDown={handleContainerInteraction}
      onMouseUp={handleContainerInteraction}
    >
      <RadioGroup
        value={localValue}
        onValueChange={handleRadioSelection}
        className="space-y-3"
      >
        {options.map((option) => (
          <div 
            key={option.value} 
            className="flex items-center space-x-3 isolated-radio-row" 
            onClick={handleContainerInteraction}
            onMouseDown={handleContainerInteraction}
          >
            <RadioGroupItem 
              value={option.value} 
              id={option.id}
              onClick={(e) => handleItemClick(e, option.value)}
              onMouseDown={preventNavigation}
              className="isolated-radio-item"
            />
            <Label 
              htmlFor={option.id} 
              className="cursor-pointer select-none isolated-radio-label"
              onClick={(e) => handleLabelClick(e, option.value)}
              onMouseDown={preventNavigation}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export const IsolatedRadio = memo(IsolatedRadioComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    JSON.stringify(prevProps.options) === JSON.stringify(nextProps.options) &&
    prevProps.className === nextProps.className
  );
});