import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ZeroRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; id: string }>;
  className?: string;
}

// Minimális rádiógomb komponens zéró re-render triggerrel
const ZeroRadioComponent = ({ 
  value, 
  onChange, 
  options,
  className = "space-y-3"
}: ZeroRadioProps) => {
  
  // Egyszerű helyi state
  const [selected, setSelected] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  
  // Sync with prop csak ha tényleg változott
  useEffect(() => {
    if (!isUpdatingRef.current && value !== selected) {
      setSelected(value);
    }
  }, [value, selected]);

  // Minimális change handler
  const handleChange = useCallback((newValue: string) => {
    setSelected(newValue);
    isUpdatingRef.current = true;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Nagyon rövid timeout a batch-elt update-hez
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
      isUpdatingRef.current = false;
    }, 50);
  }, [onChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={className}>
      <RadioGroup
        value={selected}
        onValueChange={handleChange}
        className="space-y-3"
      >
        {options.map((option) => (
          <div 
            key={option.value} 
            className="flex items-center space-x-3" 
          >
            <RadioGroupItem 
              value={option.value} 
              id={option.id}
            />
            <Label 
              htmlFor={option.id} 
              className="cursor-pointer select-none"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export const ZeroRadio = memo(ZeroRadioComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.options.length === nextProps.options.length &&
    prevProps.className === nextProps.className
  );
});