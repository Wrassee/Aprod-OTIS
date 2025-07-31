import { useEffect, useRef } from 'react';
import { useLanguageContext } from '@/components/language-provider';
import { QuestionConfig } from '@shared/schema';

interface PureMeasurementProps {
  question: QuestionConfig;
  value?: number | string;
  onValueChange: (value: string) => void;
}

export function PureMeasurement({ question, value, onValueChange }: PureMeasurementProps) {
  const { language } = useLanguageContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const getTitle = () => {
    if (language === 'de' && question.germanTitle) {
      return question.germanTitle;
    }
    return question.title;
  };

  const handleValueChange = (val: string) => {
    console.log(`Pure measurement input ${question.id}: ${val} (length: ${val.length})`);
    
    // Store in measurement cache
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[question.id] = val;
    
    onValueChange(val);
  };

  // EXTREME DOM FORCE - Remove all classes and apply pure inline styles
  useEffect(() => {
    if (inputRef.current) {
      const input = inputRef.current;
      
      // Clear all classes first
      input.className = '';
      input.removeAttribute('class');
      
      // Apply raw inline styles with maximum priority
      const styles = `
        width: 600px !important;
        height: 120px !important;
        font-size: 36px !important;
        padding: 30px !important;
        font-weight: 900 !important;
        text-align: center !important;
        border: 6px solid #10b981 !important;
        border-radius: 24px !important;
        outline: none !important;
        background-color: #f0fdf4 !important;
        box-sizing: border-box !important;
        font-family: Arial, sans-serif !important;
        color: #065f46 !important;
        display: block !important;
        margin: 0 auto !important;
        min-width: 600px !important;
        max-width: 600px !important;
      `;
      
      input.setAttribute('style', styles);
      
      console.log(`PURE MEASUREMENT STYLED ${question.id} - Applied direct style attribute`);
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
    <div style={{
      margin: '50px 0',
      padding: '30px',
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      textAlign: 'center'
    }}>
      <div style={{
        marginBottom: '30px'
      }}>
        <label style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#065f46',
          display: 'block',
          marginBottom: '20px',
          lineHeight: '1.4'
        }}>
          {getTitle()}
          {question.unit && (
            <span style={{
              marginLeft: '12px',
              color: '#059669',
              fontWeight: '700'
            }}>
              ({question.unit})
            </span>
          )}
          {question.required && (
            <span style={{
              color: '#dc2626',
              marginLeft: '8px'
            }}>
              *
            </span>
          )}
        </label>
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <input
          ref={inputRef}
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
            
            // Re-apply border color based on validation
            setTimeout(() => {
              if (inputRef.current) {
                const inp = inputRef.current;
                const borderColor = isOutOfRange ? '#dc2626' : '#10b981';
                const currentStyle = inp.getAttribute('style') || '';
                const newStyle = currentStyle.replace(/border:\s*[^;]+;/, `border: 6px solid ${borderColor} !important;`);
                inp.setAttribute('style', newStyle);
              }
            }, 0);
          }}
          placeholder="0"
          maxLength={5}
        />
      </div>
      
      {question.minValue !== undefined && question.maxValue !== undefined && (
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '12px'
        }}>
          {language === 'de' ? 'Bereich' : 'Tartomány'}: {question.minValue} - {question.maxValue} {question.unit || ''}
        </p>
      )}
      
      {isOutOfRange && (
        <p style={{
          fontSize: '16px',
          color: '#dc2626',
          textAlign: 'center',
          fontWeight: '700',
          marginTop: '8px'
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