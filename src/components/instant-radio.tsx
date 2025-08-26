import { memo, useCallback } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface InstantRadioProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; id: string }>;
  className?: string;
}

const InstantRadioComponent = ({ 
  value, 
  onChange, 
  options,
  className = "space-y-3"
}: InstantRadioProps) => {
  
  // Immediate value change without any debouncing
  const handleValueChange = useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  // Prevent any event propagation that might cause page navigation
  const handleItemClick = useCallback((e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(optionValue);
  }, [onChange]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className={className} onClick={handleContainerClick}>
      <RadioGroup
        value={value}
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
            />
            <Label 
              htmlFor={option.id} 
              className="cursor-pointer select-none"
              onClick={(e) => handleItemClick(e, option.value)}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export const InstantRadio = memo(InstantRadioComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.options === nextProps.options &&
    prevProps.className === nextProps.className
  );
});