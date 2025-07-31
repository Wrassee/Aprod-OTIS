import { useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { useLanguageContext } from '@/components/language-provider';
import { QuestionConfig } from '@shared/schema';

interface ForceWidthMeasurementProps {
  question: QuestionConfig;
  value?: number | string;
  onValueChange: (value: string) => void;
}

export function ForceWidthMeasurement({ question, value, onValueChange }: ForceWidthMeasurementProps) {
  const { language } = useLanguageContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const getTitle = () => {
    if (language === 'de' && question.germanTitle) {
      return question.germanTitle;
    }
    return question.title;
  };

  const handleValueChange = (val: string) => {
    console.log(`Force measurement input ${question.id}: ${val} (length: ${val.length})`);
    
    // Store in measurement cache
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[question.id] = val;
    
    onValueChange(val);
  };

  // Force DOM styling after render
  useEffect(() => {
    if (inputRef.current) {
      const input = inputRef.current;
      
      // Force styles using DOM manipulation
      input.style.setProperty('width', '500px', 'important');
      input.style.setProperty('height', '100px', 'important');
      input.style.setProperty('font-size', '32px', 'important');
      input.style.setProperty('padding', '25px', 'important');
      input.style.setProperty('font-weight', '800', 'important');
      input.style.setProperty('text-align', 'center', 'important');
      input.style.setProperty('border', '5px solid #10b981', 'important');
      input.style.setProperty('border-radius', '20px', 'important');
      input.style.setProperty('outline', 'none', 'important');
      input.style.setProperty('background-color', '#ecfdf5', 'important');
      input.style.setProperty('box-sizing', 'border-box', 'important');
      input.style.setProperty('font-family', 'system-ui, -apple-system, sans-serif', 'important');
      input.style.setProperty('color', '#065f46', 'important');
      input.style.setProperty('display', 'block', 'important');
      input.style.setProperty('margin', '0 auto', 'important');
      
      // Override any existing classes
      input.className = '';
      
      console.log(`FORCE STYLED INPUT ${question.id} - Width:`, input.style.width, 'Computed:', window.getComputedStyle(input).width);
    }
  }, [question.id]);

  // Check range from cached value to avoid re-renders
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
    <div style={{ margin: '40px 0', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Label htmlFor={question.id} style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#065f46', 
          display: 'block',
          lineHeight: '1.5',
          marginBottom: '16px'
        }}>
          {getTitle()}
          {question.unit && (
            <span style={{ marginLeft: '8px', color: '#059669', fontWeight: '600' }}>({question.unit})</span>
          )}
          {question.required && (
            <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>
          )}
        </Label>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <input
          ref={inputRef}
          id={question.id}
          type="text"
          defaultValue={value?.toString() || ''}
          onInput={(e) => {
            const input = e.target as HTMLInputElement;
            let val = input.value;
            
            // Only allow numbers and decimal point
            val = val.replace(/[^0-9.]/g, '');
            
            // Limit to 5 characters maximum - STRICT ENFORCEMENT
            if (val.length > 5) {
              val = val.slice(0, 5);
              input.value = val;
            }
            
            // Clear old cache to prevent interference
            if ((window as any).stableInputValues) {
              delete (window as any).stableInputValues[question.id];
            }
            
            handleValueChange(val);
            
            // Re-apply forced styling after input
            setTimeout(() => {
              if (inputRef.current) {
                const inp = inputRef.current;
                inp.style.setProperty('border', isOutOfRange ? '5px solid #dc2626' : '5px solid #10b981', 'important');
              }
            }, 0);
          }}
          placeholder="0"
          maxLength={5}
        />
      </div>
      
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
      
      {isOutOfRange && (
        <p style={{ 
          fontSize: '14px', 
          color: '#dc2626', 
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