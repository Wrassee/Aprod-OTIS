import { useRef, useEffect } from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { QuestionConfig } from '@shared/schema';

interface WideMeasurementInputProps {
  question: QuestionConfig;
  value?: number | string;
  onValueChange: (value: string) => void;
}

export function WideMeasurementInput({ question, value, onValueChange }: WideMeasurementInputProps) {
  const { language } = useLanguageContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getTitle = () => {
    if (language === 'de' && question.germanTitle) {
      return question.germanTitle;
    }
    return question.title;
  };

  const handleValueChange = (val: string) => {
    console.log(`Wide measurement input ${question.id}: ${val} (length: ${val.length})`);
    
    // Store in measurement cache
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[question.id] = val;
    
    onValueChange(val);
  };

  // Aggressive styling approach - multiple methods combined
  useEffect(() => {
    if (inputRef.current && containerRef.current) {
      const input = inputRef.current;
      const container = containerRef.current;
      
      // Method 1: Direct style properties
      input.style.width = '500px';
      input.style.minWidth = '500px';
      input.style.maxWidth = '500px';
      input.style.height = '80px';
      input.style.fontSize = '28px';
      input.style.padding = '24px';
      input.style.textAlign = 'center';
      input.style.fontWeight = 'bold';
      input.style.border = '3px solid #059669';
      input.style.borderRadius = '12px';
      input.style.outline = 'none';
      input.style.backgroundColor = '#f0fdf4';
      input.style.display = 'block';
      input.style.boxSizing = 'border-box';
      
      // Method 2: CSS Text
      input.style.cssText = `
        width: 500px !important;
        min-width: 500px !important;
        max-width: 500px !important;
        height: 80px !important;
        font-size: 28px !important;
        padding: 24px !important;
        text-align: center !important;
        font-weight: bold !important;
        border: 3px solid #059669 !important;
        border-radius: 12px !important;
        outline: none !important;
        background-color: #f0fdf4 !important;
        display: block !important;
        box-sizing: border-box !important;
      `;
      
      // Method 3: Container constraint
      container.style.width = '100%';
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'center';
      container.style.minHeight = '120px';
      
      console.log(`WIDE INPUT STYLED ${question.id} - Applied multiple styling methods`);
      console.log(`Computed width: ${window.getComputedStyle(input).width}`);
      console.log(`Actual width: ${input.offsetWidth}px`);
    }
  }, [question.id]);

  // Range validation
  const getCachedValue = () => {
    const cached = (window as any).measurementValues?.[question.id];
    return cached ? parseFloat(cached) : value;
  };
  
  const currentValue = getCachedValue();
  const isOutOfRange = currentValue !== undefined && !isNaN(currentValue) && (
    (question.minValue !== undefined && currentValue < question.minValue) ||
    (question.maxValue !== undefined && currentValue > question.maxValue)
  );

  return (
    <div style={{ 
      margin: '32px 0', 
      padding: '24px',
      backgroundColor: '#fafafa',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      {/* Title */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <label style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: '#374151', 
          display: 'block',
          lineHeight: '1.4'
        }}>
          {getTitle()}
          {question.unit && (
            <span style={{ marginLeft: '8px', color: '#6b7280', fontWeight: '500' }}>
              ({question.unit})
            </span>
          )}
          {question.required && (
            <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
          )}
        </label>
      </div>
      
      {/* Input Container - Explicitly sized */}
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          defaultValue={value?.toString() || ''}
          onInput={(e) => {
            const input = e.target as HTMLInputElement;
            let val = input.value;
            
            // Only allow numbers and decimal point
            val = val.replace(/[^0-9.]/g, '');
            
            // Limit to 9 characters maximum
            if (val.length > 9) {
              val = val.slice(0, 9);
              input.value = val;
            }
            
            handleValueChange(val);
          }}
          placeholder="0"
          maxLength={9}
          // Inline styles as fallback
          style={{
            width: '500px',
            minWidth: '500px',
            height: '80px',
            fontSize: '28px',
            padding: '24px',
            textAlign: 'center',
            fontWeight: 'bold',
            border: isOutOfRange ? '3px solid #ef4444' : '3px solid #059669',
            borderRadius: '12px',
            outline: 'none',
            backgroundColor: '#f0fdf4',
            display: 'block',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#065f46'
          }}
        />
      </div>
      
      {/* Range info */}
      {question.minValue !== undefined && question.maxValue !== undefined && (
        <p style={{ 
          fontSize: '14px', 
          color: '#6b7280', 
          textAlign: 'center',
          marginTop: '8px'
        }}>
          {language === 'de' ? 'Bereich' : 'Tartomány'}: {question.minValue} - {question.maxValue} {question.unit || ''}
        </p>
      )}
      
      {/* Range error */}
      {isOutOfRange && (
        <p style={{ 
          fontSize: '14px', 
          color: '#ef4444', 
          textAlign: 'center',
          fontWeight: '600',
          marginTop: '4px'
        }}>
          {language === 'de' 
            ? 'Wert außerhalb des zulässigen Bereichs' 
            : 'Az érték a megengedett tartományon kívül esik'
          }
        </p>
      )}
    </div>
  );
}

// Export functions for cache management
export function getAllMeasurementValues(): Record<string, string> {
  return (window as any).measurementValues || {};
}