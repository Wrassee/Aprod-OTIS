import { memo, useCallback } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SimpleRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; id: string }>;
  className?: string;
}

// Egy teljesen egyszerű rádiógomb komponens semmilyen fancy logic nélkül
const SimpleRadioComponent = ({ 
  value, 
  onChange, 
  options,
  className = "space-y-3"
}: SimpleRadioProps) => {
  
  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  return (
    <div className={className}>
      <RadioGroup
        value={value}
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

export const SimpleRadio = memo(SimpleRadioComponent);