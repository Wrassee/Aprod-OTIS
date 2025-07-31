import { Label } from '@/components/ui/label';
import { useLanguageContext } from '@/components/language-provider';
import { QuestionConfig } from '@shared/schema';

interface MeasurementQuestionProps {
  question: QuestionConfig;
  value?: number | string;
  onValueChange: (value: string) => void;
}

export function MeasurementQuestion({ question, value, onValueChange }: MeasurementQuestionProps) {
  const { language } = useLanguageContext();

  const getTitle = () => {
    if (language === 'de' && question.germanTitle) {
      return question.germanTitle;
    }
    return question.title;
  };

  const handleValueChange = (val: string) => {
    console.log(`Measurement input ${question.id}: ${val} (length: ${val.length})`);
    
    // Store in measurement cache
    if (!(window as any).measurementValues) {
      (window as any).measurementValues = {};
    }
    (window as any).measurementValues[question.id] = val;
    
    onValueChange(val);
  };

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
    <div style={{ marginBottom: "32px" }}>
      <table style={{ width: "100%", marginBottom: "16px" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle", paddingRight: "20px" }}>
              <Label htmlFor={question.id} style={{ 
                fontSize: "20px", 
                fontWeight: "bold", 
                color: "#111827", 
                display: "block",
                lineHeight: "1.5"
              }}>
                {getTitle()}
                {question.unit && (
                  <span style={{ marginLeft: "8px", color: "#374151", fontWeight: "500" }}>({question.unit})</span>
                )}
                {question.required && (
                  <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
                )}
              </Label>
            </td>
            <td style={{ width: "400px" }}>
              <input
                id={question.id}
                type="text"
                defaultValue={value?.toString() || ''}
                onInput={(e) => {
                  const input = e.target as HTMLInputElement;
                  let val = input.value;
                  
                  // Only allow numbers and decimal point
                  val = val.replace(/[^0-9.]/g, '');
                  
                  // Limit to 9 characters maximum - EXTENDED LIMIT
                  if (val.length > 9) {
                    val = val.slice(0, 9);
                    input.value = val;
                  }
                  
                  // Clear old cache to prevent interference
                  if ((window as any).stableInputValues) {
                    delete (window as any).stableInputValues[question.id];
                  }
                  
                  handleValueChange(val);
                }}
                placeholder="0"
                maxLength={9}
                style={{
                  width: "400px", 
                  fontSize: "24px", 
                  padding: "20px",
                  height: "80px",
                  fontWeight: "700",
                  textAlign: "center",
                  border: isOutOfRange ? "4px solid #ef4444" : "4px solid #059669",
                  borderRadius: "16px",
                  outline: "none",
                  backgroundColor: "#f9fafb",
                  boxSizing: "border-box",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "#111827"
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
      
      {question.minValue !== undefined && question.maxValue !== undefined && (
        <p style={{ 
          fontSize: "12px", 
          color: "#6b7280", 
          marginTop: "8px", 
          textAlign: "center" 
        }}>
          {language === 'de' ? 'Bereich' : 'Tartomány'}: {question.minValue} - {question.maxValue} {question.unit || ''}
        </p>
      )}
      
      {isOutOfRange && (
        <p style={{ 
          fontSize: "12px", 
          color: "#ef4444", 
          marginTop: "4px", 
          textAlign: "center",
          fontWeight: "500"
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