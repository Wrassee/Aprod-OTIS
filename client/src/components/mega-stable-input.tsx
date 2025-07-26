import { useState, useEffect, useRef, memo } from 'react';

interface MegaStableInputProps {
  type?: 'text' | 'number';
  placeholder?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  multiline?: boolean;
}

const MegaStableInputComponent = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className,
  style,
  rows = 4,
  multiline = false
}: MegaStableInputProps) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isChangingRef = useRef(false);

  // Only update local value when external value changes and not active
  useEffect(() => {
    const newValue = value?.toString() || '';
    if (!isActive && newValue !== localValue && !isChangingRef.current) {
      setLocalValue(newValue);
    }
  }, [value, isActive, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    isChangingRef.current = true;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Very long debounce to prevent UI flickering
    timeoutRef.current = setTimeout(() => {
      if (type === 'number') {
        const numVal = parseFloat(newValue);
        const finalValue = isNaN(numVal) ? '' : numVal;
        onChange(finalValue);
      } else {
        onChange(newValue);
      }
      isChangingRef.current = false;
    }, 1200); // Extended to 1.2 seconds
  };

  const handleFocus = () => {
    setIsActive(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the focus is moving to another element within our container
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return; // Stay active if focus is still within our component
    }
    
    // Check if clicking within the same question block or UI components
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget) {
      // Don't blur if clicking on buttons, question blocks, or other UI elements
      const isUIElement = relatedTarget.closest('button') || 
                         relatedTarget.closest('[role="radiogroup"]') ||
                         relatedTarget.closest('.question-block') ||
                         relatedTarget.closest('label') ||
                         relatedTarget.classList.contains('question-card');
      
      if (isUIElement) {
        return; // Keep focus state
      }
    }
    
    // Delay deactivation to prevent race conditions
    setTimeout(() => {
      setIsActive(false);
      
      // Clear timeout and immediately sync on blur
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
      
      onChange(finalValue);
      isChangingRef.current = false;
    }, 300); // Longer delay to prevent premature blur
  };

  // Prevent container clicks from bubbling
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const commonProps = {
    placeholder,
    value: localValue,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    className,
    style: { ...style, fontSize: '16px' },
    autoComplete: 'off' as const,
    spellCheck: false,
  };

  return (
    <div ref={containerRef} onClick={handleContainerClick}>
      {multiline ? (
        <textarea
          ref={textareaRef}
          {...commonProps}
          rows={rows}
        />
      ) : (
        <input
          ref={inputRef}
          type={type}
          {...commonProps}
        />
      )}
    </div>
  );
};

export const MegaStableInput = memo(MegaStableInputComponent);